import { defineStore } from 'pinia';
import { asyncRoutes, constantRoutes } from '@/router';
import type { RouteRecordRaw } from 'vue-router';

interface IPermissionState {
  routes: Array<RouteRecordRaw>;
  addRoutes: Array<RouteRecordRaw>;
}

/**
 * 按 meta.permissions 判断当前用户是否可访问路由:
 * 未声明 permissions 的路由所有人可访问,声明了则拥有其中任意一个权限即可
 * @param permissions 当前用户权限标识
 * @param route 路由
 */
function hasPermission(permissions: string[], route: RouteRecordRaw): boolean {
  if (route.meta && route.meta.permissions) {
    const required = route.meta.permissions as string[];
    return permissions.some(p => required.includes(p));
  }
  return true;
}

/**
 * 递归过滤异步路由表
 * @param routes asyncRoutes
 * @param permissions 当前用户权限标识
 */
export function filterAsyncRoutes(routes: RouteRecordRaw[], permissions: string[]): Array<RouteRecordRaw> {
  const res: Array<RouteRecordRaw> = [];

  routes.forEach(route => {
    const tmp = { ...route };
    if (hasPermission(permissions, tmp)) {
      if (tmp.children) {
        tmp.children = filterAsyncRoutes(tmp.children, permissions);
        // 子路由全部被过滤时,父级菜单也不应出现(否则会显示空的父级入口)
        if (tmp.children.length === 0) return;
      }
      res.push(tmp);
    }
  });

  return res;
}

export default defineStore({
  id: 'permission',
  state: ():IPermissionState => ({
    routes: [],
    addRoutes: []
  }),
  getters: {},
  actions: {
    setRoutes(routes: RouteRecordRaw[]) {
      this.addRoutes = routes;
      this.routes = constantRoutes.concat(routes);
    },
    // admin 的全部权限由后端返回,这里不再硬编码角色名
    generateRoutes(permissions: string[]) {
      const accessedRoutes = filterAsyncRoutes(asyncRoutes, permissions);
      this.setRoutes(accessedRoutes);
      return accessedRoutes;
    }
  }
});
