import request from '@/utils/request';

/** 角色分页列表:{ keyword, page, limit },返回 { total, items } */
export function getRoles(params) {
  return request({
    url: '/roles',
    method: 'get',
    params
  });
}

/** 全部角色选项 [{ id, key, name }],供用户表单 / 筛选下拉(user:view 或 role:view 可调用) */
export function getRoleOptions() {
  return request({
    url: '/roles/options',
    method: 'get'
  });
}

/** 角色详情,含 permissions[] */
export function getRole(id) {
  return request({
    url: `/roles/${id}`,
    method: 'get'
  });
}

/** 新建角色:{ key, name, description, permissions } */
export function createRole(data) {
  return request({
    url: '/roles',
    method: 'post',
    data
  });
}

/** 编辑角色(key 不可改):{ name, description, permissions } */
export function updateRole(id, data) {
  return request({
    url: `/roles/${id}`,
    method: 'put',
    data
  });
}

/** 软删除角色;内置角色或仍有用户绑定时后端返回 60400 */
export function deleteRole(id) {
  return request({
    url: `/roles/${id}`,
    method: 'delete'
  });
}

/** 权限注册表(分组):[{ key, label, permissions: [{ code, label }] }] */
export function getPermissions() {
  return request({
    url: '/permissions',
    method: 'get'
  });
}
