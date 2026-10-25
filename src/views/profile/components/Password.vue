<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" style="max-width:500px">
    <el-form-item label="原密码" prop="old_password">
      <el-input v-model="form.old_password" type="password" show-password autocomplete="current-password" />
    </el-form-item>
    <el-form-item label="新密码" prop="new_password">
      <el-input v-model="form.new_password" type="password" show-password autocomplete="new-password" />
    </el-form-item>
    <el-form-item label="确认新密码" prop="confirm">
      <el-input v-model="form.confirm" type="password" show-password autocomplete="new-password" />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" :loading="loading" @click="submit">修改密码</el-button>
    </el-form-item>
  </el-form>
</template>

<script>
import { defineComponent } from 'vue';
import { updatePassword } from '@/api/user';
import store from '@/store';

export default defineComponent({
  data() {
    const validateConfirm = (rule, value, callback) => {
      if (value !== this.form.new_password) {
        callback(new Error('两次输入的新密码不一致'));
      } else {
        callback();
      }
    };
    return {
      loading: false,
      form: { old_password: '', new_password: '', confirm: '' },
      rules: {
        old_password: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
        // 强度规则以后端为准(至少 8 位且含字母和数字)
        new_password: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 8, message: '密码至少 8 位', trigger: 'blur' }
        ],
        confirm: [{ required: true, validator: validateConfirm, trigger: 'blur' }]
      }
    };
  },
  methods: {
    submit() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return;
        this.loading = true;
        try {
          await updatePassword({
            old_password: this.form.old_password,
            new_password: this.form.new_password
          });
          ElMessage.success('密码已修改,请重新登录');
          // 服务端已使当前 token 失效,仅清理本地状态后跳转登录页
          store.user().resetState();
          this.$router.push('/login');
        } finally {
          this.loading = false;
        }
      });
    }
  }
});
</script>
