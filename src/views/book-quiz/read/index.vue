<template>
  <div
    class="reader-page-container"
    :class="['theme-' + readerTheme]"
  >
    <!-- 左侧可折叠章节目录侧边栏 -->
    <aside
      class="reader-sidebar"
      :class="{ 'is-collapsed': isSidebarCollapsed }"
    >
      <div class="sidebar-header">
        <div class="book-mini-info">
          <book-cover
            v-if="bookInfo"
            :book="bookInfo"
            width="44px"
            height="58px"
            radius="4px"
          />
          <div class="book-text">
            <h4 class="title" :title="bookInfo?.title">{{ bookInfo?.title || '电子书阅读器' }}</h4>
            <p class="author">{{ bookInfo?.author || '' }}</p>
          </div>
        </div>
        <el-button
          link
          class="collapse-btn"
          title="收起目录"
          @click="toggleSidebar"
        >
          <svg-icon icon-class="nested" />
        </el-button>
      </div>

      <!-- 章节搜索过滤 -->
      <div class="sidebar-search">
        <el-input
          v-model.trim="chapterFilterKeyword"
          placeholder="搜索章节..."
          clearable
          size="small"
        >
          <template #prefix>
            <svg-icon icon-class="search" />
          </template>
        </el-input>
      </div>

      <!-- 章节树形列表 -->
      <div class="sidebar-tree-wrap">
        <div v-if="treeLoading" class="tree-loading">
          <el-skeleton :rows="6" animated />
        </div>
        <div v-else-if="flattenedChapters.length === 0" class="tree-empty">
          暂无目录数据
        </div>
        <div v-else class="chapter-list">
          <div
            v-for="item in filteredChapters"
            :key="item.id"
            class="chapter-item"
            :class="{
              'is-active': currentChapterId === item.id,
              [`level-${item.level || 0}`]: true
            }"
            @click="selectChapter(item.id)"
          >
            <span class="chapter-title" :title="item.title">
              {{ item.title }}
            </span>
            <span v-if="item.word_count" class="chapter-words">
              {{ item.word_count }}字
            </span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 右侧阅读主内容区 -->
    <main class="reader-main-area">
      <!-- 顶部控制栏 -->
      <header class="reader-header">
        <div class="header-left">
          <el-button
            v-if="isSidebarCollapsed"
            link
            class="toggle-sidebar-btn"
            @click="toggleSidebar"
          >
            <svg-icon icon-class="nested" style="margin-right: 4px" />
            展开目录
          </el-button>
          <el-button
            link
            class="back-btn"
            @click="goBack"
          >
            ← 返回书库
          </el-button>
        </div>

        <div class="header-title" :title="currentChapter?.title">
          {{ currentChapter?.title || '正在加载章节...' }}
        </div>

        <!-- 阅读偏好控制 -->
        <div class="header-right">
          <!-- 字号控制 -->
          <div class="font-size-ctrl">
            <el-button
              size="small"
              circle
              :disabled="fontSize <= 14"
              @click="adjustFontSize(-2)"
            >
              A-
            </el-button>
            <span class="font-size-val">{{ fontSize }}px</span>
            <el-button
              size="small"
              circle
              :disabled="fontSize >= 28"
              @click="adjustFontSize(2)"
            >
              A+
            </el-button>
          </div>

          <!-- 主题切换 -->
          <div class="theme-selector">
            <span
              class="theme-dot dot-light"
              :class="{ 'is-active': readerTheme === 'light' }"
              title="明亮白天"
              @click="readerTheme = 'light'"
            ></span>
            <span
              class="theme-dot dot-sepia"
              :class="{ 'is-active': readerTheme === 'sepia' }"
              title="舒适羊皮纸"
              @click="readerTheme = 'sepia'"
            ></span>
            <span
              class="theme-dot dot-dark"
              :class="{ 'is-active': readerTheme === 'dark' }"
              title="深邃夜间"
              @click="readerTheme = 'dark'"
            ></span>
          </div>
        </div>
      </header>

      <!-- 文章正文阅读容器 -->
      <div ref="articleScrollContainer" class="article-scroll-container">
        <div
          class="article-wrapper"
          :style="{ maxWidth: contentMaxWidth, fontSize: fontSize + 'px' }"
        >
          <!-- 章节加载骨架 -->
          <div v-if="contentLoading" class="content-skeleton">
            <el-skeleton :rows="12" animated />
          </div>

          <!-- 正文展示 -->
          <article v-else-if="currentChapter" class="article-content">
            <header class="chapter-meta-header">
              <h1 class="chapter-heading">{{ currentChapter.title }}</h1>
              <div class="chapter-sub-meta">
                <span>有效字数：{{ currentChapter.word_count || 0 }} 字</span>
                <span class="divider">·</span>
                <span>章节序号：第 {{ (currentChapter.chapter_index ?? 0) + 1 }} 节</span>
              </div>
            </header>

            <div class="chapter-body">
              <template v-if="paragraphs.length > 0">
                <p
                  v-for="(p, idx) in paragraphs"
                  :key="idx"
                  class="content-paragraph"
                >
                  {{ p }}
                </p>
              </template>
              <div v-else class="empty-chapter">
                本章节未提取到可读文本。
              </div>
            </div>

            <!-- 底部翻页控制器 -->
            <footer class="chapter-pager-footer">
              <el-button
                size="large"
                :disabled="!currentChapter.prev_chapter_id"
                class="pager-btn"
                @click="goToPrevChapter"
              >
                ← 上一章
              </el-button>

              <div class="pager-info">
                <span>{{ currentChapterIndexDisplay }} / {{ totalChaptersCount }}</span>
              </div>

              <el-button
                type="primary"
                size="large"
                :disabled="!currentChapter.next_chapter_id"
                class="pager-btn"
                @click="goToNextChapter"
              >
                下一章 →
              </el-button>
            </footer>
          </article>

          <!-- 错误或未选中 -->
          <div v-else class="content-empty">
            <el-empty description="未能加载该章节内容" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { getBookChapters, getChapterDetail, getBooks } from '@/api/book-quiz';
