<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getStatPredict } from '@/api'
import type { PositionStat, StatPredictData } from '@/types'

const STAT_TIP =
  '参考号码从三个位置各自的候选数字中，按历史出现次数加权生成；每次刷新都会重新生成一组，不代表或保证下一期结果。'

const loading = ref(false)
const stat = ref<StatPredictData | null>(null)
const candidateCount = ref<number>(9)
const refreshedAt = ref('')
const referenceDigits = ref<number[] | null>(null)

const referenceSum = computed<number | null>(() => {
  if (!referenceDigits.value) return null
  return referenceDigits.value.reduce((total, digit) => total + digit, 0)
})

function rankedDigits(position: PositionStat): number[] {
  return position.counts
    .map((count, digit) => ({ count, digit }))
    .sort((a, b) => b.count - a.count || a.digit - b.digit)
    .slice(0, candidateCount.value)
    .map((item) => item.digit)
}

function pickWeightedDigit(position: PositionStat): number {
  const digits = rankedDigits(position)
  const totalWeight = digits.reduce((total, digit) => total + position.counts[digit], 0)
  let threshold = Math.random() * totalWeight

  for (const digit of digits) {
    threshold -= position.counts[digit]
    if (threshold < 0) return digit
  }
  return digits[0]
}

function generateReference(): void {
  const positions = stat.value?.positions ?? []
  if (!stat.value || stat.value.total_records === 0 || positions.length !== 3) {
    referenceDigits.value = null
    return
  }

  const next = positions.map(pickWeightedDigit)
  const previous = referenceDigits.value

  // 可选数字不止一个时，刷新后避免整组号码与上次完全相同。
  if (previous && next.every((digit, index) => digit === previous[index])) {
    const alternatives = rankedDigits(positions[0])
    if (alternatives.length > 1) {
      const currentIndex = alternatives.indexOf(next[0])
      next[0] = alternatives[(currentIndex + 1) % alternatives.length]
    }
  }

  referenceDigits.value = next
}

