<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" style="max-width:500px">
    <el-form-item label="用户名">
      <el-input :model-value="user.username" disabled />
    </el-form-item>
    <el-form-item label="姓名" prop="name">
      <el-input v-model.trim="form.name" maxlength="64" />
    </el-form-item>
    <el-form-item label="邮箱" prop="email">
      <el-input v-model.trim="form.email" maxlength="254" />
    </el-form-item>
    <el-form-item label="手机号" prop="phone">
      <el-input v-model.trim="form.phone" maxlength="11" />
    </el-form-item>
    <el-form-item label="简介" prop="introduction">
      <el-input v-model="form.introduction" type="textarea" :rows="3" maxlength="500" show-word-limit />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" :loading="loading" @click="submit">保存</el-button>
    </el-form-item>
  </el-form>
</template>

<script>
import { defineComponent } from 'vue';
import store from '@/store';

export default defineComponent({
  props: {
    user: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      loading: false,
      // 头像仅展示,不在此修改;提交时原样带回
      form: {
        name: this.user.name || '',
        email: this.user.email || '',
        phone: this.user.phone || '',
        introduction: this.user.introduction || ''
      },
      rules: {
        email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
        phone: [{ pattern: /^$|^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }]
      }
    };
  },
  methods: {
    submit() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return;
        this.loading = true;
        try {
          // 空字符串表示清空,后端按未填写处理
          await store.user().updateProfile({
            ...this.form,
            avatar: store.user().avatar
          });
          ElMessage.success('个人资料已更新');
        } finally {
          this.loading = false;
        }
      });
    }
  }
});
</script>
