<template>
  <div class="app-container toc-page">
    <!-- 顶部：书籍信息与操作 -->
    <div class="toc-header">
      <div class="header-left">
        <el-button link @click="goBack">← 返回书库</el-button>
        <h3 class="book-title" :title="bookInfo?.title">
          《{{ bookInfo?.title || '目录整理' }}》
        </h3>
        <el-tag v-if="dirty" type="warning" size="small" effect="light">
          有 {{ changedCount }} 处未保存修改
        </el-tag>
      </div>

      <div class="header-right">
        <el-button @click="goToReader()">阅读</el-button>
        <template v-if="canManage">
          <el-button :disabled="!dirty || saving || organizing" @click="handleReset">
            放弃修改
          </el-button>
          <el-button
            type="success"
            plain
            :loading="organizing"
            :disabled="organizing || saving || loading || draft.length === 0"
            @click="handleOrganize"
          >
            {{ organizing ? 'AI 整理中...' : 'AI 整理目录' }}
          </el-button>
          <el-button
            type="primary"
            :loading="saving"
            :disabled="!dirty || organizing || saving"
            @click="handleSave"
          >
            保存目录
          </el-button>
        </template>
      </div>
    </div>

    <!-- 提示条 -->
    <el-alert
      v-if="!canManage && !loading && bookInfo"
      class="toc-alert"
      type="info"
      :closable="false"
      show-icon
      title="仅书籍所有者或管理员可以调整目录，当前为只读展示。"
    />
    <el-alert
      v-if="organizing"
      class="toc-alert"
      type="info"
      :closable="false"
      show-icon
      title="AI 正在分析目录结构，章节较多时可能需要 1~3 分钟，请勿关闭页面。"
    />
    <el-alert
      v-if="warnings.length > 0"
      class="toc-alert"
      type="warning"
      show-icon
      title="AI 整理提示"
      @close="warnings = []"
    >
      <p v-for="(w, i) in warnings" :key="i" class="warning-line">{{ w }}</p>
    </el-alert>
    <el-alert
      v-if="canManage && aiApplied && dirty"
      class="toc-alert"
      type="success"
      :closable="false"
      show-icon
      title="AI 给出的只是建议，尚未保存。请检查并按需调整层级、禁用状态后点击「保存目录」。"
    />

    <div class="toc-card">
      <!-- 工具栏 -->
      <div class="toc-toolbar">
        <el-input
          v-model.trim="keyword"
          placeholder="搜索章节标题"
          clearable
          style="width: 240px"
        />
        <el-checkbox v-model="onlyDisabled">只看已禁用</el-checkbox>
        <el-checkbox v-model="onlyChanged" :disabled="!dirty">只看已修改</el-checkbox>
        <div class="toc-stats">
          共 <strong>{{ draft.length }}</strong> 章 ·
          已禁用 <strong>{{ disabledCount }}</strong> 章
        </div>
      </div>

      <div class="toc-legend">
        缩进/反缩进调整章节层级（L0 为分卷/篇容器，L1 为主章，L2 及以上为小节）；
        禁用的章节不参与出题与复习，仍可阅读，且不会级联影响子章节。
      </div>

      <!-- 目录列表 -->
      <div v-loading="loading" class="toc-list">
        <el-empty v-if="!loading && rows.length === 0" description="暂无符合条件的章节" />
        <div
          v-for="row in rows"
          :key="row.item.id"
          class="toc-row"
          :class="{
            'is-disabled': row.item.is_disabled === 1,
            'is-changed': canManage && isChanged(row.item)
          }"
        >
          <div class="row-main" :style="{ paddingLeft: row.depth * 24 + 'px' }">
            <el-tag
              size="small"
              :type="row.item.level === 0 ? 'warning' : 'info'"
              effect="plain"
              class="level-tag"
            >
              L{{ row.item.level }}
            </el-tag>
            <span
              class="row-title"
              :title="row.item.title"
              @click="goToReader(row.item.id)"
            >
              {{ row.item.title }}
            </span>
            <span v-if="row.item.word_count" class="row-words">
              {{ row.item.word_count }} 字
            </span>
            <el-tag
              v-if="canManage && isChanged(row.item)"
              size="small"
              type="warning"
              effect="light"
            >
              已修改
            </el-tag>
          </div>

          <div v-if="canManage" class="row-actions">
            <el-button-group>
              <el-button
                size="small"
                title="反缩进（层级 -1）"
                :disabled="row.item.level <= minLevel || busy"
                @click="handleLevel(row.index, -1)"
              >
                ←
              </el-button>
              <el-button
                size="small"
                title="缩进（层级 +1）"
                :disabled="row.item.level >= maxLevel || busy"
                @click="handleLevel(row.index, 1)"
              >
                →
              </el-button>
            </el-button-group>
            <el-switch
              :model-value="row.item.is_disabled === 0"
              :disabled="busy"
              inline-prompt
              active-text="启用"
              inactive-text="禁用"
              @change="val => handleToggleDisabled(row.item, val)"
            />
          </div>
          <el-tag
            v-else-if="row.item.is_disabled === 1"
            size="small"
            type="info"
          >
            已禁用
          </el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import {
  getBooks,
  getBookChapters,
  organizeChaptersPreview,
  saveChapterStructure
} from '@/api/book-quiz';
import store from '@/store';
import {
  MIN_LEVEL,
  MAX_LEVEL,
  treeToDraft,
  changeLevel,
  validateDraft,
  computeDepths,
  applySuggestions,
  toPayload,
  snapshotDraft,
  isItemChanged
} from '../utils/toc-structure';

