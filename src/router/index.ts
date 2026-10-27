import { createRouter, createWebHashHistory } from 'vue-router';
import type { Router, RouteRecordRaw, RouteComponent } from 'vue-router';

/* Layout */
const Layout = (): RouteComponent => import('@/layout/index.vue');

/**
 * constantRoutes
 * a base page that does not have permission requirements
 * all roles can be accessed
 */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/redirect',
    component: Layout,
    meta: { hidden: true },
    children: [
      {
        path: '/redirect/:path(.*)',
        component: () => import('@/views/redirect/index.vue')
      }
    ]
  },
  {
    path: '/login',
    component: () => import('@/views/login/index.vue'),
    meta: { hidden: true }
  },
  {
    path: '/auth-redirect',
    component: () => import('@/views/login/auth-redirect.vue'),
    meta: { hidden: true }
  },
  {
    path: '/404',
    component: () => import('@/views/error-page/404.vue'),
    meta: { hidden: true }
  },
  {
    path: '/401',
    component: () => import('@/views/error-page/401.vue'),
    meta: { hidden: true }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        name: 'Dashboard',
        meta: { title: '首页', icon: 'dashboard', affix: true }
      }
    ]
  },
  {
    path: '/profile',
    component: Layout,
    redirect: '/profile/index',
    meta: { hidden: true },
    children: [
      {
        path: 'index',
        component: () => import('@/views/profile/index.vue'),
        name: 'Profile',
        meta: { title: '个人中心', icon: 'user', noCache: true }
      }
    ]
  }
];

/**
 * asyncRoutes
 * the routes that need to be dynamically loaded based on user permissions/roles
 */
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/system',
    component: Layout,
    // 父级不可点击;不设具体子路由跳转,因为不同用户可见的子菜单不同
    redirect: 'noRedirect',
    name: 'System',
    meta: { title: '系统管理', icon: 'component' },
    children: [
      {
        path: 'user',
        component: () => import('@/views/system/user/index.vue'),
        name: 'SystemUser',
        meta: { title: '用户管理', icon: 'peoples', permissions: ['user:view'], noCache: true }
      },
      {
        path: 'role',
        component: () => import('@/views/system/role/index.vue'),
        name: 'SystemRole',
        meta: { title: '角色管理', icon: 'lock', permissions: ['role:view'], noCache: true }
      },
      {
        path: 'llm-log',
        component: () => import('@/views/system/llm-log/index.vue'),
        name: 'SystemLLMLog',
        meta: { title: 'LLM 调用日志', icon: 'documentation', permissions: ['llm:log:view'], noCache: true }
      }
    ]
  },
  {
    path: '/book-quiz',
    component: Layout,
    redirect: '/book-quiz/list',
    name: 'BookQuiz',
    meta: { title: '电子书测验', icon: 'education' },
    children: [
      {
        path: 'list',
        component: () => import('@/views/book-quiz/index.vue'),
        name: 'BookQuizList',
        meta: { title: '电子书库', icon: 'list', noCache: true }
      },
      {
        path: 'read/:bookId',
        component: () => import('@/views/book-quiz/read/index.vue'),
        name: 'BookQuizReader',
        meta: { title: '章节阅读', hidden: true, noCache: true }
      }
    ]
  },
  // 404 page must be placed at the end !!!
  { path: '/:pathMatch(.*)*', redirect: '/404', meta: { hidden: true }}
];

const createTheRouter = (): Router => createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: constantRoutes
});

interface RouterPro extends Router {
  matcher: unknown;
}

const router = createTheRouter() as RouterPro;

export function resetRouter() {
  const newRouter = createTheRouter() as RouterPro;
  router.matcher = newRouter.matcher;
}

export default router;
