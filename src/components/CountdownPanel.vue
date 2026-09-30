<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'

const emit = defineEmits<{ (e: 'new-round'): void }>()

const TOTAL_SECONDS = 180
const WARNING_SECONDS = 30

type CountdownStatus = 'idle' | 'running' | 'paused' | 'done'

const remaining = ref(TOTAL_SECONDS)
const status = ref<CountdownStatus>('idle')
let timer: ReturnType<typeof setInterval> | null = null

const display = computed<string>(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const progressPercent = computed<number>(() => {
  return Math.round((remaining.value / TOTAL_SECONDS) * 100)
})

const isWarning = computed<boolean>(() => status.value !== 'idle' && remaining.value <= WARNING_SECONDS && remaining.value > 0)

const statusText = computed<string>(() => {
  const map: Record<CountdownStatus, string> = {
    idle: '待开始',
    running: '回合进行中',
    paused: '已暂停',
    done: '回合已结束',
  }
  return map[status.value]
})

function stopTimer(): void {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function tick(): void {
  if (remaining.value > 0) {
    remaining.value -= 1
  }
  if (remaining.value <= 0) {
    stopTimer()
    status.value = 'done'
    promptNewRound()
  }
}

function toggleRun(): void {
  if (status.value === 'running') {
    stopTimer()
    status.value = 'paused'
    return
  }
  if (status.value === 'done' || status.value === 'idle') {
    remaining.value = TOTAL_SECONDS
  }
  status.value = 'running'
  stopTimer()
  timer = setInterval(tick, 1000)
}

function resetTimer(): void {
  stopTimer()
  remaining.value = TOTAL_SECONDS
  status.value = 'idle'
}

function promptNewRound(): void {
  ElMessageBox.confirm('3 分钟回合倒计时已结束，是否立即开启新回合？', '回合时间到', {
    confirmButtonText: '开启新回合',
    cancelButtonText: '稍后再说',
    type: 'warning',
  })
    .then(() => {
      resetTimer()
      status.value = 'running'
      timer = setInterval(tick, 1000)
      emit('new-round')
    })
    .catch(() => {
      /* 用户选择稍后处理，保留结束状态 */
    })
}

/** 供父组件调用：立即开启新回合 */
function startNewRound(): void {
  resetTimer()
  status.value = 'running'
  timer = setInterval(tick, 1000)
}

onMounted(() => {
  /* 初始不自动计时，由用户点击开始 */
})

onBeforeUnmount(stopTimer)

defineExpose({ startNewRound })
</script>

<template>
  <div class="countdown-panel" :class="{ warning: isWarning }">
    <div class="cd-left">
      <el-icon class="cd-icon"><Timer /></el-icon>
      <div class="cd-meta">
        <div class="cd-status">
          回合倒计时
          <el-tag :type="status === 'running' ? 'primary' : status === 'done' ? 'danger' : 'info'" size="small" effect="plain">
            {{ statusText }}
          </el-tag>
        </div>
        <el-progress
          :percentage="progressPercent"
          :stroke-width="6"
          :show-text="false"
          :color="isWarning ? 'var(--wps-red)' : 'var(--wps-green)'"
          class="cd-progress"
        />
      </div>
    </div>

    <div class="cd-clock num-font" :class="{ blink: isWarning }">{{ display }}</div>

    <div class="cd-actions">
      <el-button size="small" :type="status === 'running' ? 'warning' : 'primary'" plain @click="toggleRun">
        <el-icon>
          <VideoPause v-if="status === 'running'" />
          <VideoPlay v-else />
        </el-icon>
        {{ status === 'running' ? '暂停' : '开始' }}
      </el-button>
      <el-button size="small" @click="resetTimer">
        <el-icon><RefreshLeft /></el-icon>
        重置
      </el-button>
      <el-button size="small" type="primary" @click="startNewRound">新回合</el-button>
    </div>
  </div>
</template>

<style scoped>
.countdown-panel {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 14px;
  border: 1px solid var(--wps-border-light);
  border-radius: var(--wps-radius);
  background: #fff;
  min-width: 380px;
}

.countdown-panel.warning {
  border-color: var(--wps-red-border);
  background: var(--wps-red-bg);
}

.cd-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.cd-icon {
  font-size: 20px;
  color: var(--wps-green);
}

.warning .cd-icon {
  color: var(--wps-red);
}

.cd-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.cd-status {
  font-size: 12px;
  color: var(--wps-text-2);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.cd-progress {
  width: 120px;
}

.cd-clock {
  font-size: 26px;
  font-weight: 700;
  color: var(--wps-green);
  letter-spacing: 1px;
  min-width: 84px;
  text-align: center;
}

.warning .cd-clock {
  color: var(--wps-red);
}

.blink {
  animation: breath 1.1s ease-in-out infinite;
}

@keyframes breath {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.cd-actions {
  display: flex;
  align-items: center;
}

.cd-actions .el-button + .el-button {
  margin-left: 8px;
}

@media (max-width: 900px) {
  .countdown-panel {
    min-width: 0;
    width: 100%;
    flex-wrap: wrap;
  }
  .cd-left {
    flex-basis: 100%;
  }
}
</style>

