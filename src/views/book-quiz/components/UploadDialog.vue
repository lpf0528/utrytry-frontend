<template>
  <el-dialog
    v-model="visibleLocal"
    title="上传电子书 (EPUB)"
    width="540px"
    destroy-on-close
    :close-on-click-modal="step !== 'processing'"
    :close-on-press-escape="step !== 'processing'"
    :before-close="handleBeforeClose"
  >
    <!-- 第一步：上传与参数配置 -->
    <div v-if="step === 'upload'">
      <el-form label-position="top">
        <el-form-item label="选择电子书文件 (仅支持 .epub，单个文件 ≤ 50MB)">
          <el-upload
            ref="uploadRef"
            drag
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :accept="'.epub'"
            class="epub-uploader"
            @change="handleFileChange"
          >
            <div v-if="!selectedFile" class="upload-placeholder">
              <svg-icon icon-class="education" class="upload-icon" />
              <div class="el-upload__text">
                将 EPUB 文件拖到此处，或 <em>点击选取文件</em>
              </div>
              <div class="el-upload__tip">
                支持标准 EPUB 2.0 / 3.0 电子书，自动切片清洗正文与提取目录
              </div>
            </div>

            <div v-else class="file-preview-box">
              <svg-icon icon-class="zip" class="file-icon" />
              <div class="file-info">
                <div class="file-name" :title="selectedFile.name">
                  {{ selectedFile.name }}
                </div>
                <div class="file-size">
                  {{ formatFileSize(selectedFile.size) }}
                </div>
              </div>
              <el-button link type="danger" @click.stop="handleRemoveFile">移除</el-button>
            </div>
          </el-upload>
        </el-form-item>

        <el-form-item label="公开范围">
          <el-radio-group v-model="form.is_public">
            <el-radio :value="false">
              私有书籍
              <span class="sub-tip">（仅本人可查阅、阅读和管理）</span>
            </el-radio>
            <el-radio :value="true">
              公开书籍
              <span class="sub-tip">（解析完成后所有登录用户均可在公开书库阅读）</span>
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </div>

    <!-- 第二步：实时切片解析进度 -->
    <div v-else-if="step === 'processing'" class="processing-container">
      <div class="progress-header">
        <div class="book-name-bar">
          <svg-icon icon-class="education" class="icon" />
          <span class="name" :title="currentBookTitle">{{ currentBookTitle }}</span>
        </div>
        <el-tag
          :type="statusTagType"
          effect="dark"
          size="small"
        >
          {{ statusTagText }}
        </el-tag>
      </div>

      <div class="progress-bar-wrap">
        <el-progress
          :percentage="progressPercent"
          :status="progressStatus"
          :stroke-width="14"
          striped
          striped-flow
          :duration="20"
        />
      </div>

      <div class="progress-details">
        <div class="detail-item">
          <span class="label">处理章节：</span>
          <span class="val">{{ progressInfo.processed_chapters }} / {{ progressInfo.total_chapters || '?' }}</span>
        </div>
        <div class="detail-item current-title" :title="progressInfo.current_title">
          <span class="label">当前步骤：</span>
          <span class="val">{{ progressInfo.current_title || '后台分析切片中...' }}</span>
        </div>
      </div>

      <!-- 失败提示 -->
      <el-alert
        v-if="progressInfo.status === 'FAILED'"
        title="书籍解析失败"
        type="error"
        :description="progressInfo.error_msg || '未能正确提取章节，请确认 EPUB 结构无损'"
        show-icon
        :closable="false"
        style="margin-top: 16px"
      />
    </div>

    <!-- 第三步：解析成功完成 -->
    <div v-else-if="step === 'completed'" class="completed-container">
      <div class="success-icon-wrap">
        <svg-icon icon-class="star" class="success-icon" />
      </div>
      <h3 class="success-title">《{{ currentBookTitle }}》解析完成！</h3>
      <p class="success-desc">
        已成功切片 {{ progressInfo.processed_chapters }} 个有效章节，章节目录与清洗正文已就绪。
      </p>
    </div>

    <template #footer>
      <div v-if="step === 'upload'" class="dialog-footer">
        <el-button @click="visibleLocal = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!selectedFile"
          @click="submitUpload"
        >
          开始上传解析
        </el-button>
      </div>

      <div v-else-if="step === 'processing'" class="dialog-footer">
        <el-button
          v-if="progressInfo.status === 'FAILED'"
          type="primary"
          @click="resetToUpload"
        >
          重新上传
        </el-button>
        <el-button
          v-else
          @click="closeAndBackground"
        >
          后台运行并关闭
        </el-button>
      </div>

      <div v-else-if="step === 'completed'" class="dialog-footer">
        <el-button @click="finishUpload">返回书库</el-button>
        <el-button type="primary" @click="goToReader">立即阅读</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { defineComponent } from 'vue';
