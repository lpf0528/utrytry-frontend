import request from '@/utils/request';

/**
 * 上传 EPUB 电子书并触发后台异步解析
 * @param {FormData} formData 包含 file (.epub) 和可选的 is_public (boolean)
 */
export function uploadBook(formData) {
  return request({
    url: '/book-quiz/books/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}

/**
 * 轮询书籍后台切片解析进度与状态
 * @param {string} bookId 书籍 ID
 */
export function getBookStatus(bookId) {
  return request({
    url: `/book-quiz/books/${bookId}/status`,
    method: 'get'
  });
}

/**
 * 获取单个书籍详情
 * @param {string} bookId 书籍 ID
 */
export function getBook(bookId) {
  return request({
    url: `/book-quiz/books/${bookId}`,
    method: 'get'
  });
}

/**
 * 分页获取书库列表
 * @param {object} params 查询参数: { page, limit, scope: 'mine'|'public', keyword }
 */
export function getBooks(params) {
  return request({
    url: '/book-quiz/books',
    method: 'get',
    params
  });
}

/**
 * 获取书籍封面图片二进制流 (需要认证, 返回 Blob)
 * @param {string} bookId 书籍 ID
 */
export function getBookCover(bookId) {
  return request({
    url: `/book-quiz/books/${bookId}/cover`,
    method: 'get',
    responseType: 'blob'
  });
}

/**
 * 获取书籍章节树形目录 (不含大文本 content 字段)
 * @param {string} book_id 书籍 ID
 * @param {boolean} withFirst 是否顺便带出首章正文 (首屏优化)
 */
export function getBookChapters(bookId, withFirst = false) {
  return request({
    url: `/book-quiz/books/${bookId}/chapters`,
    method: 'get',
    params: { with_first: withFirst }
  });
}

/**
 * AI 整理目录预览 (仅返回建议, 不写库; 仅所有者/admin 可用)
 * 后端按批串行调用 LLM, 总耗时上限约 180s, 因此单独放宽前端超时
 * @param {string} bookId 书籍 ID
 * @returns {Promise<{data: {chapters: Array<{id, level, parent_id, is_disabled}>, warnings: string[]}}>}
 */
export function organizeChaptersPreview(bookId) {
  return request({
    url: `/book-quiz/books/${bookId}/chapters/organize-preview`,
    method: 'post',
    timeout: 200 * 1000
  });
}

/**
 * 保存目录结构 (全量覆盖 level / parent_id / is_disabled; 仅所有者/admin 可用)
 * @param {string} bookId 书籍 ID
 * @param {Array<{id: string, level: number, parent_id: string|null, is_disabled: 0|1}>} chapters 全部章节
 */
export function saveChapterStructure(bookId, chapters) {
  return request({
    url: `/book-quiz/books/${bookId}/chapters/structure`,
    method: 'put',
    data: { chapters },
    timeout: 30000 // 批量保存可能涉及数百行更新，放宽超时到 30s
  });
}

/**
 * 快捷更新单个章节的禁用状态
 * @param {string} chapterId 章节 ID
 * @param {0|1} isDisabled 是否禁用
 */
export function updateChapterDisabled(chapterId, isDisabled) {
  return request({
    url: `/book-quiz/chapters/${chapterId}/is_disabled`,
    method: 'patch',
    data: { is_disabled: isDisabled }
  });
}

/**
 * 获取单个章节详情 (清洗后正文、上下章 ID)
 * @param {string} chapterId 全局章节 ID ({book_id}_{index})
 */
export function getChapterDetail(chapterId) {
  return request({
    url: `/book-quiz/chapters/${chapterId}`,
    method: 'get'
  });
}

/**
 * 软删除书籍及其所有章节关联数据
 * @param {string} bookId 书籍 ID
 */
export function deleteBook(bookId) {
  return request({
    url: `/book-quiz/books/${bookId}`,
    method: 'delete'
  });
}
