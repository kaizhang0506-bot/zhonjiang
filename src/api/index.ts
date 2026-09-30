import axios from 'axios'
import type {
  AddRecordPayload,
  ApiResponse,
  BacktestData,
  PageData,
  RecordItem,
  StatPredictData,
  UpdateRecordPayload,
} from '@/types'

/**
 * 前后端分离：开发环境由 vite proxy 将 /api 转发至 FastAPI(独立端口)，
 * 生产环境由 FastAPI 同源托管，因此统一使用相对路径 /api。
 */
const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// 响应拦截：剥离 axios 外壳，业务错误统一转为可读 Error
http.interceptors.response.use(
  (resp) => resp.data,
  (error: unknown) => {
    let msg = '网络请求失败，请稍后重试'
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail
      if (typeof detail === 'string' && detail) {
        msg = detail
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail[0]?.msg ?? msg
      } else if (error.message) {
        msg = error.message
      }
    }
    return Promise.reject(new Error(msg))
  },
)

/** 新增回合记录（后端会再次校验 0-9 并自动计算总和） */
export function addRecord(payload: AddRecordPayload): Promise<ApiResponse<RecordItem>> {
  return http.post('/add_record', payload)
}

/** 分页获取回合记录列表 */
export function getRecords(page: number, pageSize: number): Promise<ApiResponse<PageData<RecordItem>>> {
  return http.get('/get_records', { params: { page, page_size: pageSize } })
}

/** 获取分位置独立统计与娱乐参考号码 */
export function getStatPredict(): Promise<ApiResponse<StatPredictData>> {
  return http.get('/get_stat_predict')
}

/** 编辑回合记录（后端重新校验并重算总和） */
export function updateRecord(payload: UpdateRecordPayload): Promise<ApiResponse<RecordItem>> {
  return http.post('/update_record', payload)
}

/** 删除回合记录 */
export function deleteRecord(id: number): Promise<ApiResponse<null>> {
  return http.post('/delete_record', { id })
}

/** 获取预测有效性回测（教育演示：各策略真实命中率 vs 理论值） */
export function getBacktestStrategies(): Promise<ApiResponse<BacktestData>> {
  return http.get('/backtest_strategies')
}

