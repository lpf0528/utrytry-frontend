import { defineStore } from 'pinia';
import { login as apiLogin, logout as apiLogout, getInfo as apiGetInfo, updateProfile as apiUpdateProfile } from '@/api/user';
import { getToken, setToken, removeToken } from '@/utils/auth';
import { resetRouter } from '@/router';
import tagsViewStore from './tagsView';

export interface IUserState {
  token: string;
  userId: number | null;
  username: string;
  name: string;
  avatar: string;
  introduction: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  // 权限标识列表(如 user:view);admin 的全部权限由后端返回
  permissions: string[];
}

export default defineStore({
  id: 'user',
  state: (): IUserState => ({
    token: getToken() || '',
    userId: null,
    username: '',
    name: '',
    avatar: '',
    introduction: '',
    email: null,
    phone: null,
    roles: [],
    permissions: []
  }),
  getters: {},
  actions: {
    // 登录:保存 token
    async login(userInfo): Promise<void> {
      const { username, password } = userInfo;
      const { data } = await apiLogin({ username: username.trim(), password });
      this.token = data.token;
      setToken(data.token);
    },

    // 用后端返回的用户信息刷新 store(getInfo 与资料修改共用)
    setUserInfo(data) {
      this.userId = data.userId;
      this.username = data.username;
      this.name = data.name;
      this.avatar = data.avatar;
      this.introduction = data.introduction;
      this.email = data.email;
      this.phone = data.phone;
      this.roles = data.roles || [];
      this.permissions = data.permissions || [];
    },

    // 获取当前用户信息(含权限)
    async getInfo() {
      const { data } = await apiGetInfo();
      if (!data) {
        throw new Error('Verification failed, please Login again.');
      }
      this.setUserInfo(data);
      return data;
    },

    // 修改个人资料,成功后同步 store
    async updateProfile(form) {
      const { data } = await apiUpdateProfile(form);
      this.setUserInfo(data);
      return data;
    },

    // 退出登录:服务端失败(如 token 已失效)也要清理本地状态
    async logout(): Promise<void> {
      try {
        await apiLogout();
      } finally {
        this.resetState();
        resetRouter();
        // 清空已访问/缓存的标签页
        tagsViewStore().delAllViews();
      }
    },

    // 清理本地登录态(不请求后端)
    resetState() {
      this.token = '';
      this.userId = null; // 置空后下次进入会重新拉取用户信息并生成路由
      this.roles = [];
      this.permissions = [];
      removeToken();
    },

    // remove token
    resetToken() {
      this.resetState();
    }
  }
});