import { uploadBook, getBookStatus } from '@/api/book-quiz';

const MAX_UPLOAD_MB = 50;

export default defineComponent({
  name: 'UploadDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'success'],
  data() {
    return {
      step: 'upload', // 'upload' | 'processing' | 'completed'
      selectedFile: null,
      form: {
        is_public: false
      },
      submitting: false,

      // 正在轮询的书籍信息
      currentBookId: null,
      currentBookTitle: '',
      progressInfo: {
        status: 'PROCESSING',
        percent: 0,
        processed_chapters: 0,
        total_chapters: 0,
        current_title: '',
        error_msg: null
      },
      pollTimer: null
    };
  },
  computed: {
    visibleLocal: {
      get() {
        return this.modelValue;
      },
      set(val) {
        this.$emit('update:modelValue', val);
      }
    },
    progressPercent() {
      const p = parseFloat(this.progressInfo.percent);
      if (isNaN(p)) return 0;
      return Math.min(100, Math.max(0, Math.round(p * 10) / 10));
    },
    progressStatus() {
      if (this.progressInfo.status === 'COMPLETED') return 'success';
      if (this.progressInfo.status === 'FAILED') return 'exception';
      return '';
    },
    statusTagType() {
      if (this.progressInfo.status === 'COMPLETED') return 'success';
      if (this.progressInfo.status === 'FAILED') return 'danger';
      return 'primary';
    },
    statusTagText() {
      if (this.progressInfo.status === 'COMPLETED') return '解析完成';
      if (this.progressInfo.status === 'FAILED') return '解析失败';
      return '正在解析';
    }
  },
  beforeUnmount() {
    this.stopPolling();
  },
  methods: {
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    },
    handleFileChange(uploadFile) {
      const file = uploadFile.raw;
      if (!file) return;

      // 校验扩展名
      if (!file.name.toLowerCase().endsWith('.epub')) {
        ElMessage.error('仅支持上传 .epub 格式的电子书文件！');
        return;
      }

      // 校验体积
      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB > MAX_UPLOAD_MB) {
        ElMessage.error(`文件大小超过限制（当前 ${sizeMB.toFixed(1)}MB，最大允许 ${MAX_UPLOAD_MB}MB）！`);
        return;
      }

      this.selectedFile = file;
    },
    handleRemoveFile() {
      this.selectedFile = null;
    },
    handleBeforeClose(done) {
      if (this.step === 'processing' && this.progressInfo.status === 'PROCESSING') {
        ElMessageBox.confirm(
          '书籍正在后台解析中，关闭弹窗不会中断解析任务。是否后台继续执行？',
          '提示',
          {
            confirmButtonText: '后台运行',
            cancelButtonText: '留在当前页',
            type: 'info'
          }
        ).then(() => {
          this.stopPolling();
          this.$emit('success');
          done();
        });
      } else {
        this.stopPolling();
        done();
      }
    },
    closeAndBackground() {
      this.stopPolling();
      this.visibleLocal = false;
      this.$emit('success');
      ElMessage.info('书籍正在后台解析，稍后刷新书库列表即可查看');
    },
    resetToUpload() {
      this.stopPolling();
      this.step = 'upload';
      this.selectedFile = null;
    },
    finishUpload() {
      this.stopPolling();
      this.visibleLocal = false;
      this.$emit('success');
    },
    goToReader() {
      const bookId = this.currentBookId;
      this.finishUpload();
      if (bookId) {
        this.$router.push(`/book-quiz/read/${bookId}`);
      }
    },
    async submitUpload() {
      if (!this.selectedFile) {
        ElMessage.warning('请先选取要上传的 EPUB 文件');
        return;
      }

      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('is_public', this.form.is_public ? 'true' : 'false');

      this.submitting = true;
      try {
        const res = await uploadBook(formData);
        const data = res.data;
        this.currentBookId = data.id;
        this.currentBookTitle = data.title || this.selectedFile.name;
        this.step = 'processing';
        this.progressInfo = {
          status: 'PROCESSING',
          percent: 5,
          processed_chapters: 0,
          total_chapters: 0,
          current_title: '已提交，排队解析中...',
          error_msg: null
        };
        // 启动轮询
        this.startPolling(data.id);
        this.$emit('success');
      } catch {
        // 请求失败已由全局拦截器提示
      } finally {
        this.submitting = false;
      }
    },
    startPolling(bookId) {
      this.stopPolling();
      // 立即拉取一次
      this.fetchStatus(bookId);

      this.pollTimer = setInterval(() => {
        this.fetchStatus(bookId);
      }, 1500);
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    async fetchStatus(bookId) {
      try {
        const res = await getBookStatus(bookId);
        const data = res.data;
        if (!data) return;

        this.progressInfo = {
          status: data.status,
          percent: data.percent ?? 0,
          processed_chapters: data.processed_chapters ?? 0,
          total_chapters: data.total_chapters ?? 0,
          current_title: data.current_title ?? '',
          error_msg: data.error_msg ?? null
        };

        if (data.status === 'COMPLETED') {
          this.stopPolling();
          this.step = 'completed';
          this.$emit('success');
        } else if (data.status === 'FAILED') {
          this.stopPolling();
          this.$emit('success');
        }
      } catch {
        // 轮询偶发异常不打断
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.epub-uploader {
  width: 100%;

  :deep(.el-upload) {
    width: 100%;
  }

  :deep(.el-upload-dragger) {
    width: 100%;
    padding: 30px 20px;
    border: 2px dashed #dcdfe6;
    border-radius: 8px;
    background-color: #fafbfc;
    transition: border-color 0.2s, background-color 0.2s;

    &:hover {
      border-color: var(--ep-color-primary);
      background-color: #f5f9ff;
    }
  }
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;

  .upload-icon {
    font-size: 48px;
    color: #409eff;
    margin-bottom: 12px;
  }

  .el-upload__text {
    font-size: 14px;
    color: #606266;
    margin-bottom: 8px;

    em {
      color: #409eff;
      font-style: normal;
      font-weight: 600;
    }
  }

  .el-upload__tip {
    font-size: 12px;
    color: #909399;
  }
}

.file-preview-box {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #ffffff;
  border-radius: 6px;
  border: 1px solid #e4e7ed;

  .file-icon {
    font-size: 32px;
    color: #409eff;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .file-info {
    flex: 1;
    overflow: hidden;
    text-align: left;

    .file-name {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-size {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.sub-tip {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

.processing-container {
  padding: 10px 0;

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .book-name-bar {
      display: flex;
      align-items: center;
      font-weight: 600;
      font-size: 15px;
      color: #303133;
      max-width: 360px;

      .icon {
        margin-right: 8px;
        font-size: 18px;
        color: #409eff;
      }

      .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .progress-bar-wrap {
    margin: 20px 0;
  }

  .progress-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background-color: #f8fafc;
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 13px;

    .detail-item {
      display: flex;
      align-items: center;

      .label {
        color: #64748b;
        width: 80px;
        flex-shrink: 0;
      }

      .val {
        color: #1e293b;
        font-weight: 500;
      }

      &.current-title {
        .val {
          color: #2563eb;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
}

.completed-container {
  text-align: center;
  padding: 24px 0;

  .success-icon-wrap {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background-color: #ecfdf5;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;

    .success-icon {
      font-size: 36px;
      color: #10b981;
    }
  }

  .success-title {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 8px 0;
  }

  .success-desc {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }
}
</style>