// 书库列表接口 limit 上限 100；查找单本书时最多翻 20 页，避免极端情况下无限请求
const FIND_PAGE_SIZE = 100;
const FIND_MAX_PAGES = 20;

export default defineComponent({
  name: 'BookQuizToc',
  // 未保存离开页面时二次确认（AI 结果只存在前端内存，离开即丢失）
  beforeRouteLeave() {
    if (!this.dirty) return true;
    return ElMessageBox.confirm('存在未保存的目录修改，离开后将丢失，确定离开吗？', '提示', {
      confirmButtonText: '离开',
      cancelButtonText: '留下',
      type: 'warning'
    })
      .then(() => true)
      .catch(() => false);
  },
  data() {
    return {
      bookId: '',
      bookInfo: null,
      // 当前用户是否为该书所有者（在「我的书库」中能找到即为所有者）
      isOwner: false,

      loading: false,
      organizing: false,
      saving: false,

      // 扁平草稿：所有编辑都直接作用于它，树形只是渲染视图
      draft: [],
      // 已保存状态快照，用于判断“是否修改”
      snapshot: new Map(),
      warnings: [],
      aiApplied: false,

      keyword: '',
      onlyDisabled: false,
      onlyChanged: false,
      minLevel: MIN_LEVEL,
      maxLevel: MAX_LEVEL
    };
  },
  computed: {
    isAdmin() {
      return (store.user().roles || []).includes('admin');
    },
    canManage() {
      return this.isOwner || this.isAdmin;
    },
    busy() {
      return this.organizing || this.saving;
    },
    changedCount() {
      return this.draft.filter(item => isItemChanged(item, this.snapshot)).length;
    },
    dirty() {
      return this.changedCount > 0;
    },
    disabledCount() {
      return this.draft.filter(item => item.is_disabled === 1).length;
    },
    rows() {
      const depths = computeDepths(this.draft);
      const kw = this.keyword.toLowerCase();
      const result = [];
      this.draft.forEach((item, index) => {
        if (kw && !(item.title || '').toLowerCase().includes(kw)) return;
        if (this.onlyDisabled && item.is_disabled !== 1) return;
        if (this.onlyChanged && !isItemChanged(item, this.snapshot)) return;
        result.push({ item, index, depth: depths.get(item.id) || 0 });
      });
      return result;
    }
  },
  created() {
    this.bookId = this.$route.params.bookId;
  },
  mounted() {
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    this.loadBookInfo();
    this.loadChapters();
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  },
  methods: {
    isChanged(item) {
      return isItemChanged(item, this.snapshot);
    },
    handleBeforeUnload(e) {
      if (this.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    },
    goBack() {
      this.$router.push('/book-quiz/list');
    },
    goToReader(chapterId) {
      const query = chapterId ? { chapterId } : undefined;
      this.$router.push({ path: `/book-quiz/read/${this.bookId}`, query });
    },

    /**
     * 查找书籍信息并判断所有权：后端没有单本书详情接口，
     * 先在「我的书库」中翻页查找（找到即为所有者），找不到再查公开书库。
     */
    async loadBookInfo() {
      try {
        for (const scope of ['mine', 'public']) {
          const book = await this.findBook(scope);
          if (book) {
            this.bookInfo = book;
            this.isOwner = scope === 'mine';
            return;
          }
        }
        this.bookInfo = { id: this.bookId };
      } catch {
        this.bookInfo = { id: this.bookId };
      }
    },
    async findBook(scope) {
      for (let page = 1; page <= FIND_MAX_PAGES; page++) {
        const res = await getBooks({ page, limit: FIND_PAGE_SIZE, scope });
        const items = res.data?.items || [];
        const hit = items.find(b => b.id === this.bookId);
        if (hit) return hit;
        if (page * FIND_PAGE_SIZE >= (res.data?.total || 0)) break;
      }
      return null;
    },

    /** 拉取已保存的目录，覆盖草稿并重置快照 */
    async loadChapters() {
      this.loading = true;
      try {
        const res = await getBookChapters(this.bookId);
        this.draft = treeToDraft(res.data || []);
        this.snapshot = snapshotDraft(this.draft);
        this.warnings = [];
        this.aiApplied = false;
      } catch {
        // 全局拦截器已提示
      } finally {
        this.loading = false;
      }
    },

    /** 缩进/反缩进：level ±1，并从该节点起重算后续节点的 parent_id */
    handleLevel(index, delta) {
      changeLevel(this.draft, index, delta);
    },
    /** 禁用开关：只改自身，不级联 */
    handleToggleDisabled(item, enabled) {
      item.is_disabled = enabled ? 0 : 1;
    },
    /** 放弃所有未保存修改，回到已保存状态 */
    handleReset() {
      ElMessageBox.confirm('确定放弃所有未保存的修改吗？', '提示', {
        confirmButtonText: '放弃修改',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          for (const item of this.draft) {
            const origin = this.snapshot.get(item.id);
            if (origin) {
              item.level = origin.level;
              item.parent_id = origin.parent_id;
              item.is_disabled = origin.is_disabled;
            }
          }
          this.warnings = [];
          this.aiApplied = false;
        })
        .catch(() => {});
    },

    /** AI 整理：预览结果覆盖草稿，不写库，需用户确认后保存 */
    async handleOrganize() {
      if (this.dirty) {
        try {
          await ElMessageBox.confirm(
            'AI 整理结果将覆盖当前未保存的手工修改，确定继续吗？',
            '提示',
            { confirmButtonText: '继续整理', cancelButtonText: '取消', type: 'warning' }
          );
        } catch {
          return;
        }
      }
      this.organizing = true;
      try {
        const res = await organizeChaptersPreview(this.bookId);
        applySuggestions(this.draft, res.data?.chapters);
        this.warnings = res.data?.warnings || [];
        this.aiApplied = true;
        if (this.dirty) {
          ElMessage.success('AI 整理完成，请检查后保存');
        } else {
          ElMessage.info('AI 建议与当前目录一致，无需修改');
        }
      } catch {
        // 错误码（未配置/正在整理/调用失败等）由全局拦截器提示
      } finally {
        this.organizing = false;
      }
    },

    /** 保存：先做与后端一致的本地校验，再全量提交，成功后重新拉取目录 */
    async handleSave() {
      const err = validateDraft(this.draft);
      if (err) {
        ElMessage.error(err);
        return;
      }
      this.saving = true;
      try {
        await saveChapterStructure(this.bookId, toPayload(this.draft));
        ElMessage.success('保存成功');
        await this.loadChapters();
      } catch {
        // 校验失败整批不保存，message 由全局拦截器提示
      } finally {
        this.saving = false;
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.toc-page {
  padding: 20px;
  background-color: #f6f8fb;
  min-height: calc(100vh - 84px);

  .toc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
    padding: 12px 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;

      .book-title {
        margin: 0;
        font-size: 17px;
        color: #1e293b;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 420px;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .toc-alert {
    margin-bottom: 12px;

    .warning-line {
      margin: 2px 0;
    }
  }

  .toc-card {
    padding: 16px 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .toc-toolbar {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;

      .toc-stats {
        margin-left: auto;
        font-size: 13px;
        color: #64748b;

        strong {
          color: #1e293b;
        }
      }
    }

    .toc-legend {
      margin: 12px 0;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
    }

    .toc-list {
      min-height: 200px;
      border-top: 1px solid #f1f5f9;

      .toc-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 6px 8px;
        border-bottom: 1px solid #f1f5f9;
        transition: background-color 0.15s ease;

        &:hover {
          background-color: #f8fafc;
        }

        &.is-changed {
          background-color: #fffbeb;
          border-left: 3px solid #f59e0b;
        }

        // 禁用章节置灰，但标题仍可点击进入阅读
        &.is-disabled {
          .row-main {
            opacity: 0.5;
          }
        }

        .row-main {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;

          .level-tag {
            flex-shrink: 0;
          }

          .row-title {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 14px;
            color: #334155;
            cursor: pointer;

            &:hover {
              color: #2563eb;
            }
          }

          .row-words {
            flex-shrink: 0;
            font-size: 12px;
            color: #94a3b8;
          }
        }

        .row-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
      }
    }
  }
}
</style>