async function fetchStat(showFeedback = false): Promise<void> {
  loading.value = true
  try {
    const response = await getStatPredict()
    stat.value = response.data
    generateReference()
    refreshedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    if (showFeedback) {
      ElMessage.success(`已按最新 ${response.data.total_records} 条记录刷新`)
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '获取参考组合失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchStat)

watch(candidateCount, generateReference)

defineExpose({ refresh: fetchStat })
</script>

<template>
  <div class="sheet-card" v-loading="loading">
    <div class="col-header-row" aria-hidden="true">
      <div class="corner" />
      <div v-for="col in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']" :key="col" class="col-header">{{ col }}</div>
    </div>

    <div class="sheet-body">
      <div class="sheet-title">
        <span>三位参考组合</span>
        <span class="title-sub">基于 {{ stat?.total_records ?? 0 }} 条历史记录</span>
        <span v-if="refreshedAt" class="refresh-time">更新于 {{ refreshedAt }}</span>
        <el-button size="small" class="refresh-btn" @click="fetchStat(true)">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>

      <el-alert class="stat-tip" type="warning" :closable="false" show-icon title="参考说明" :description="STAT_TIP" />

      <div v-if="referenceDigits" class="reference-panel">
        <div class="reference-label">本期参考号码</div>
        <div class="reference-digits" aria-label="三位参考数字">
          <span v-for="(digit, index) in referenceDigits" :key="index" class="reference-digit num-font">{{ digit }}</span>
        </div>
        <div class="reference-sum">
          <span>合值</span>
          <strong class="num-font">{{ referenceSum }}</strong>
        </div>
      </div>
      <div v-if="stat?.positions.length" class="candidate-section">
        <div class="candidate-title">
          <span>各位置候选数字（按历史频率从高到低）</span>
          <label class="candidate-count-control">
            每个位置推荐
            <el-input-number v-model="candidateCount" :min="1" :max="9" :step="1" step-strictly size="small" controls-position="right" />
            个
          </label>
        </div>
        <div class="candidate-grid">
          <div v-for="position in stat.positions" :key="position.position" class="candidate-column">
            <div class="candidate-label">{{ position.label }}</div>
            <div class="candidate-digits">
              <span v-for="(digit, rank) in rankedDigits(position)" :key="digit" class="candidate-digit">
                <i class="candidate-rank num-font">{{ rank + 1 }}</i>
                <b class="num-font">{{ digit }}</b>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="reference-empty">暂无历史记录，录入记录后将生成参考组合</div>
    </div>
  </div>
</template>

<style scoped>
.sheet-card { border: 1px solid var(--wps-border); border-radius: var(--wps-radius-card); background: var(--wps-paper); box-shadow: var(--wps-shadow); overflow: hidden; }
.col-header-row { display: grid; grid-template-columns: 44px repeat(8, 1fr); border-bottom: 1px solid var(--wps-border); background: var(--wps-head-bg); }
.corner { border-right: 1px solid var(--wps-border-light); }
.col-header { text-align: center; color: var(--wps-row-head-text); font-size: 12px; padding: 4px 0; border-right: 1px solid var(--wps-border-light); }
.col-header:last-child { border-right: none; }
.sheet-body { padding: 0 14px 14px; }
.sheet-title { padding: 10px 0; font-weight: 600; border-bottom: 1px dashed var(--wps-border-light); display: flex; align-items: baseline; gap: 10px; }
.sheet-title::before { content: ''; width: 4px; height: 14px; border-radius: 2px; background: var(--wps-red); align-self: center; }
.title-sub { font-size: 12px; font-weight: 400; color: var(--wps-text-3); }
.refresh-time { font-size: 12px; font-weight: 400; color: var(--wps-text-3); }
.refresh-btn { margin-left: auto; }
.stat-tip { margin-top: 12px; --el-alert-description-font-size: 12px; }
.reference-panel { margin-top: 14px; padding: 20px; border: 1px solid var(--wps-border-light); border-radius: var(--wps-radius-card); background: #fcfcfd; display: flex; align-items: center; justify-content: center; gap: 18px; flex-wrap: wrap; }
.reference-label { font-weight: 600; color: var(--wps-text-2); }
.reference-digits { display: flex; gap: 10px; }
.reference-digit { width: 52px; height: 52px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--wps-red); color: #fff; font-size: 25px; font-weight: 700; }
.reference-sum { display: inline-flex; align-items: baseline; gap: 7px; padding-left: 18px; border-left: 1px solid var(--wps-border-light); color: var(--wps-text-2); }
.reference-sum strong { color: var(--wps-green); font-size: 28px; }
.reference-empty { margin-top: 14px; padding: 28px; text-align: center; color: var(--wps-text-3); border: 1px dashed var(--wps-border); border-radius: var(--wps-radius-card); }
.candidate-section { margin-top: 14px; border: 1px solid var(--wps-border-light); border-radius: var(--wps-radius-card); overflow: hidden; }
.candidate-title { padding: 10px 12px; font-weight: 600; color: var(--wps-text-2); background: var(--wps-head-bg); border-bottom: 1px solid var(--wps-border-light); display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.candidate-count-control { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 400; color: var(--wps-text-2); }
.candidate-count-control :deep(.el-input-number) { width: 76px; }
.candidate-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
.candidate-column { padding: 12px; border-right: 1px solid var(--wps-border-light); }
.candidate-column:last-child { border-right: none; }
.candidate-label { margin-bottom: 9px; font-size: 13px; font-weight: 600; color: var(--wps-text-2); text-align: center; }
.candidate-digits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.candidate-digit { min-height: 42px; display: grid; grid-template-columns: 16px 1fr; align-items: center; gap: 3px; padding: 0 5px; border: 1px solid var(--wps-border-light); border-radius: var(--wps-radius); color: var(--wps-text); background: var(--wps-paper); }
.candidate-rank { color: var(--wps-text-3); font-size: 10px; font-style: normal; }
.candidate-digit b { font-size: 16px; text-align: center; }
@media (max-width: 640px) { .reference-panel { gap: 12px; } .reference-sum { width: 100%; justify-content: center; padding: 12px 0 0; border-left: none; border-top: 1px solid var(--wps-border-light); } .candidate-grid { grid-template-columns: 1fr; } .candidate-column { border-right: none; border-bottom: 1px solid var(--wps-border-light); } .candidate-column:last-child { border-bottom: none; } }
</style>

