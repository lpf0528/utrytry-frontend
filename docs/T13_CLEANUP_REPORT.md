# T13 前端代码清理清单与执行结果报告

## 1. 任务背景

在对接真实后端接口（T14/T15）之前，对从开源模板 `vue3-element-admin` 初始化的前端项目（`utrytry-frontend`）进行全面瘦身与架构清理：
- 剔除所有演示页面、Mock 数据和未引用的第三方重型依赖；
- 简化首页（Dashboard）与个人中心（Profile）；
- 保留核心布局系统与通用基础组件；
- 确保系统在干净的状态下通过 TypeScript 编译、Vite 打包构建与 ESLint 校验。

---

## 2. 逐文件清理与保留清单

### 2.1 页面视图（`src/views/`）

| 目录/文件 | 动作 | 说明 |
|---|:---:|---|
| `views/login/` | **保留** | 登录页面及相关逻辑（T14 对接真实登录接口） |
| `views/redirect/` | **保留** | 路由刷新与重定向中转组件 |
| `views/error-page/`（`401.vue`、`404.vue`） | **保留** | 异常与无权提示页 |
| `views/dashboard/index.vue` | **修改保留** | 改造为现代简约的欢迎看板（展示用户名、角色标签），移除对 admin/editor 复杂组件的动态加载 |
| `views/dashboard/admin/` | **删除** | 依赖 ECharts、交易表等的原模板管理看板演示 |
| `views/dashboard/editor/` | **删除** | 依赖图表等的原模板编辑看板演示 |
| `views/profile/index.vue` | **修改保留** | 个人中心主页面，移除 Activity 与 Timeline 标签页，默认展示“账号信息” |
| `views/profile/components/UserCard.vue` | **修改保留** | 个人卡片组件，移除虚构的 Education 与 Skills 进度条，保留头像与身份信息 |
| `views/profile/components/Account.vue` | **保留** | 账号资料标签页（T14 对接个人资料修改真实接口） |
| `views/profile/components/Activity.vue` | **删除** | 虚构的个人动态流 |
| `views/profile/components/Timeline.vue` | **删除** | 虚构的个人时间线 |
| `views/charts/` | **删除** | 图表示例（mix-chart、keyboard、line） |
| `views/clipboard/` | **删除** | 剪贴板示例 |
| `views/components-demo/` | **删除** | 各种组件演示（dropzone、count-to、drag-select、sticky、tinymce 等） |
| `views/documentation/` | **删除** | 原模板文档页 |
| `views/error-log/` | **删除** | 错误日志页面 |
| `views/example/` | **删除** | 文章增删改查示例页面 |
| `views/excel/` | **删除** | Excel 导出与上传示例页面 |
| `views/guide/` | **删除** | 新手指引演示页面 |
| `views/icons/` | **删除** | 图标全集浏览页 |
| `views/mydemo/` | **删除** | 模板原有的测试 Demo |
| `views/nested/` | **删除** | 多级嵌套菜单示例 |
| `views/pdf/` | **删除** | PDF 打印与下载演示 |
| `views/permission/` | **删除** | 原模板旧权限演示页（T15 新建真正的 RBAC 系统管理页） |
| `views/tab/` | **删除** | 标签展示示例 |
| `views/table/` | **删除** | 动态表格/拖拽表格/行内编辑表格演示 |
| `views/theme/` | **删除** | 动态换肤演示 |
| `views/zip/` | **删除** | Zip 压缩包导出演示 |

### 2.2 路由模块（`src/router/`）

| 目录/文件 | 动作 | 说明 |
|---|:---:|---|
| `router/index.ts` | **修改保留** | 清理全部演示路由；`constantRoutes` 保留 `redirect`、`login`、`auth-redirect`、`404`、`401`、`dashboard`、`profile`；`asyncRoutes` 仅保留 404 通配重定向 |
| `router/modules/components.ts` | **删除** | 组件演示路由模块 |
| `router/modules/charts.ts` | **删除** | 图表演示路由模块 |
| `router/modules/nested.ts` | **删除** | 嵌套菜单路由模块 |
| `router/modules/table.ts` | **删除** | 表格演示路由模块 |

### 2.3 组件清单（`src/components/`）

