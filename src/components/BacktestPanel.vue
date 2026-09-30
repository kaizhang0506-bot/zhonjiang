<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getBacktestStrategies } from '@/api'
import type { BacktestData } from '@/types'

const loading = ref(false)
const data = ref<BacktestData | null>(null)

async function fetchBacktest(): Promise<void> {
  loading.value = true
  try {
    const resp = await getBacktestStrategies()
    data.value = resp.data
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '获取回测数据失败')
  } finally {
    loading.value = false
  }
}

/** 单位置命中率是否落在理论值 ±2σ 的随机波动带内 */
function withinBand(rate: number): boolean {
  if (!data.value) {
    return true
  }
  const band = data.value.theory.single_std * 2
  return Math.abs(rate - data.value.theory.single_rate) <= band
}

const percent = (v: number): string => `${(v * 100).toFixed(1)}%`

const verdict = computed<string>(() => {
  if (!data.value) {
    return ''
  }
  const all = data.value.strategies.every((s) => s.positions.every((p) => withinBand(p.rate)))
  return all
    ? `四种策略的真实命中率全部落在理论值 ${(data.value.theory.single_rate * 100).toFixed(0)}% ± ${(data.value.theory.single_std * 200).toFixed(1)}% 的随机波动带内——没有任何策略比瞎猜更强。所谓的“规律”“追热”“补缺”，在真实开奖面前与掷硬币无异。`
    : '个别策略命中率偏离波动带，但请扩大样本继续观察——样本越大，任何策略都会收敛回 10%。'
})

onMounted(fetchBacktest)

defineExpose({ refresh: fetchBacktest })
</script>

<template>
  <div class="sheet-card">
    <div class="col-header-row" aria-hidden="true">
      <div class="corner" />
      <div v-for="col in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']" :key="col" class="col-header">{{ col }}</div>
    </div>

    <div class="sheet-body" v-loading="loading">
      <div class="sheet-title">
        <span>预测有效性检验（教育演示）</span>
        <span class="title-sub">回测期数 {{ data?.trials ?? 0 }} 期 / 样本 {{ data?.total_records ?? 0 }} 条</span>
        <el-button size="small" class="refresh-btn" @click="fetchBacktest">
          <el-icon><Refresh /></el-icon>
          重新回测
        </el-button>
      </div>

      <el-alert
        class="bt-tip"
        type="info"
        :closable="false"
        show-icon
        title="这个工具证明什么？"
        description="让四种最常见的选号策略在同一份历史数据上逐期“预测”下一期，再统计真实命中率。它演示的结论只有一个：任何选号策略（包括声称的 AI 推算）都无法战胜纯随机——这正是赌博长期必输的数学原因。"
      />

      <table class="bt-table">
        <thead>
          <tr>
            <th class="bt-col-strategy">选号策略</th>
            <th>第一位置命中率</th>
            <th>第二位置命中率</th>
            <th>第三位置命中率</th>
            <th>三位全中率</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in data?.strategies ?? []" :key="s.key">
            <td class="bt-col-strategy">{{ s.label }}</td>
            <td v-for="(p, i) in s.positions" :key="i" class="num-font">
              <span class="bt-rate" :class="{ inband: withinBand(p.rate) }">{{ percent(p.rate) }}</span>
              <span class="bt-hits">（中 {{ p.hits }} 次）</span>
            </td>
            <td class="num-font">
              <span class="bt-rate" :class="{ inband: true }">{{ percent(s.all3_rate) }}</span>
              <span class="bt-hits">（中 {{ s.all3_hits }} 次）</span>
            </td>
          </tr>
          <tr class="bt-theory-row">
            <td class="bt-col-strategy">理论期望（无记忆随机）</td>
            <td v-for="i in 3" :key="i" class="num-font">10.0%</td>
            <td class="num-font">0.1%</td>
          </tr>
        </tbody>
      </table>

      <div class="bt-verdict">{{ verdict }}</div>
      <div class="bt-note">
        每期开出任意数字的概率恒为 1/10，与历史无关；任何声称“能预测下期号码”的系统（无论名称是 AI、大数据还是规律算法）都是骗局。
        本工具仅供反赌博教育演示，严禁用于投注参考。
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
  grid-template-columns: 44px repeat(8, 1fr);
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

.sheet-body {
  padding: 0 14px 14px;
}

.sheet-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--wps-text);
}

.title-sub {
  font-size: 12px;
  font-weight: 400;
  color: var(--wps-text-3);
}

.refresh-btn {
  margin-left: auto;
}

.bt-tip {
  margin-bottom: 12px;
}

.bt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  border: 1px solid var(--wps-border);
}

.bt-table th,
.bt-table td {
  border: 1px solid var(--wps-border-light);
  padding: 8px 10px;
  text-align: center;
  color: var(--wps-text);
}

.bt-table th {
  background: var(--wps-head-bg);
  font-weight: 600;
}

.bt-col-strategy {
  text-align: left;
  min-width: 180px;
}

.bt-rate {
  font-size: 15px;
  font-weight: 700;
}

.bt-rate.inband {
  color: var(--wps-green);
}

.bt-hits {
  font-size: 11px;
  color: var(--wps-text-3);
  margin-left: 4px;
}

.bt-theory-row td {
  background: var(--wps-head-bg);
  color: var(--wps-text-2);
  font-weight: 600;
}

.bt-verdict {
  margin-top: 12px;
  padding: 10px 12px;
  border-left: 3px solid var(--wps-green);
  background: var(--wps-green-bg, #eef6f1);
  border-radius: var(--wps-radius);
  font-size: 13px;
  line-height: 1.7;
  color: var(--wps-text);
}

.bt-note {
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--wps-text-3);
}
</style>

