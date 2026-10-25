<template>
  <div
    class="book-cover-container"
    :style="containerStyle"
  >
    <!-- 图片封面 (从 Blob ObjectURL 渲染) -->
    <img
      v-if="blobUrl"
      :src="blobUrl"
      :alt="book.title"
      class="cover-image"
      loading="lazy"
      @error="handleImgError"
    />

    <!-- 优雅渐变占位书皮 (无封面或加载失败时) -->
    <div
      v-else
      class="cover-fallback"
      :style="fallbackStyle"
    >
      <!-- 书脊质感阴影线 -->
      <div class="spine-line"></div>
      <div class="cover-inner">
        <div class="cover-header">
          <svg-icon icon-class="education" class="book-emblem" />
        </div>
        <div class="cover-body">
          <div class="book-title" :title="book.title">
            {{ book.title || '未知书名' }}
          </div>
          <div class="book-author" :title="book.author">
            {{ book.author || '未知作者' }}
          </div>
        </div>
        <div class="cover-footer">
          <span class="edition-mark">EPUB · UTRYTRY</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { getBookCover } from '@/api/book-quiz';

// 预置主题色渐变映射表 (对齐后端 cover_color 枚举)
const COLOR_GRADIENTS = {
  amber: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
  rose: 'linear-gradient(135deg, #fb7185 0%, #be123c 100%)',
  teal: 'linear-gradient(135deg, #2dd4bf 0%, #0f766e 100%)',
  indigo: 'linear-gradient(135deg, #818cf8 0%, #4338ca 100%)',
  emerald: 'linear-gradient(135deg, #34d399 0%, #047857 100%)',
  purple: 'linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)',
  cyan: 'linear-gradient(135deg, #22d3ee 0%, #0e7490 100%)',
  blue: 'linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)',
  slate: 'linear-gradient(135deg, #94a3b8 0%, #334155 100%)'
};

export default defineComponent({
  name: 'BookCover',
  props: {
    book: {
      type: Object,
      required: true
    },
    width: {
      type: String,
      default: '120px'
    },
    height: {
      type: String,
      default: '160px'
    },
    radius: {
      type: String,
      default: '6px'
    }
  },
  data() {
    return {
      blobUrl: null,
      loading: false,
      loadFailed: false
    };
  },
  computed: {
    containerStyle() {
      return {
        width: this.width,
        height: this.height,
        borderRadius: this.radius
      };
    },
    fallbackStyle() {
      const colorKey = (this.book.cover_color || 'amber').toLowerCase();
      const background = COLOR_GRADIENTS[colorKey] || COLOR_GRADIENTS.amber;
      return {
        background,
        borderRadius: this.radius
      };
    }
  },
  watch: {
    'book.id': {
      immediate: true,
      handler(newId) {
        this.fetchCover(newId);
      }
    },
    'book.cover_url': {
      handler() {
        this.fetchCover(this.book.id);
      }
    }
  },
  beforeUnmount() {
    this.revokeUrl();
  },
  methods: {
    revokeUrl() {
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl);
        this.blobUrl = null;
      }
    },
    async fetchCover(bookId) {
      this.revokeUrl();
      this.loadFailed = false;

      // 若未解析出 cover_url，直接使用占位样式
      if (!bookId || !this.book.cover_url) {
        return;
      }

      this.loading = true;
      try {
        const blob = await getBookCover(bookId);
        if (blob instanceof Blob && blob.size > 0) {
          this.blobUrl = URL.createObjectURL(blob);
        } else {
          this.loadFailed = true;
        }
      } catch {
        this.loadFailed = true;
      } finally {
        this.loading = false;
      }
    },
    handleImgError() {
      this.revokeUrl();
      this.loadFailed = true;
    }
  }
});
</script>

<style lang="scss" scoped>
.book-cover-container {
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  user-select: none;
  background-color: #f3f4f6;
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }

  .cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .cover-fallback {
    width: 100%;
    height: 100%;
    position: relative;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    padding: 10px 10px 8px 14px;
    box-sizing: border-box;

    // 书脊拟真凹凸阴影线
    .spine-line {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      background: linear-gradient(
        to right,
        rgba(0, 0, 0, 0.25) 0%,
        rgba(255, 255, 255, 0.2) 50%,
        rgba(0, 0, 0, 0.15) 100%
      );
    }

    .cover-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-between;
      overflow: hidden;
    }

    .cover-header {
      .book-emblem {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.85);
      }
    }

    .cover-body {
      margin: auto 0;
      overflow: hidden;

      .book-title {
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
        letter-spacing: 0.2px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow: hidden;
        word-break: break-all;
      }

      .book-author {
        font-size: 11px;
        margin-top: 6px;
        color: rgba(255, 255, 255, 0.9);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .cover-footer {
      .edition-mark {
        font-size: 9px;
        color: rgba(255, 255, 255, 0.7);
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
    }
  }
}
</style>
