import request from '@/utils/request'

export function getLLMLogs(params: any) {
  return request({
    url: '/system/llm-logs',
    method: 'get',
    params
  })
}

export function clearLLMLogs() {
  return request({
    url: '/system/llm-logs',
    method: 'delete'
  })
}
