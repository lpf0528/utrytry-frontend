<template>
  <div class="dashboard-container">
    <div class="dashboard-card">
      <div class="welcome-header">
        <h1 class="welcome-title">欢迎使用 utrytry 后台管理系统</h1>
        <p class="welcome-desc">高效、安全的现代企业级管理后台</p>
      </div>
      <div class="user-info-section">
        <div class="info-item">
          <span class="label">当前登录账号：</span>
          <span class="value font-bold">{{ name || '未知用户' }}</span>
        </div>
        <div class="info-item">
          <span class="label">当前用户角色：</span>
          <el-tag v-for="role in roles" :key="role" size="small" class="role-tag">
            {{ role }}
          </el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { mapState } from 'pinia';
import store from '@/store';

export default defineComponent({
  name: 'Dashboard',
  computed: {
    ...mapState(store.user, ['name', 'roles'])
  }
});
</script>

<style lang="scss" scoped>
.dashboard-container {
  padding: 24px;
  background-color: #f0f2f5;
  min-height: calc(100vh - 84px);

  .dashboard-card {
    background: #ffffff;
    border-radius: 8px;
    padding: 32px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .welcome-header {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #ebeef5;

      .welcome-title {
        font-size: 24px;
        font-weight: 600;
        color: #303133;
        margin: 0 0 8px 0;
      }

      .welcome-desc {
        font-size: 14px;
        color: #909399;
        margin: 0;
      }
    }

    .user-info-section {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .info-item {
        font-size: 14px;
        display: flex;
        align-items: center;

        .label {
          color: #606266;
          width: 120px;
        }

        .value {
          color: #303133;
        }

        .font-bold {
          font-weight: 600;
        }

        .role-tag {
          margin-right: 8px;
        }
      }
    }
  }
}
</style>
