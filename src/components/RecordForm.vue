<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { addRecord } from '@/api'
import { digitRules, roundNoRule } from '@/utils/validate'
import type { AddRecordPayload, RecordItem } from '@/types'

const emit = defineEmits<{ (e: 'saved', record: RecordItem): void }>()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const lastSum = ref<number | null>(null)
const quickInput = ref('')

const form = reactive<AddRecordPayload>({
  round_no: '',
  num1: undefined as unknown as number,
  num2: undefined as unknown as number,
  num3: undefined as unknown as number,
})

/** 自动生成回合编号：R + 日期 + 时间 */
function genRoundNo(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `R${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

form.round_no = genRoundNo()

const rules = {
  round_no: roundNoRule,
  num1: digitRules('请输入第一位置数字'),
  num2: digitRules('请输入第二位置数字'),
  num3: digitRules('请输入第三位置数字'),
}

/** 实时计算三个数字之和（=SUM 公式感） */
const liveSum = computed<number | null>(() => {
  const vals = [form.num1, form.num2, form.num3]
  if (vals.some((v) => v === undefined || v === null || Number.isNaN(v))) {
    return null
  }
  return vals.reduce((acc, cur) => acc + cur, 0)
})

/** 快速录入："3 7 5" / "3,7,5" 一次解析填入三个位置 */
function applyQuickInput(): void {
  const parts = quickInput.value.trim().split(/[\s,，、]+/).filter(Boolean)
  if (parts.length !== 3) {
    ElMessage.error('快速录入格式：3 个 0-9 数字，用空格或逗号分隔，如：3 7 5')
    return
  }
  const nums = parts.map((p) => Number(p))
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 9)) {
    ElMessage.error('快速录入仅支持 0-9 的整数，请检查后重试')
    return
  }
  form.num1 = nums[0]
  form.num2 = nums[1]
  form.num3 = nums[2]
  quickInput.value = ''
  ElMessage.success('已快速填入三个位置数字，可直接保存')
  formRef.value?.clearValidate(['num1', 'num2', 'num3'])
}

/** 输入框内回车提交（IME 组合输入中不触发） */
function handleEnterKey(event: KeyboardEvent): void {
  if (event.isComposing) {
    return
  }
  handleSubmit()
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    ElMessage.error('输入不合法：数字范围必须为 0-9 的整数，请检查后重新提交')
    return
  }
  submitting.value = true
  try {
    const resp = await addRecord({ ...form })
    lastSum.value = resp.data.sum_val
    ElMessage.success(`回合 ${resp.data.round_no} 保存成功，总和为 ${resp.data.sum_val}`)
    emit('saved', resp.data)
    startNewRound(false)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

function handleReset(): void {
  startNewRound(false)
}

/** 开启新回合：生成新编号并清空数字（供父组件在倒计时归零后调用） */
function startNewRound(notify = true): void {
  form.round_no = genRoundNo()
  form.num1 = undefined as unknown as number
  form.num2 = undefined as unknown as number
  form.num3 = undefined as unknown as number
  lastSum.value = null
  formRef.value?.clearValidate()
  if (notify) {
    ElMessage.info('已开启新回合，请录入新的数字')
  }
}

defineExpose({ startNewRound })
</script>

<template>
  <div class="sheet-card">
    <div class="col-header-row" aria-hidden="true">
      <div class="corner" />
      <div v-for="col in ['A', 'B', 'C', 'D', 'E', 'F']" :key="col" class="col-header">{{ col }}</div>
    </div>

    <div class="sheet-body">
      <div class="row-head" aria-hidden="true">1</div>
      <div class="sheet-title">数字回合录入表</div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="0"
        class="cell-form"
        @submit.prevent
        @keydown.enter="handleEnterKey"
      >
        <div class="cell-row">
          <div class="row-head" aria-hidden="true">2</div>
          <div class="cell-label">回合编号</div>
          <div class="cell-field">
            <el-form-item prop="round_no">
              <el-input v-model="form.round_no" placeholder="如 R20250929-120000" maxlength="50" clearable />
            </el-form-item>
          </div>
        </div>

        <div class="cell-row">
          <div class="row-head" aria-hidden="true">3</div>
          <div class="cell-label">第一位置数字</div>
          <div class="cell-field">
            <el-form-item prop="num1">
              <el-input-number
                v-model="form.num1"
                :min="0"
                :max="9"
                :step="1"
                :precision="0"
                step-strictly
                controls-position="right"
                placeholder="0-9"
                class="digit-input"
              />
            </el-form-item>
          </div>
        </div>

        <div class="cell-row">
          <div class="row-head" aria-hidden="true">4</div>
          <div class="cell-label">第二位置数字</div>
          <div class="cell-field">
            <el-form-item prop="num2">
              <el-input-number
                v-model="form.num2"
                :min="0"
                :max="9"
                :step="1"
                :precision="0"
                step-strictly
                controls-position="right"
                placeholder="0-9"
                class="digit-input"
              />
            </el-form-item>
          </div>
        </div>

        <div class="cell-row">
          <div class="row-head" aria-hidden="true">5</div>
          <div class="cell-label">第三位置数字</div>
          <div class="cell-field">
            <el-form-item prop="num3">
              <el-input-number
                v-model="form.num3"
                :min="0"
                :max="9"
                :step="1"
                :precision="0"
                step-strictly
                controls-position="right"
                placeholder="0-9"
                class="digit-input"
              />
            </el-form-item>
          </div>
        </div>

        <div class="cell-row quick-row">
          <div class="row-head" aria-hidden="true">6</div>
          <div class="cell-label">快速录入</div>
          <div class="cell-field">
            <el-input
              v-model="quickInput"
              placeholder="如：3 7 5（空格/逗号分隔，回车填入三个位置）"
              clearable
              class="quick-input"
            >
              <template #append>
                <el-button @click="applyQuickInput">
                  <el-icon><MagicStick /></el-icon>
                  填入
                </el-button>
              </template>
            </el-input>
          </div>
        </div>

        <div class="cell-row sum-row">
          <div class="row-head" aria-hidden="true">7</div>
          <div class="cell-label">当前总和</div>
          <div class="cell-field sum-cell num-font">
            <span v-if="liveSum !== null" class="sum-value">=SUM(C3:E3) → {{ liveSum }}</span>
            <span v-else class="sum-value muted">=SUM(C3:E3) → 待录入</span>
          </div>
        </div>

        <div class="cell-row action-row">
          <div class="row-head" aria-hidden="true">8</div>
          <div class="cell-label">操作</div>
          <div class="cell-field">
            <el-button type="primary" :loading="submitting" @click="handleSubmit">
              <el-icon><Check /></el-icon>
              保存记录
            </el-button>
            <el-button @click="handleReset">
              <el-icon><RefreshLeft /></el-icon>
              重置表单
            </el-button>
            <span class="enter-hint">回车快捷提交</span>
          </div>
        </div>
      </el-form>

      <div v-if="lastSum !== null" class="saved-tip">
        <el-icon><CircleCheck /></el-icon>
        最近一条记录已保存，总和：{{ lastSum }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.sheet-card {
  border: 1px solid var(--wps-border);
  border-radius: var(--wps-radius-card);
  background: var(--wps-paper);
  box-shadow: var(--wps-shadow);
  overflow: hidden;
}

.col-header-row {
  display: grid;
  grid-template-columns: 44px repeat(6, 1fr);
  border-bottom: 1px solid var(--wps-border);
  background: var(--wps-head-bg);
}

.corner {
  border-right: 1px solid var(--wps-border-light);
}

.col-header {
  text-align: center;
  color: var(--wps-row-head-text);
  font-size: 12px;
  padding: 4px 0;
  border-right: 1px solid var(--wps-border-light);
}

.col-header:last-child {
  border-right: none;
}

.sheet-title {
  padding: 10px 14px;
  font-weight: 600;
  color: var(--wps-text);
  border-bottom: 1px dashed var(--wps-border-light);
  display: flex;
  align-items: center;
  gap: 8px;
}

.sheet-title::before {
  content: '';
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: var(--wps-red);
}

.cell-form {
  padding: 0;
}

.cell-row {
  display: grid;
  grid-template-columns: 44px 110px 1fr;
  align-items: stretch;
  border-bottom: 1px solid var(--wps-border-light);
}

.row-head {
  background: var(--wps-row-head-bg);
  color: var(--wps-row-head-text);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--wps-border-light);
}

.cell-label {
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: var(--wps-text-2);
  background: #fafbfc;
  border-right: 1px solid var(--wps-border-light);
  font-size: 13px;
}

.cell-field {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 10px;
}

.cell-field :deep(.el-form-item) {
  width: 100%;
  margin-bottom: 0;
}

.digit-input {
  width: 130px;
}

.quick-input {
  width: 100%;
}

.sum-row .sum-cell {
  background: var(--wps-green-bg);
  border-left: 3px solid var(--wps-green);
  margin: 8px 12px;
  padding: 6px 10px;
  border-radius: var(--wps-radius);
}

.sum-value {
  color: var(--wps-green);
  font-weight: 700;
  font-size: 15px;
}

.sum-value.muted {
  color: var(--wps-text-3);
  font-weight: 400;
}

.action-row {
  border-bottom: none;
}

.enter-hint {
  font-size: 12px;
  color: var(--wps-text-3);
}

.saved-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 12px 12px;
  padding: 8px 12px;
  background: var(--wps-green-bg);
  color: var(--wps-green);
  border: 1px solid #d3e8dc;
  border-radius: var(--wps-radius);
  font-size: 13px;
}

@media (max-width: 640px) {
  .cell-row {
    grid-template-columns: 32px 96px 1fr;
  }
  .digit-input {
    width: 110px;
  }
  .enter-hint {
    display: none;
  }
}
</style>

