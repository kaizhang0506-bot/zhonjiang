<script setup lang="ts">
import { computed, ref } from 'vue'

/** 每位置选号个数（1-10） */
const n1 = ref<number>(7)
const n2 = ref<number>(7)
const n3 = ref<number>(7)
/** 单注价格与命中奖金（以常见直选玩法为例，可修改） */
const price = ref<number>(2)
const bonus = ref<number>(1040)

/** 组合注数（笛卡尔积覆盖） */
const combos = computed<number>(() => n1.value * n2.value * n3.value)
/** 单期全中概率 */
const hitProb = computed<number>(() => (n1.value / 10) * (n2.value / 10) * (n3.value / 10))
/** 投注成本 */
const cost = computed<number>(() => combos.value * price.value)
/** 单期期望回收 = 命中概率 × 奖金 */
const expectReturn = computed<number>(() => hitProb.value * bonus.value)
/** 期望回报率（数学上恒等于 奖金/(1000×单注价)，与选号个数无关） */
const roi = computed<number>(() => (cost.value > 0 ? expectReturn.value / cost.value : 0))
/** 每投 100 元的期望净亏损 */
const lossPer100 = computed<number>(() => (1 - roi.value) * 100)

const pct = (v: number): string => `${(v * 100).toFixed(v < 0.01 && v > 0 ? 2 : 1)}%`
const money = (v: number): string => `¥${v.toFixed(2)}`
</script>

<template>
  <div class="sheet-card">
    <div class="col-header-row" aria-hidden="true">
      <div class="corner" />
      <div v-for="col in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']" :key="col" class="col-header">{{ col }}</div>
    </div>

    <div class="sheet-body">
      <div class="sheet-title">
        <span>期望回报计算器（教育演示）</span>
        <span class="title-sub">证明"无论怎么选、选几个，长期都必输"</span>
      </div>

      <el-alert
        class="ev-tip"
        type="warning"
        :closable="false"
        show-icon
        title="为什么冷热会'死'？为什么任何方法都会'死'？"
        description="奖金结构决定了期望回报率是一个固定值：奖金 ÷ (1000 × 单注价)。它与每位置选几个数字完全无关——多选数字只是同比例多买注，概率上升、成本同步上升，期望亏损比例一分不少。这就是所有选号方法长期必输的数学本质。"
      />

      <div class="ev-form">
        <div class="ev-field">
          <span class="ev-label">第一位置选号个数</span>
          <el-input-number v-model="n1" :min="1" :max="10" step-strictly size="small" controls-position="right" />
        </div>
        <div class="ev-field">
          <span class="ev-label">第二位置选号个数</span>
          <el-input-number v-model="n2" :min="1" :max="10" step-strictly size="small" controls-position="right" />
        </div>
        <div class="ev-field">
          <span class="ev-label">第三位置选号个数</span>
          <el-input-number v-model="n3" :min="1" :max="10" step-strictly size="small" controls-position="right" />
        </div>
        <div class="ev-field">
          <span class="ev-label">单注价格（元）</span>
          <el-input-number v-model="price" :min="0.1" :step="0.5" size="small" controls-position="right" />
        </div>
        <div class="ev-field">
          <span class="ev-label">命中奖金（元）</span>
          <el-input-number v-model="bonus" :min="1" :step="10" size="small" controls-position="right" />
        </div>
      </div>

      <table class="ev-table">
        <tbody>
          <tr>
            <td class="ev-k">覆盖组合数（需购买的注数）</td>
            <td class="num-font">{{ combos }}</td>
          </tr>
          <tr>
            <td class="ev-k">单期投入成本</td>
            <td class="num-font">{{ money(cost) }}</td>
          </tr>
          <tr>
            <td class="ev-k">单期全中概率</td>
            <td class="num-font">{{ pct(hitProb) }}</td>
          </tr>
          <tr>
            <td class="ev-k">单期期望回收</td>
            <td class="num-font">{{ money(expectReturn) }}</td>
          </tr>
          <tr>
            <td class="ev-k">单期期望净损益</td>
            <td class="num-font ev-loss">{{ money(expectReturn - cost) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="ev-key">
        期望回报率 = 奖金 ÷ (1000 × 单注价) = <b class="num-font">{{ pct(roi) }}</b>
        —— 把三个位置全选满（10×10×10 = 1000 注全包）也是这个数：<b class="num-font">{{ pct(roi) }}</b>。
        即：每投 100 元，平均只能收回 <b class="num-font">{{ roi * 100 > 0 ? (roi * 100).toFixed(1) : '0' }} 元</b>，
        <b>净亏 {{ lossPer100.toFixed(1) }} 元</b>。
      </div>

      <div class="ev-note">
        这就是"很容易死"的数学解释：不是策略不好，而是奖金结构天然小于风险（1000 种组合只赔 1000 × 奖金 ÷ 1000 < 成本）。
        任何"概率推算""选号工具""跟单系统"都无法改变这个恒定的负期望。本计算器仅供反赌博教育，严禁用于投注决策。
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

.ev-tip {
  margin-bottom: 12px;
}

.ev-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-bottom: 12px;
}

.ev-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ev-label {
  font-size: 12px;
  color: var(--wps-text-2);
}

.ev-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  border: 1px solid var(--wps-border);
}

.ev-table td {
  border: 1px solid var(--wps-border-light);
  padding: 7px 10px;
}

.ev-k {
  color: var(--wps-text-2);
  text-align: left;
  background: var(--wps-head-bg);
  width: 55%;
}

.ev-loss {
  color: var(--wps-red);
  font-weight: 700;
}

.ev-key {
  margin-top: 12px;
  padding: 10px 12px;
  border-left: 3px solid var(--wps-red);
  background: var(--wps-red-bg);
  border-radius: var(--wps-radius);
  font-size: 13px;
  line-height: 1.8;
  color: var(--wps-text);
}

.ev-key b {
  font-size: 15px;
  color: var(--wps-red);
}

.ev-note {
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--wps-text-3);
}
</style>