| 组件目录 | 动作 | 说明 |
|---|:---:|---|
| `Breadcrumb`、`Hamburger`、`Pagination`、`PanThumb`、`RightPanel`、`Screenfull`、`SizeSelect`、`SvgIcon` | **保留** | 基础布局与通用展示组件 |
| `HeaderSearch` | **保留** | 顶部快捷菜单搜索组件（依赖 `fuse.js`，保留） |
| `Upload` | **保留** | 上传组件（T14 对接后端 `/upload/image`） |
| `GithubCorner` | **删除** | 右上角 GitHub 挂件 |
| `ErrorLog` | **删除** | 错误日志浮窗与触发器 |
| `Charts` | **删除** | ECharts 封装组件 |
| `Dropzone` | **删除** | Dropzone 上传组件 |
| `Tinymce` | **删除** | 富文本编辑器 |
| `ImageCropper` | **删除** | 头像裁剪组件 |
| `MDinput` | **删除** | 拟物浮动标签输入框 |
| `Sticky` | **删除** | 吸顶组件 |
| `DragSelect` | **删除** | 拖拽多选组件 |
| `BackToTop` | **删除** | 返回顶部组件 |
| `TextHoverEffect` | **删除** | 文本悬浮动画特效 |
| `UploadExcel` | **删除** | Excel 拖拽解析组件 |
| `Share` | **删除** | 社交分享下拉组件 |
| `vue-count-to` | **删除** | 数字滚动渐变组件 |

### 2.4 指令、工具与样式

| 文件/目录 | 动作 | 说明 |
|---|:---:|---|
| `directive/permission/` | **保留** | 按钮级权限控制指令 `v-permission` |
| `directive/waves/` | **保留** | 点击水波纹效果指令 `v-waves` |
| `directive/clipboard/` | **删除** | 剪贴板指令（无其他引用） |
| `directive/el-drag-dialog/` | **删除** | 对话框拖拽指令（无其他引用） |
| `vendor/Export2Excel.js`、`vendor/Export2Zip.js` | **删除** | Excel / Zip 导出辅助函数 |
| `styles/echarts/` | **删除** | ECharts macarons 主题样式文件 |
| `store/modules/errorLog.ts` | **删除** | 错误日志 Pinia store |
| `utils/error-log.ts` | **删除** | 错误日志捕获工具 |
| `utils/clipboard.js` | **删除** | 剪贴板辅助工具函数 |
| `layout/components/Navbar.vue` | **修改保留** | 移除 `<error-log>` 错误日志入口、移除“项目地址”与“文档地址”外链 |
| `main.ts` | **修改保留** | 移除对 `checkEnableLogs` 错误日志的引用与初始化 |
| `settings.ts` | **修改保留** | 移除 `errorLog` 配置项 |

### 2.5 Mock 与构建配置

| 目录/文件 | 动作 | 说明 |
|---|:---:|---|
| `mock/` 目录 | **删除** | 彻底移除 mock 文件夹及所有内置模拟数据 |
| `vite.config.ts` | **修改保留** | 移除 `vite-plugin-mock` 的引用、`viteMockServe` 插件配置及 `prodMock` 逻辑 |

### 2.6 第三方依赖变更（`package.json`）

- **移除 dependencies**:
  - `echarts`
  - `dropzone`
  - `xlsx`
  - `jszip`
  - `file-saver`
  - `sortablejs`
  - `driver.js`
  - `clipboard`
- **移除 devDependencies**:
  - `mockjs`
  - `vite-plugin-mock`
- **保留核心依赖**:
  - `vue` (^3.5.18)
  - `vue-router` (^4.5.1)
  - `pinia` (^2.3.1)
  - `axios` (^1.11.0)
  - `element-plus` (^2.10.5)
  - `js-cookie` (^3.0.5)
  - `nprogress` (^0.2.0)
  - `path-browserify` (^1.0.1)
  - `path-to-regexp` (^8.2.0)
  - `fuse.js` (^6.6.2，HeaderSearch 组件所需)

---

## 3. 执行与验证结果

### 3.1 构建验证
- **命令**: `npm --prefix ../utrytry-frontend run build:test`
- **耗时**: 2.73 秒
- **结果**: 构建完全成功，无任何 Error 或 Warning。产物正确输出至 `dist/` 目录。

### 3.2 代码质量检查
- **命令**: `npm --prefix ../utrytry-frontend run lint`
- **结果**: ESLint 检查全部通过（Exit Code 0），无任何语法、类型或风格错误。

### 3.3 残留引用检查
- 全局 Grep 检索已删除模块名称（`Tinymce`、`Dropzone`、`ErrorLog`、`mock`、`echarts` 等）：
  ```bash
  grep -rnE "(ErrorLog|GithubCorner|Dropzone|Tinymce|ImageCropper|MDinput|Sticky|DragSelect|BackToTop|TextHoverEffect|UploadExcel|vue-count-to|Export2|error-log|errorLog)" src/
  ```
- **结果**: 0 处匹配，确认已彻底无死代码残留。

### 3.4 路由与界面状态
- 当前仅常驻路由在侧边栏显示“首页”（Dashboard），其余如登录、个人中心等页面按规范隐藏展示。
- 后续待 T14、T15 接入真实后端权限与系统管理菜单。

### 3.5 后端回归测试
- **命令**: `uv run pytest -q`
- **结果**: 148 passed 全部通过。
