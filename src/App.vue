<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import RecordForm from '@/components/RecordForm.vue'
import RecordsTable from '@/components/RecordsTable.vue'
import CountdownPanel from '@/components/CountdownPanel.vue'
import StatPredict from '@/components/StatPredict.vue'
import type { RecordItem } from '@/types'

const formRef = ref<InstanceType<typeof RecordForm> | null>(null)
const tableRef = ref<InstanceType<typeof RecordsTable> | null>(null)
const statRef = ref<InstanceType<typeof StatPredict> | null>(null)

function scrollToSheet(target: string): void {
  document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 表单保存成功后：刷新历史表格与统计推荐 */
function handleSaved(_record: RecordItem): void {
  tableRef.value?.refresh()
  statRef.value?.refresh()
}

/** 历史表格发生编辑/删除后：同步刷新统计推荐 */
function handleRecordsChanged(): void {
  statRef.value?.refresh()
}

/** 倒计时归零确认开启新回合：重置录入表单 */
function handleNewRound(): void {
  formRef.value?.startNewRound()
}

/** 标题栏右侧时钟 */
const clockText = ref('')
let clockTimer: ReturnType<typeof setInterval> | null = null

function updateClock(): void {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  clockText.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
})

onBeforeUnmount(() => {
  if (clockTimer !== null) {
    clearInterval(clockTimer)
  }
})
</script>

<template>
  <div class="wps-app">
    <!-- 窗口标题栏 -->
    <header class="wps-titlebar">
      <div class="tb-left">
        <span class="tb-logo" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="18" height="18">
            <rect width="32" height="32" rx="6" fill="#ffffff" />
            <path d="M8 10h16M8 16h16M8 22h10" stroke="#d5412d" stroke-width="3" stroke-linecap="round" />
          </svg>
        </span>
        <span class="tb-file">数字回合统计表.xlsx</span>
        <span class="tb-sub">— 休闲数字统计小游戏</span>
        <el-tag size="small" effect="plain" class="tb-badge">ICP 备案完成</el-tag>
      </div>
      <div class="tb-right">
        <span class="tb-clock num-font">{{ clockText }}</span>
        <span class="tb-dot" aria-hidden="true" />
        <span class="tb-dot small" aria-hidden="true" />
        <span class="tb-dot close" aria-hidden="true" />
      </div>
    </header>

    <!-- 工具栏：快捷操作 + 回合倒计时 -->
    <div class="wps-toolbar">
      <div class="quick-actions">
        <el-button size="small" type="primary" @click="scrollToSheet('sheet-entry')">
          <el-icon><EditPen /></el-icon>
          录入记录
        </el-button>
        <el-button size="small" @click="tableRef?.refresh()">
          <el-icon><Refresh /></el-icon>
          刷新表格
        </el-button>
        <el-button size="small" @click="statRef?.refresh()">
          <el-icon><DataAnalysis /></el-icon>
          刷新统计
        </el-button>
        <el-divider direction="vertical" />
        <span class="formula-hint num-font">=SUM(第一位置:第三位置) 自动计算</span>
      </div>
      <CountdownPanel @new-round="handleNewRound" />
    </div>

    <!-- 工作簿主体 -->
    <main class="wps-workbook">
      <div class="grid-top">
        <section id="sheet-entry" class="sheet-anchor">
          <RecordForm ref="formRef" @saved="handleSaved" />
        </section>
        <section id="sheet-history" class="sheet-anchor">
          <RecordsTable ref="tableRef" @changed="handleRecordsChanged" />
        </section>
      </div>
      <section id="sheet-stat" class="sheet-anchor">
        <StatPredict ref="statRef" />
      </section>
    </main>

    <!-- 底部 Sheet 标签条（固定） -->
    <div class="wps-sheetbar">
      <button type="button" class="sheet-tab" @click="scrollToSheet('sheet-entry')">
        <el-icon><Grid /></el-icon>
        数字录入
      </button>
      <button type="button" class="sheet-tab" @click="scrollToSheet('sheet-history')">
        <el-icon><Document /></el-icon>
        回合历史
      </button>
      <button type="button" class="sheet-tab" @click="scrollToSheet('sheet-stat')">
        <el-icon><TrendCharts /></el-icon>
        统计分析
      </button>
      <span class="sheet-plus" aria-hidden="true">+</span>
      <span class="sheet-status">就绪 · 数据实时同步至服务器</span>
    </div>

    <!-- 底部固定免责声明 -->
    <footer class="wps-disclaimer">
      本网站是休闲数字统计小游戏，所有数字独立随机，参考结果不具备任何预判效力，禁止用于赌博、博彩相关活动；网站已完成ICP备案，违规使用后果由使用者自行承担。
    </footer>
  </div>
</template>

<style scoped>
.wps-app {
  min-height: 100vh;
  padding-bottom: 92px; /* 给固定底部两层留空间 */
}

/* ---------- 标题栏 ---------- */
.wps-titlebar {
  position: sticky;
  top: 0;
  z-index: 30;
  height: 42px;
  background: var(--wps-red);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
}

.tb-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tb-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 4px;
  padding: 2px;
}

.tb-file {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
}

.tb-sub {
  font-size: 12px;
  opacity: 0.85;
  white-space: nowrap;
}

.tb-badge {
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
  background: transparent;
}

.tb-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tb-clock {
  font-size: 13px;
  opacity: 0.95;
}

.tb-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
}

.tb-dot.small {
  width: 10px;
  height: 10px;
}

.tb-dot.close {
  background: rgba(255, 255, 255, 0.8);
}

/* ---------- 功能区标签 ---------- */
/* ---------- 工具栏 ---------- */
.wps-toolbar {
  position: sticky;
  top: 42px;
  z-index: 28;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 14px;
  background: var(--wps-head-bg);
  border-bottom: 1px solid var(--wps-border);
  flex-wrap: wrap;
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.formula-hint {
  font-size: 12px;
  color: var(--wps-text-3);
}

/* ---------- 工作簿主体 ---------- */
.wps-workbook {
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grid-top {
  display: grid;
  grid-template-columns: minmax(360px, 5fr) 7fr;
  gap: 16px;
  align-items: start;
}

.sheet-anchor {
  scroll-margin-top: 128px;
}

/* ---------- 底部 Sheet 标签条 ---------- */
.wps-sheetbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 36px;
  z-index: 28;
  height: 34px;
  background: var(--wps-paper);
  border-top: 1px solid var(--wps-border);
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 2px;
}

.sheet-tab {
  appearance: none;
  border: 1px solid transparent;
  background: transparent;
  color: var(--wps-text-2);
  font-size: 12px;
  padding: 4px 12px;
  border-radius: var(--wps-radius);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.sheet-tab:hover {
  color: var(--wps-red);
  background: var(--wps-red-bg);
}

.sheet-plus {
  color: var(--wps-text-3);
  padding: 0 8px;
  font-size: 16px;
  cursor: default;
}

.sheet-status {
  margin-left: auto;
  font-size: 12px;
  color: var(--wps-text-3);
}

/* ---------- 免责声明固定栏 ---------- */
.wps-disclaimer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 29;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 16px;
  background: var(--wps-red-deep);
  color: #ffe9e5;
  font-size: 12px;
  text-align: center;
  line-height: 1.5;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1024px) {
  .grid-top {
    grid-template-columns: 1fr;
  }
  .wps-toolbar {
    top: auto;
    position: static;
  }
  .sheet-anchor {
    scroll-margin-top: 16px;
  }
}

@media (max-width: 640px) {
  .tb-sub,
  .tb-clock {
    display: none;
  }
}
</style>

