<template>
  <div class="app-container">
    <div class="filter-container">
      <el-input
        v-model.trim="query.keyword"
        placeholder="用户名 / 姓名 / 邮箱 / 手机号"
        clearable
        maxlength="64"
        class="filter-item"
        style="width: 240px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select
        v-model="query.role_id"
        placeholder="角色"
        clearable
        class="filter-item"
        style="width: 160px; margin-left: 10px"
        @change="handleSearch"
      >
        <el-option v-for="r in roleOptions" :key="r.id" :label="r.name" :value="r.id" />
      </el-select>
      <el-select
        v-model="query.is_active"
        placeholder="状态"
        clearable
        class="filter-item"
        style="width: 120px; margin-left: 10px"
        @change="handleSearch"
      >
        <el-option label="启用" :value="true" />
        <el-option label="禁用" :value="false" />
      </el-select>
      <el-button class="filter-item" type="primary" style="margin-left: 10px" @click="handleSearch">搜索</el-button>
      <el-button class="filter-item" @click="handleReset">重置</el-button>
      <el-button v-permission="['user:create']" class="filter-item" type="success" @click="openCreate">新建用户</el-button>
    </div>

    <el-table v-loading="listLoading" :data="list" border stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="70" align="center" />
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="name" label="姓名" min-width="100" />
      <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column label="角色" min-width="150">
        <template #default="{ row }">
          <el-tag v-for="r in row.roles" :key="r.id" size="small" style="margin-right: 4px">{{ r.name }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <!-- 无编辑权限或操作自己时只读;禁用 / 启用自己会被后端拒绝(60400) -->
          <el-switch
            v-model="row.is_active"
            :disabled="!canUpdate || isSelf(row)"
            :loading="row.statusLoading"
            :before-change="() => beforeStatusChange(row)"
          />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="230" align="center" fixed="right">
        <template #default="{ row }">
          <el-button v-permission="['user:update']" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-permission="['user:reset_password']" link type="warning" @click="openReset(row)">重置密码</el-button>
          <el-button v-permission="['user:delete']" link type="danger" :disabled="isSelf(row)" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-model:page="query.page"
      v-model:limit="query.limit"
      :total="total"
      :hidden="total === 0"
      @pagination="getList"
    />

    <!-- 新建 / 编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新建用户'"
      width="520px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model.trim="form.username" :disabled="isEdit" maxlength="32" placeholder="3-32 位字母、数字、下划线" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password maxlength="128" autocomplete="new-password" placeholder="至少 8 位,含字母和数字" />
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
        <el-form-item label="角色" prop="role_ids">
          <el-select v-model="form.role_ids" multiple placeholder="请选择角色" style="width: 100%">
            <el-option v-for="r in roleOptions" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="简介" prop="introduction">
          <el-input v-model="form.introduction" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
        <!-- 编辑时的启用 / 禁用统一走列表里的状态开关(独立接口与校验) -->
        <el-form-item v-if="!isEdit" label="启用">
          <el-switch v-model="form.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
    <el-dialog
      v-model="resetVisible"
      :title="`重置密码 - ${resetTarget ? resetTarget.username : ''}`"
      width="420px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="resetFormRef" :model="resetForm" :rules="resetRules" label-width="90px">
        <el-form-item label="新密码" prop="new_password">
          <el-input v-model="resetForm.new_password" type="password" show-password maxlength="128" autocomplete="new-password" placeholder="至少 8 位,含字母和数字" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm">
          <el-input v-model="resetForm.confirm" type="password" show-password maxlength="128" autocomplete="new-password" />
        </el-form-item>
      </el-form>
      <p class="reset-tip">重置后该用户已登录的会话将立即失效,需使用新密码重新登录。</p>
      <template #footer>
        <el-button @click="resetVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetLoading" @click="submitReset">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import {
  getUsers,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
  deleteUser
} from '@/api/system/user';
import { getRoleOptions } from '@/api/system/role';
import { parseTime } from '@/utils';
import checkPermission from '@/utils/permission';
import store from '@/store';

// 与后端 1.5 规则一致
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
const PHONE_RE = /^1[3-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 密码:至少 8 位,同时包含字母和数字
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;
const PASSWORD_MSG = '密码至少 8 位,且同时包含字母和数字';

function emptyForm() {
  return {
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    introduction: '',
    is_active: true,
    role_ids: []
  };
}

export default defineComponent({
  name: 'SystemUser',
  data() {
    const validateConfirm = (rule, value, callback) => {
      if (value !== this.resetForm.new_password) {
        callback(new Error('两次输入的密码不一致'));
      } else {
        callback();
      }
    };
    return {
      list: [],
      total: 0,
      listLoading: false,
      roleOptions: [],
      query: { keyword: '', role_id: undefined, is_active: undefined, page: 1, limit: 20 },

      dialogVisible: false,
      isEdit: false,
      editingId: null,
      // 头像本期不提供修改入口,编辑时原样带回,避免被后端置空
      editingAvatar: '',
      submitLoading: false,
      form: emptyForm(),
      rules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { pattern: USERNAME_RE, message: '用户名为 3-32 位字母、数字或下划线', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { pattern: PASSWORD_RE, message: PASSWORD_MSG, trigger: 'blur' }
        ],
        email: [{ pattern: EMAIL_RE, message: '邮箱格式不正确', trigger: 'blur' }],
        phone: [{ pattern: PHONE_RE, message: '请输入 11 位大陆手机号', trigger: 'blur' }]
      },

      resetVisible: false,
      resetTarget: null,
      resetLoading: false,
      resetForm: { new_password: '', confirm: '' },
      resetRules: {
        new_password: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { pattern: PASSWORD_RE, message: PASSWORD_MSG, trigger: 'blur' }
        ],
        confirm: [{ required: true, validator: validateConfirm, trigger: 'blur' }]
      }
    };
  },
  computed: {
    canUpdate() {
      return checkPermission(['user:update']);
    }
  },
  created() {
    this.getList();
    this.loadRoleOptions();
  },
  methods: {
    formatDate(iso) {
      // 后端返回带时区的 ISO 字符串;传 Date 对象以避免 parseTime 对字符串的 Safari 兼容替换破坏格式
      return iso ? parseTime(new Date(iso)) : '';
    },
    isSelf(row) {
      return row.id === store.user().userId;
    },
    async loadRoleOptions() {
      try {
        const { data } = await getRoleOptions();
        this.roleOptions = data || [];
      } catch {
        // 错误提示已由请求拦截器统一弹出;下拉为空不影响列表
      }
    },
    async getList() {
      this.listLoading = true;
      try {
        // undefined 的筛选项不会被 axios 序列化,空关键字也不传
        const params = { ...this.query, keyword: this.query.keyword || undefined };
        const { data } = await getUsers(params);
        this.list = data.items;
        this.total = data.total;
      } catch {
        // 错误提示已由请求拦截器统一弹出
      } finally {
        this.listLoading = false;
      }
    },
    handleSearch() {
      this.query.page = 1;
      this.getList();
    },
    handleReset() {
      this.query = { keyword: '', role_id: undefined, is_active: undefined, page: 1, limit: this.query.limit };
      this.getList();
    },

    openCreate() {
      this.isEdit = false;
      this.editingId = null;
      this.editingAvatar = '';
      this.form = emptyForm();
      this.dialogVisible = true;
    },
    openEdit(row) {
      this.isEdit = true;
      this.editingId = row.id;
      this.editingAvatar = row.avatar || '';
      this.form = {
        ...emptyForm(),
        username: row.username,
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        introduction: row.introduction || '',
        is_active: row.is_active,
        role_ids: row.roles.map(r => r.id)
      };
      this.dialogVisible = true;
    },
    async submit() {
      try {
        await this.$refs.formRef.validate();
      } catch {
        return;
      }
      const { name, email, phone, introduction, role_ids } = this.form;
      this.submitLoading = true;
      try {
        if (this.isEdit) {
          // 空字符串表示清空,后端按未填写处理
          await updateUser(this.editingId, {
            name, email, phone, introduction, role_ids, avatar: this.editingAvatar
          });
          ElMessage.success('用户已更新');
          // 编辑的是自己时,同步导航栏与权限等信息
          if (this.editingId === store.user().userId) {
            await store.user().getInfo();
          }
        } else {
          await createUser({
            username: this.form.username,
            password: this.form.password,
            is_active: this.form.is_active,
            avatar: '',
            name, email, phone, introduction, role_ids
          });
          ElMessage.success('用户已创建');
        }
        this.dialogVisible = false;
        this.getList();
      } catch {
        // 40900(重复) / 40000(校验) / 60400 等提示已由请求拦截器弹出,弹窗保持打开便于修改
      } finally {
        this.submitLoading = false;
      }
    },

    // el-switch 的 before-change:接口成功才真正切换,失败则保持原状态
    async beforeStatusChange(row) {
      row.statusLoading = true;
      try {
        await updateUserStatus(row.id, !row.is_active);
        ElMessage.success(row.is_active ? '用户已禁用' : '用户已启用');
        return true;
      } catch {
        return false;
      } finally {
        row.statusLoading = false;
      }
    },

    openReset(row) {
      this.resetTarget = row;
      this.resetForm = { new_password: '', confirm: '' };
      this.resetVisible = true;
    },
    async submitReset() {
      try {
        await this.$refs.resetFormRef.validate();
      } catch {
        return;
      }
      this.resetLoading = true;
      try {
        await resetUserPassword(this.resetTarget.id, this.resetForm.new_password);
        ElMessage.success('密码已重置');
        this.resetVisible = false;
      } catch {
        // 错误提示已由请求拦截器统一弹出
      } finally {
        this.resetLoading = false;
      }
    },

    async handleDelete(row) {
      try {
        await ElMessageBox.confirm(
          `确定删除用户「${row.username}」吗?删除后该用户无法登录,其用户名、邮箱、手机号可被重新使用。`,
          '删除确认',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        );
      } catch {
        return; // 用户取消
      }
      try {
        await deleteUser(row.id);
        ElMessage.success('用户已删除');
        // 删除当前页最后一条时回退一页,避免停留在空页
        if (this.list.length === 1 && this.query.page > 1) {
          this.query.page -= 1;
        }
        this.getList();
      } catch {
        // 60400(删除自己 / 最后一个管理员)等提示已由请求拦截器弹出
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.reset-tip {
  margin: 0;
  padding-left: 90px;
  font-size: 12px;
  color: #909399;
}
</style>
