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
 * @param {string} bookId 书籍 ID
 */
export function getBookChapters(bookId) {
  return request({
    url: `/book-quiz/books/${bookId}/chapters`,
    method: 'get'
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