import BookCover from '../components/BookCover.vue';

export default defineComponent({
  name: 'BookQuizReader',
  components: {
    BookCover
  },
  data() {
    return {
      bookId: '',
      bookInfo: null,
      isSidebarCollapsed: false,
      chapterFilterKeyword: '',

      treeLoading: false,
      chaptersTree: [],
      flattenedChapters: [],

      currentChapterId: '',
      currentChapter: null,
      contentLoading: false,

      // 阅读偏好配置
      fontSize: 18,
      readerTheme: 'light', // 'light' | 'sepia' | 'dark'
      contentMaxWidth: '820px'
    };
  },
  computed: {
    paragraphs() {
      if (!this.currentChapter || !this.currentChapter.content) {
        return [];
      }
      return this.currentChapter.content
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    },
    filteredChapters() {
      if (!this.chapterFilterKeyword) {
        return this.flattenedChapters;
      }
      const kw = this.chapterFilterKeyword.toLowerCase();
      return this.flattenedChapters.filter(c => c.title && c.title.toLowerCase().includes(kw));
    },
    totalChaptersCount() {
      return this.flattenedChapters.length;
    },
    currentChapterIndexDisplay() {
      if (!this.currentChapter) return 1;
      return (this.currentChapter.chapter_index ?? 0) + 1;
    }
  },
  created() {
    this.bookId = this.$route.params.bookId;
    const qChapter = this.$route.query.chapterId;
    if (qChapter) {
      this.currentChapterId = qChapter;
    }
  },
  mounted() {
    this.initKeyboardListener();
    this.loadBookDetails();
    this.loadChapters();
  },
  beforeUnmount() {
    this.removeKeyboardListener();
  },
  methods: {
    goBack() {
      this.$router.push('/book-quiz/list');
    },
    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
    },
    adjustFontSize(delta) {
      const next = this.fontSize + delta;
      if (next >= 14 && next <= 28) {
        this.fontSize = next;
      }
    },
    initKeyboardListener() {
      window.addEventListener('keydown', this.handleKeyDown);
    },
    removeKeyboardListener() {
      window.removeEventListener('keydown', this.handleKeyDown);
    },
    handleKeyDown(e) {
      // 避免在输入框中触发翻页
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowLeft') {
        this.goToPrevChapter();
      } else if (e.key === 'ArrowRight') {
        this.goToNextChapter();
      }
    },
    async loadBookDetails() {
      try {
        // 从书库接口中拉取该书的详情元数据用于展示侧边栏
        const res = await getBooks({ scope: 'mine', keyword: this.bookId, limit: 1 });
        const item = res.data?.items?.find(b => b.id === this.bookId);
        if (item) {
          this.bookInfo = item;
        } else {
          // 若在 mine 没找到，尝试在 public 找
          const pubRes = await getBooks({ scope: 'public', keyword: this.bookId, limit: 1 });
          this.bookInfo = pubRes.data?.items?.find(b => b.id === this.bookId) || { id: this.bookId };
        }
      } catch {
        this.bookInfo = { id: this.bookId };
      }
    },
    flattenTree(nodes, result = []) {
      if (!Array.isArray(nodes)) return result;
      for (const node of nodes) {
        result.push(node);
        if (node.children && node.children.length > 0) {
          this.flattenTree(node.children, result);
        }
      }
      return result;
    },
    async loadChapters() {
      this.treeLoading = true;
      try {
        const res = await getBookChapters(this.bookId);
        this.chaptersTree = res.data || [];
        this.flattenedChapters = this.flattenTree(this.chaptersTree);

        // 如果未指定 chapterId，默认加载第一个章节
        if (!this.currentChapterId && this.flattenedChapters.length > 0) {
          this.currentChapterId = this.flattenedChapters[0].id;
        }

        if (this.currentChapterId) {
          this.loadChapterContent(this.currentChapterId);
        }
      } catch {
        // 全局拦截器提示
      } finally {
        this.treeLoading = false;
      }
    },
    selectChapter(chapterId) {
      if (this.currentChapterId === chapterId) return;
      this.currentChapterId = chapterId;
      this.loadChapterContent(chapterId);
    },
    async loadChapterContent(chapterId) {
      this.contentLoading = true;
      try {
        const res = await getChapterDetail(chapterId);
        this.currentChapter = res.data;

        // 静默同步浏览器地址栏参数，避免触发 AppMain fullPath key 销毁重建整个组件
        this.syncUrlChapterId(chapterId);

        // 平滑回到顶部
        this.$nextTick(() => {
          if (this.$refs.articleScrollContainer) {
            this.$refs.articleScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      } catch {
        // 全局拦截器提示
      } finally {
        this.contentLoading = false;
      }
    },
    syncUrlChapterId(chapterId) {
      try {
        // hash 路由模式下更新 hash 参数，不会触发 vue-router 重新挂载路由视图
        const hashPath = this.$route.path;
        const newHash = `#${hashPath}?chapterId=${encodeURIComponent(chapterId)}`;
        window.history.replaceState(window.history.state, '', newHash);
      } catch (err) {
        console.warn('Failed to update URL silently:', err);
      }
    },
    goToPrevChapter() {
      if (this.currentChapter && this.currentChapter.prev_chapter_id) {
        this.selectChapter(this.currentChapter.prev_chapter_id);
      }
    },
    goToNextChapter() {
      if (this.currentChapter && this.currentChapter.next_chapter_id) {
        this.selectChapter(this.currentChapter.next_chapter_id);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.reader-page-container {
  display: flex;
  height: calc(100vh - 84px);
  overflow: hidden;
  position: relative;
  transition: background-color 0.3s ease, color 0.3s ease;

  // 主题配色变量
  &.theme-light {
    background-color: #ffffff;
    color: #2c3e50;
    --sidebar-bg: #f8fafc;
    --sidebar-border: #e2e8f0;
    --header-border: #f1f5f9;
    --active-item-bg: #eff6ff;
    --active-item-color: #2563eb;
    --chapter-body-color: #334155;
    --sub-meta-color: #94a3b8;
  }

  &.theme-sepia {
    background-color: #fbf0d9;
    color: #4a3c28;
    --sidebar-bg: #f4e7cb;
    --sidebar-border: #e5d4b1;
    --header-border: #ebdaba;
    --active-item-bg: #ebd8b4;
    --active-item-color: #854d0e;
    --chapter-body-color: #4a3c28;
    --sub-meta-color: #8c785d;
  }

  &.theme-dark {
    background-color: #1a1a1f;
    color: #e2e8f0;
    --sidebar-bg: #131316;
    --sidebar-border: #27272a;
    --header-border: #27272a;
    --active-item-bg: #27272a;
    --active-item-color: #60a5fa;
    --chapter-body-color: #cbd5e1;
    --sub-meta-color: #71717a;
  }

  // 左侧章节侧边栏
  .reader-sidebar {
    width: 300px;
    background-color: var(--sidebar-bg);
    border-right: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    transition: width 0.25s ease, transform 0.25s ease;
    overflow: hidden;

    &.is-collapsed {
      width: 0;
      border-right: none;
    }

    .sidebar-header {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--sidebar-border);

      .book-mini-info {
        display: flex;
        align-items: center;
        gap: 10px;
        overflow: hidden;

        .book-text {
          overflow: hidden;

          .title {
            margin: 0;
            font-size: 13px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .author {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: var(--sub-meta-color);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }

      .collapse-btn {
        font-size: 16px;
        color: var(--sub-meta-color);
        padding: 4px;
      }
    }

    .sidebar-search {
      padding: 10px 14px;
      border-bottom: 1px solid var(--sidebar-border);
    }

    .sidebar-tree-wrap {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;

      .tree-loading,
      .tree-empty {
        padding: 20px;
        color: var(--sub-meta-color);
        font-size: 13px;
        text-align: center;
      }

      .chapter-list {
        display: flex;
        flex-direction: column;

        .chapter-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          cursor: pointer;
          font-size: 13px;
          line-height: 1.4;
          transition: background-color 0.15s ease, color 0.15s ease;

          &:hover {
            background-color: var(--active-item-bg);
          }

          &.is-active {
            background-color: var(--active-item-bg);
            color: var(--active-item-color);
            font-weight: 600;
            border-left: 3px solid var(--active-item-color);
          }

          &.level-1 {
            padding-left: 28px;
            font-size: 12.5px;
          }

          &.level-2 {
            padding-left: 40px;
            font-size: 12px;
          }

          .chapter-title {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex: 1;
          }

          .chapter-words {
            font-size: 11px;
            color: var(--sub-meta-color);
            margin-left: 8px;
            flex-shrink: 0;
          }
        }
      }
    }
  }

  // 右侧主阅读区域
  .reader-main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;

    .reader-header {
      height: 54px;
      padding: 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--header-border);
      flex-shrink: 0;

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;

        .back-btn {
          font-weight: 500;
          font-size: 13px;
        }

        .toggle-sidebar-btn {
          font-size: 13px;
        }
      }

      .header-title {
        font-size: 14px;
        font-weight: 600;
        max-width: 400px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 16px;

        .font-size-ctrl {
          display: flex;
          align-items: center;
          gap: 6px;

          .font-size-val {
            font-size: 12px;
            width: 34px;
            text-align: center;
          }
        }

        .theme-selector {
          display: flex;
          align-items: center;
          gap: 8px;

          .theme-dot {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid transparent;
            transition: transform 0.2s, border-color 0.2s;

            &:hover {
              transform: scale(1.15);
            }

            &.is-active {
              border-color: #2563eb;
              transform: scale(1.1);
            }

            &.dot-light {
              background-color: #ffffff;
              box-shadow: 0 0 0 1px #cbd5e1;
            }

            &.dot-sepia {
              background-color: #fbf0d9;
              box-shadow: 0 0 0 1px #d6c098;
            }

            &.dot-dark {
              background-color: #1a1a1f;
              box-shadow: 0 0 0 1px #52525b;
            }
          }
        }
      }
    }

    // 滚动阅读区域
    .article-scroll-container {
      flex: 1;
      overflow-y: auto;
      padding: 30px 20px 80px 20px;
      display: flex;
      justify-content: center;

      .article-wrapper {
        width: 100%;
        line-height: 1.85;
        letter-spacing: 0.3px;

        .content-skeleton {
          padding: 40px 0;
        }

        .chapter-meta-header {
          margin-bottom: 32px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--header-border);

          .chapter-heading {
            font-size: 1.5em;
            font-weight: 700;
            line-height: 1.35;
            margin: 0 0 10px 0;
          }

          .chapter-sub-meta {
            font-size: 13px;
            color: var(--sub-meta-color);

            .divider {
              margin: 0 8px;
            }
          }
        }

        .chapter-body {
          .content-paragraph {
            margin-bottom: 1.6em;
            text-indent: 2em;
            color: var(--chapter-body-color);
            text-align: justify;
            word-break: break-word;
          }

          .empty-chapter {
            padding: 40px 0;
            text-align: center;
            color: var(--sub-meta-color);
          }
        }

        // 翻页操作栏
        .chapter-pager-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 60px;
          padding-top: 24px;
          border-top: 1px dashed var(--header-border);

          .pager-btn {
            min-width: 120px;
          }

          .pager-info {
            font-size: 13px;
            color: var(--sub-meta-color);
          }
        }
      }
    }
  }
}
</style>
