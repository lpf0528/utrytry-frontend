import request from '@/utils/request';

/** 登录,返回 { token } */
export function login(data) {
  return request({
    url: '/auth/login',
    method: 'post',
    data
  });
}

/** 获取当前用户信息(含 roles、permissions);token 由请求拦截器统一携带 */
export function getInfo() {
  return request({
    url: '/users/me',
    method: 'get'
  });
}

/** 退出登录(服务端把 token 加入黑名单) */
export function logout() {
  return request({
    url: '/auth/logout',
    method: 'post'
  });
}

/** 修改个人资料:{ name, avatar, introduction, email, phone } */
export function updateProfile(data) {
  return request({
    url: '/users/me',
    method: 'put',
    data
  });
}

/** 修改密码:{ old_password, new_password },成功后旧 token 失效 */
export function updatePassword(data) {
  return request({
    url: '/users/me/password',
    method: 'put',
    data
  });
}
