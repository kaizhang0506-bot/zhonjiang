/** 回合记录实体 */
export interface RecordItem {
  id: number
  round_no: string
  num1: number
  num2: number
  num3: number
  sum_val: number
  create_time: string
}

/** 分页数据结构 */
export interface PageData<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

/** 单个位置的独立统计结果 */
export interface PositionStat {
  position: number
  field: string
  label: string
  /** 下标 0-9 对应数字出现频次 */
  counts: number[]
  /** 娱乐参考数字（历史频次最高；无数据时为 null） */
  recommend: number | null
  recommend_count: number
  /** 冷号（历史频次最低；无数据时为 null） */
  cold: number | null
  cold_count: number
  /** 长缺号（当前连续未出期数最长；无数据时为 null） */
  miss_digit: number | null
  miss_count: number
  /** 该位置有效样本数 */
  total: number
}

/** 一组完整三位数字的历史出现频次 */
export interface HistoricalCombination {
  /** 按第一、第二、第三位置排序的完整组合 */
  digits: [number, number, number]
  /** 历史出现次数 */
  count: number
  /** 占全部历史记录的比例，范围 0-1 */
  rate: number
}

/** 统计推荐接口返回数据 */
export interface StatPredictData {
  total_records: number
  positions: PositionStat[]
  combined: Array<number | null>
  combined_cold?: Array<number | null>
  combined_miss?: Array<number | null>
  /** 历史频次最高的前三组完整组合 */
  top_combinations: HistoricalCombination[]
}

/** 回测单位置命中结果 */
export interface BacktestPosition {
  label: string
  hits: number
  rate: number
}

/** 单策略回测结果 */
export interface BacktestStrategy {
  key: string
  label: string
  positions: BacktestPosition[]
  all3_hits: number
  all3_rate: number
}

/** 预测有效性回测返回数据 */
export interface BacktestData {
  total_records: number
  trials: number
  theory: {
    single_rate: number
    all3_rate: number
    single_std: number
  }
  strategies: BacktestStrategy[]
}

/** 统一响应包装 */
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

/** 新增记录请求体 */
export interface AddRecordPayload {
  round_no: string
  num1: number
  num2: number
  num3: number
}

/** 编辑记录请求体（后端重算总和） */
export interface UpdateRecordPayload {
  id: number
  round_no: string
  num1: number
  num2: number
  num3: number
}

