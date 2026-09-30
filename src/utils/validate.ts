import type { FormRules } from 'element-plus'

/** 校验 0-9 整数（录入表单与编辑弹窗共用） */
export function digitValidator(_rule: unknown, value: number | undefined, callback: (err?: Error) => void): void {
  if (value === undefined || value === null || Number.isNaN(value)) {
    callback(new Error('该位置数字不能为空'))
    return
  }
  if (!Number.isInteger(value) || value < 0 || value > 9) {
    callback(new Error('数字范围必须为 0-9 的整数'))
    return
  }
  callback()
}

/** 回合编号必填规则 */
export const roundNoRule = [{ required: true, message: '请输入回合编号', trigger: 'blur' }]

/** 数字位置通用校验规则组 */
export function digitRules(requiredMsg: string): FormRules[string] {
  return [{ required: true, message: requiredMsg, trigger: 'blur' }, { validator: digitValidator, trigger: 'blur' }]
}

