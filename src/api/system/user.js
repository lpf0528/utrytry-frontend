import request from '@/utils/request';

/** 用户分页列表:{ keyword, role_id, is_active, page, limit },返回 { total, items } */
export function getUsers(params) {
  return request({
    url: '/users',
    method: 'get',
    params
  });
}

/** 用户详情 */
export function getUser(id) {
  return request({
    url: `/users/${id}`,
    method: 'get'
  });
}

/** 新建用户:{ username, password, name, email, phone, avatar, introduction, is_active, role_ids } */
export function createUser(data) {
  return request({
    url: '/users',
    method: 'post',
    data
  });
}

/** 编辑用户(用户名不可改):{ name, email, phone, avatar, introduction, role_ids } */
export function updateUser(id, data) {
  return request({
    url: `/users/${id}`,
    method: 'put',
    data
  });
}

/** 启用 / 禁用用户 */
export function updateUserStatus(id, isActive) {
  return request({
    url: `/users/${id}/status`,
    method: 'put',
    data: { is_active: isActive }
  });
}

/** 重置他人密码,成功后该用户已签发的 token 全部失效 */
export function resetUserPassword(id, newPassword) {
  return request({
    url: `/users/${id}/password`,
    method: 'put',
    data: { new_password: newPassword }
  });
}

/** 软删除用户 */
export function deleteUser(id) {
  return request({
    url: `/users/${id}`,
    method: 'delete'
  });
}
