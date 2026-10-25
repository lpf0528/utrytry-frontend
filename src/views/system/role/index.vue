<template>
  <div class="app-container">
    <div class="filter-container">
      <el-input
        v-model.trim="query.keyword"
        placeholder="角色标识 / 名称"
        clearable
        maxlength="64"
        class="filter-item"
        style="width: 240px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-button class="filter-item" type="primary" style="margin-left: 10px" @click="handleSearch">搜索</el-button>
      <el-button class="filter-item" @click="handleReset">重置</el-button>
      <el-button v-permission="['role:create']" class="filter-item" type="success" @click="openCreate">新建角色</el-button>
    </div>

    <el-table v-loading="listLoading" :data="list" border stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="70" align="center" />
      <el-table-column prop="key" label="角色标识" min-width="130" />
      <el-table-column label="名称" min-width="130">
        <template #default="{ row }">
          {{ row.name }}
          <el-tag v-if="row.is_builtin" size="small" type="info" style="margin-left: 6px">内置</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" align="center" fixed="right">
        <template #default="{ row }">
          <!-- 内置角色(admin)不可编辑、不可删除 -->
          <el-button v-permission="['role:update']" link type="primary" :disabled="row.is_builtin" @click="openEdit(row)">编辑</el-button>
          <el-button v-permission="['role:delete']" link type="danger" :disabled="row.is_builtin" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑角色' : '新建角色'"
      width="560px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" v-loading="detailLoading" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="角色标识" prop="key">
          <el-input v-model.trim="form.key" :disabled="isEdit" maxlength="32" placeholder="小写字母开头,可含数字、下划线,2-32 位" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model.trim="form.name" maxlength="64" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="权限">
          <div class="perm-wrap">
            <el-tree
              ref="treeRef"
              :data="permissionTree"
              node-key="id"
              show-checkbox
              default-expand-all
              :expand-on-click-node="false"
              :props="{ label: 'label', children: 'children' }"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" :disabled="detailLoading" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent, nextTick } from 'vue';
import { getRoles, getRole, createRole, updateRole, deleteRole, getPermissions } from '@/api/system/role';
import { parseTime } from '@/utils';

// 与后端角色 key 规则一致
const ROLE_KEY_RE = /^[a-z][a-z0-9_]{1,31}$/;

function emptyForm() {
  return { key: '', name: '', description: '' };
}

export default defineComponent({
  name: 'SystemRole',
  data() {
    return {
      list: [],
      total: 0,
      listLoading: false,
      query: { keyword: '', page: 1, limit: 20 },

      // 权限树:分组为父节点(id 为 group:<key>),权限为叶子节点(id 为权限标识)
      permissionTree: [],

      dialogVisible: false,
      isEdit: false,
      editingId: null,
      detailLoading: false,
      submitLoading: false,
      form: emptyForm(),
      rules: {
        key: [
          { required: true, message: '请输入角色标识', trigger: 'blur' },
          { pattern: ROLE_KEY_RE, message: '以小写字母开头,仅含小写字母、数字、下划线,长度 2-32', trigger: 'blur' }
        ],
        name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }]
      }
    };
  },
  created() {
    this.getList();
    this.loadPermissions();
  },
  methods: {
    formatDate(iso) {
      // 传 Date 对象,避免 parseTime 对字符串做 Safari 兼容替换而破坏 ISO 格式
      return iso ? parseTime(new Date(iso)) : '';
    },
    async loadPermissions() {
      try {
        const { data } = await getPermissions();
        this.permissionTree = (data || []).map(g => ({
          id: `group:${g.key}`,
          label: g.label,
          children: g.permissions.map(p => ({ id: p.code, label: `${p.label} (${p.code})` }))
        }));
      } catch {
        // 错误提示已由请求拦截器统一弹出
      }
    },
    async getList() {
      this.listLoading = true;
      try {
        const params = { ...this.query, keyword: this.query.keyword || undefined };
        const { data } = await getRoles(params);
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
      this.query = { keyword: '', page: 1, limit: this.query.limit };
      this.getList();
    },

    // 勾选树节点;leaf 节点勾选后父节点自动呈现全选 / 半选状态
    async setCheckedPermissions(codes) {
      await nextTick();
      if (this.$refs.treeRef) {
        this.$refs.treeRef.setCheckedKeys(codes, true);
      }
    },
    openCreate() {
      this.isEdit = false;
      this.editingId = null;
      this.form = emptyForm();
      this.dialogVisible = true;
      this.setCheckedPermissions([]);
    },
    async openEdit(row) {
      this.isEdit = true;
      this.editingId = row.id;
      this.form = { key: row.key, name: row.name, description: row.description || '' };
      this.dialogVisible = true;
      // 列表不含权限,需拉详情回填
      this.detailLoading = true;
      try {
        const { data } = await getRole(row.id);
        await this.setCheckedPermissions(data.permissions || []);
      } catch {
        // 详情加载失败时关闭弹窗,避免在权限为空的状态下误提交而清空角色权限
        this.dialogVisible = false;
      } finally {
        this.detailLoading = false;
      }
    },
    async submit() {
      try {
        await this.$refs.formRef.validate();
      } catch {
        return;
      }
      // 只取叶子节点(权限标识),不含分组节点
      const permissions = this.$refs.treeRef.getCheckedKeys(true);
      this.submitLoading = true;
      try {
        const { name, description } = this.form;
        if (this.isEdit) {
          await updateRole(this.editingId, { name, description, permissions });
          ElMessage.success('角色已更新');
        } else {
          await createRole({ key: this.form.key, name, description, permissions });
          ElMessage.success('角色已创建');
        }
        this.dialogVisible = false;
        this.getList();
      } catch {
        // 40900(key 重复) / 40000 / 60400 等提示已由请求拦截器弹出,弹窗保持打开便于修改
      } finally {
        this.submitLoading = false;
      }
    },

    async handleDelete(row) {
      try {
        await ElMessageBox.confirm(`确定删除角色「${row.name}」吗?仍有用户绑定的角色无法删除。`, '删除确认', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        });
      } catch {
        return; // 用户取消
      }
      try {
        await deleteRole(row.id);
        ElMessage.success('角色已删除');
        if (this.list.length === 1 && this.query.page > 1) {
          this.query.page -= 1;
        }
        this.getList();
      } catch {
        // 60400(内置角色 / 仍有用户绑定)等提示已由请求拦截器弹出
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.perm-wrap {
  width: 100%;
  max-height: 320px;
  overflow: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 6px 8px;
}
</style>
