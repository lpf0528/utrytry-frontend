<template>
  <div class="app-container book-quiz-container">
    <!-- 顶部操作栏与筛选 -->
    <div class="header-card">
      <div class="header-main">
        <div class="scope-tabs">
          <el-radio-group v-model="query.scope" size="large" @change="handleScopeChange">
            <el-radio-button value="mine">我的书库</el-radio-button>
            <el-radio-button value="public">公开书库</el-radio-button>
          </el-radio-group>
        </div>

        <div class="action-buttons">
          <el-button
            type="primary"
            size="default"
            @click="openUploadDialog"
          >
            <svg-icon icon-class="education" style="margin-right: 6px" />
            上传电子书
          </el-button>
          <el-button
            size="default"
            @click="getList"
          >
            刷新
          </el-button>
        </div>
      </div>

      <div class="filter-row">
        <div class="search-input-wrap">
          <el-input
            v-model.trim="query.keyword"
            placeholder="搜索书名或作者..."
            clearable
            maxlength="64"
            style="width: 280px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <svg-icon icon-class="search" />
            </template>
          </el-input>
          <el-button type="primary" style="margin-left: 10px" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>

        <div class="view-mode-toggle">
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button value="card">卡片</el-radio-button>
            <el-radio-button value="table">列表</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>

    <!-- 加载中与空状态 -->
    <div v-loading="loading" class="content-body">
      <!-- 空状态 -->
      <el-empty
        v-if="!loading && list.length === 0"
        description="暂无相关电子书籍"
        :image-size="140"
      >
        <template #extra>
          <el-button type="primary" @click="openUploadDialog">
            立即上传第一本 EPUB 电子书
          </el-button>
        </template>
      </el-empty>

      <!-- 卡片网格视图 -->
      <div v-else-if="viewMode === 'card'" class="book-card-grid">
        <div
          v-for="book in list"
          :key="book.id"
          class="book-card"
          :class="{ 'is-processing': book.status === 'PROCESSING' }"
        >
          <!-- 书籍封面 -->
          <div class="card-cover-wrapper" @click="handleCardClick(book)">
            <book-cover
              :book="book"
              width="100%"
              height="200px"
              radius="8px 8px 0 0"
            />
            <div class="cover-overlay">
              <span v-if="book.status === 'COMPLETED'" class="read-hint">
                点击开始阅读
              </span>
              <span v-else-if="book.status === 'PROCESSING'" class="read-hint">
                查看解析进度
              </span>
              <span v-else class="read-hint">
                解析失败
              </span>
            </div>
          </div>

          <!-- 卡片主体信息 -->
          <div class="card-body">
            <div class="card-title-row">
              <h3 class="card-title" :title="book.title" @click="handleCardClick(book)">
                {{ book.title || '未知书名' }}
              </h3>
              <el-tag
                v-if="book.is_public"
                size="small"
                type="success"
                effect="plain"
                class="public-tag"
              >
                公开
              </el-tag>
              <el-tag
                v-else
                size="small"
                type="info"
                effect="plain"
                class="public-tag"
              >
                私有
              </el-tag>
            </div>

            <p class="card-author" :title="book.author">
              {{ book.author || '未知作者' }}
            </p>

            <div class="card-meta">
              <span class="meta-item">
                <strong>{{ book.chapters_count || 0 }}</strong> 章节
              </span>
              <span class="meta-divider">·</span>
              <span class="meta-item">
                <strong>{{ formatWords(book.total_words) }}</strong>
              </span>
            </div>

            <!-- 状态标识栏 -->
            <div class="card-status-bar">
              <el-tag
                v-if="book.status === 'COMPLETED'"
                type="success"
                size="small"
                effect="light"
              >
                已完成
              </el-tag>
              <el-tooltip
                v-else-if="book.status === 'PROCESSING'"
                content="书籍正在后台异步切片与清洗中，点击可查看实时进度"
                placement="top"
              >
                <el-tag
                  type="primary"
                  size="small"
                  effect="dark"
                  class="clickable-tag"
                  @click="openProgressMonitor(book)"
                >
                  <span class="dot-pulse"></span>
                  解析中
                </el-tag>
              </el-tooltip>
              <el-tooltip
                v-else
                :content="book.error_msg || '解析遇到问题，请重新上传'"
                placement="top"
              >
                <el-tag
                  type="danger"
                  size="small"
                  effect="light"
                >
                  解析失败
                </el-tag>
              </el-tooltip>

              <span class="create-time">{{ formatDate(book.created_at) }}</span>
            </div>

            <!-- 底部操作按钮 -->
            <div class="card-footer">
              <el-button
                v-if="book.status === 'COMPLETED'"
                type="primary"
                size="small"
                link
                @click="goToReader(book.id)"
              >
                阅读
              </el-button>
              <el-button
                v-else-if="book.status === 'PROCESSING'"
                type="primary"
                size="small"
                link
                @click="openProgressMonitor(book)"
              >
                进度
              </el-button>
              <span v-else style="flex: 1"></span>

              <el-button
                v-if="book.status === 'COMPLETED'"
                size="small"
                link
                @click="goToToc(book.id)"
              >
                目录
              </el-button>
              <el-button
                v-if="canDeleteBook(book)"
                type="danger"
                size="small"
                link
                @click="handleDelete(book)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 表格模式 -->
      <div v-else class="book-table-wrap">
        <el-table :data="list" border stripe style="width: 100%">
          <el-table-column label="封面" width="90" align="center">
            <template #default="{ row }">
              <book-cover
                :book="row"
                width="50px"
                height="68px"
                radius="4px"
              />
            </template>
          </el-table-column>
          <el-table-column prop="title" label="书名" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <span
                v-if="row.status === 'COMPLETED'"
                class="link-type"
                @click="goToReader(row.id)"
              >
                {{ row.title }}
              </span>
              <span v-else>{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="author" label="作者" min-width="120" show-overflow-tooltip />
          <el-table-column label="章节数" width="90" align="center">
            <template #default="{ row }">
              {{ row.chapters_count || 0 }} 章
            </template>
          </el-table-column>
          <el-table-column label="总字数" width="110" align="center">
            <template #default="{ row }">
              {{ formatWords(row.total_words) }}
            </template>
          </el-table-column>
          <el-table-column label="公开范围" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.is_public ? 'success' : 'info'" size="small">
                {{ row.is_public ? '公开' : '私有' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'COMPLETED'" type="success" size="small">
                已完成
              </el-tag>
              <el-tag
                v-else-if="row.status === 'PROCESSING'"
                type="primary"
                size="small"
                class="clickable-tag"
                @click="openProgressMonitor(row)"
              >
                解析中
              </el-tag>
              <el-tag v-else type="danger" size="small">
                失败
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="上传时间" width="170" align="center">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" align="center" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'COMPLETED'"
                link
                type="primary"
                @click="goToReader(row.id)"
              >
                进入阅读
              </el-button>
              <el-button
                v-else-if="row.status === 'PROCESSING'"
                link
                type="primary"
                @click="openProgressMonitor(row)"
              >
                查看进度
              </el-button>
              <el-button
                v-if="row.status === 'COMPLETED'"
                link
                type="primary"
                @click="goToToc(row.id)"
              >
                目录
              </el-button>
              <el-button
                v-if="canDeleteBook(row)"
                link
                type="danger"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页组件 -->
      <pagination
        v-model:page="query.page"
        v-model:limit="query.limit"
        :total="total"
        :hidden="total === 0"
        @pagination="getList"
      />
    </div>

    <!-- 上传电子书弹窗 -->
    <upload-dialog
      v-model="uploadDialogVisible"
      @success="handleUploadSuccess"
    />

    <!-- 查看解析进度弹窗 (针对列表中状态为 PROCESSING 的书籍) -->
    <el-dialog
      v-model="progressDialogVisible"
      title="书籍解析进度"
      width="480px"
      :before-close="handleCloseProgressDialog"
    >
      <div v-if="monitoringBook" class="monitoring-box">
        <h4 class="monitoring-title">《{{ monitoringBook.title }}》</h4>
        <div class="progress-bar-wrap" style="margin: 20px 0">
          <el-progress
            :percentage="monitoringPercent"
            :status="monitoringStatus"
            :stroke-width="12"
            striped
            striped-flow
          />
        </div>
        <p class="monitoring-step">
          {{ monitorData.current_title || '后台切片解析中...' }}
        </p>
        <p class="monitoring-sub">
          章节进度：{{ monitorData.processed_chapters }} / {{ monitorData.total_chapters || '?' }}
        </p>
      </div>
      <template #footer>
        <el-button @click="handleCloseProgressDialog">关闭</el-button>
        <el-button
          v-if="monitorData.status === 'COMPLETED'"
          type="primary"
          @click="goToReaderFromMonitor"
        >
          立即阅读
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { getBooks, deleteBook, getBookStatus } from '@/api/book-quiz';
import BookCover from './components/BookCover.vue';
import UploadDialog from './components/UploadDialog.vue';
import { parseTime } from '@/utils';
import store from '@/store';

export default defineComponent({
  name: 'BookQuizList',
  components: {
    BookCover,
    UploadDialog
  },
  data() {
    return {
      list: [],
      total: 0,
      loading: false,
      viewMode: 'card', // 'card' | 'table'
      query: {
        page: 1,
        limit: 12,
        scope: 'mine', // 'mine' | 'public'
        keyword: ''
      },

      uploadDialogVisible: false,

      // 实时解析监控弹窗
      progressDialogVisible: false,
      monitoringBook: null,
      monitorData: {
        status: 'PROCESSING',
        percent: 0,
        processed_chapters: 0,
        total_chapters: 0,
        current_title: '',
        error_msg: null
      },
      monitorTimer: null
    };
  },
  computed: {
    currentUserRoles() {
      return store.user().roles || [];
    },
    isAdmin() {
      return this.currentUserRoles.includes('admin');
    },
    currentUserId() {
      return store.user().userId;
    },
    monitoringPercent() {
      const p = parseFloat(this.monitorData.percent);
      if (isNaN(p)) return 0;
      return Math.min(100, Math.max(0, Math.round(p * 10) / 10));
    },
    monitoringStatus() {
      if (this.monitorData.status === 'COMPLETED') return 'success';
      if (this.monitorData.status === 'FAILED') return 'exception';
      return '';
    }
  },
  mounted() {
    this.getList();
  },
  beforeUnmount() {
    this.clearMonitorTimer();
  },
  methods: {
    formatDate(time) {
      if (!time) return '-';
      return parseTime(time, '{y}-{m}-{d} {h}:{i}');
    },
    formatWords(count) {
      if (!count || count <= 0) return '0 字';
      if (count >= 10000) {
        return (count / 10000).toFixed(1) + ' 万字';
      }
      return count.toLocaleString() + ' 字';
    },
    canDeleteBook(book) {
      // 管理员角色可删除任意书籍；或者当前属于我的书库 (scope === 'mine')；或者创建者 ID 一致
      if (this.isAdmin) return true;
      if (this.query.scope === 'mine') return true;
      if (book.user_id && book.user_id === this.currentUserId) return true;
      return false;
    },
    async getList() {
      this.loading = true;
      try {
        const params = {
          page: this.query.page,
          limit: this.query.limit,
          scope: this.query.scope
        };
        if (this.query.keyword) {
          params.keyword = this.query.keyword;
        }

        const res = await getBooks(params);
        const data = res.data;
        this.list = data.items || [];
        this.total = data.total || 0;
      } catch {
        // 全局拦截器处理
      } finally {
        this.loading = false;
      }
    },
    handleSearch() {
      this.query.page = 1;
      this.getList();
    },
    handleReset() {
      this.query.keyword = '';
      this.query.page = 1;
      this.getList();
    },
    handleScopeChange() {
      this.query.page = 1;
      this.getList();
    },
    openUploadDialog() {
      this.uploadDialogVisible = true;
    },
    handleUploadSuccess() {
      this.getList();
    },
    handleCardClick(book) {
      if (book.status === 'COMPLETED') {
        this.goToReader(book.id);
      } else if (book.status === 'PROCESSING') {
        this.openProgressMonitor(book);
      } else {
        ElMessage.warning(book.error_msg || '该书籍解析失败，请删除后重新上传');
      }
    },
    goToReader(bookId) {
      this.$router.push(`/book-quiz/read/${bookId}`);
    },
    goToToc(bookId) {
      this.$router.push(`/book-quiz/toc/${bookId}`);
    },
    handleDelete(book) {
      ElMessageBox.confirm(
        `确定要删除书籍《${book.title}》吗？删除后其所有章节及正文将无法恢复。`,
        '警告',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(async () => {
        try {
          await deleteBook(book.id);
          ElMessage.success('书籍删除成功');
          // 若当前页只有一条且非第一页，前移一页
          if (this.list.length === 1 && this.query.page > 1) {
            this.query.page -= 1;
          }
          this.getList();
        } catch {
          // 统一错误处理
        }
      });
    },

    // 实时监控解析进度
    openProgressMonitor(book) {
      this.monitoringBook = book;
      this.monitorData = {
        status: book.status,
        percent: 0,
        processed_chapters: 0,
        total_chapters: book.chapters_count || 0,
        current_title: '正在连接切片解析器...',
        error_msg: null
      };
      this.progressDialogVisible = true;
      this.fetchMonitorStatus(book.id);

      this.clearMonitorTimer();
      this.monitorTimer = setInterval(() => {
        this.fetchMonitorStatus(book.id);
      }, 1500);
    },
    clearMonitorTimer() {
      if (this.monitorTimer) {
        clearInterval(this.monitorTimer);
        this.monitorTimer = null;
      }
    },
    handleCloseProgressDialog() {
      this.clearMonitorTimer();
      this.progressDialogVisible = false;
      this.monitoringBook = null;
    },
    async fetchMonitorStatus(bookId) {
      try {
        const res = await getBookStatus(bookId);
        const data = res.data;
        if (!data) return;

        this.monitorData = {
          status: data.status,
          percent: data.percent ?? 0,
          processed_chapters: data.processed_chapters ?? 0,
          total_chapters: data.total_chapters ?? 0,
          current_title: data.current_title ?? '',
          error_msg: data.error_msg ?? null
        };

        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          this.clearMonitorTimer();
          // 更新列表中当前项的状态
          const item = this.list.find(b => b.id === bookId);
          if (item) {
            item.status = data.status;
            if (data.status === 'COMPLETED') {
              item.chapters_count = data.processed_chapters;
            }
          }
        }
      } catch {
        // ignore
      }
    },
    goToReaderFromMonitor() {
      if (this.monitoringBook) {
        const id = this.monitoringBook.id;
        this.handleCloseProgressDialog();
        this.goToReader(id);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.book-quiz-container {
  padding: 20px;
  background-color: #f6f8fb;
  min-height: calc(100vh - 84px);

  .header-card {
    background: #ffffff;
    border-radius: 8px;
    padding: 18px 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    margin-bottom: 20px;

    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f1f3f7;

      .scope-tabs {
        display: flex;
        align-items: center;
      }

      .action-buttons {
        display: flex;
        gap: 12px;
      }
    }

    .filter-row {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .search-input-wrap {
        display: flex;
        align-items: center;
      }
    }
  }

  .content-body {
    min-height: 400px;
  }

  // 卡片网格布局
  .book-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 20px;
  }

  .book-card {
    background: #ffffff;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    display: flex;
    flex-direction: column;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);

      .card-cover-wrapper .cover-overlay {
        opacity: 1;
      }
    }

    &.is-processing {
      border: 1px solid #bfdbfe;
    }

    .card-cover-wrapper {
      position: relative;
      cursor: pointer;
      overflow: hidden;

      .cover-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;

        .read-hint {
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 14px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
      }
    }

    .card-body {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      flex: 1;

      .card-title-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 6px;

        .card-title {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          line-height: 1.4;
          cursor: pointer;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow: hidden;
          word-break: break-all;

          &:hover {
            color: var(--ep-color-primary);
          }
        }

        .public-tag {
          flex-shrink: 0;
        }
      }

      .card-author {
        font-size: 13px;
        color: #64748b;
        margin: 0 0 10px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .card-meta {
        display: flex;
        align-items: center;
        font-size: 12px;
        color: #94a3b8;
        margin-bottom: 12px;

        .meta-item strong {
          color: #475569;
          font-weight: 600;
        }

        .meta-divider {
          margin: 0 6px;
        }
      }

      .card-status-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
        padding-top: 10px;
        border-top: 1px dashed #f1f5f9;

        .clickable-tag {
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .dot-pulse {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #ffffff;
          animation: pulseAnim 1.2s infinite ease-in-out;
        }

        .create-time {
          font-size: 11px;
          color: #94a3b8;
        }
      }

      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
      }
    }
  }

  .book-table-wrap {
    background: #ffffff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .monitoring-box {
    text-align: center;
    padding: 10px 0;

    .monitoring-title {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .monitoring-step {
      font-size: 14px;
      color: #2563eb;
      font-weight: 500;
      margin: 8px 0 4px 0;
    }

    .monitoring-sub {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
  }
}

@keyframes pulseAnim {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.4);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
}
</style>
