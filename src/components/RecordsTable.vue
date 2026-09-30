<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteRecord, getRecords, updateRecord } from '@/api'
import { digitRules, roundNoRule } from '@/utils/validate'
import type { RecordItem } from '@/types'

const emit = defineEmits<{ (e: 'changed'): void }>()

const loading = ref(false)
const list = ref<RecordItem[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

async function fetchRecords(): Promise<void> {
  loading.value = true
  try {
    const resp = await getRecords(pagination.page, pagination.pageSize)
    list.value = resp.data.list
    pagination.total = resp.data.total
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '获取回合记录失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number): void {
  pagination.page = page
  fetchRecords()
}

function handleSizeChange(size: number): void {
  pagination.pageSize = size
  pagination.page = 1
  fetchRecords()
}

/* ---------- 编辑弹窗 ---------- */
const dialogVisible = ref(false)
const saving = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = reactive<RecordItem>({
  id: 0,
  round_no: '',
  num1: 0,
  num2: 0,
  num3: 0,
  sum_val: 0,
  create_time: '',
})

const editRules = {
  round_no: roundNoRule,
  num1: digitRules('请输入第一位置数字'),
  num2: digitRules('请输入第二位置数字'),
  num3: digitRules('请输入第三位置数字'),
}

function handleEdit(row: RecordItem): void {
  editForm.id = row.id
  editForm.round_no = row.round_no
  editForm.num1 = row.num1
  editForm.num2 = row.num2
  editForm.num3 = row.num3
  dialogVisible.value = true
}

async function handleSaveEdit(): Promise<void> {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) {
    ElMessage.error('输入不合法：数字范围必须为 0-9 的整数')
    return
  }
  saving.value = true
  try {
    const resp = await updateRecord({
      id: editForm.id,
      round_no: editForm.round_no,
      num1: editForm.num1,
      num2: editForm.num2,
      num3: editForm.num3,
    })
    ElMessage.success(`回合 ${resp.data.round_no} 已更新，新总和 ${resp.data.sum_val}`)
    dialogVisible.value = false
    fetchRecords()
    emit('changed')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '更新失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

/* ---------- 删除 ---------- */
async function handleDelete(row: RecordItem): Promise<void> {
  const confirmed = await ElMessageBox.confirm(
    `确定删除回合「${row.round_no}」吗？删除后不可恢复，统计结果将同步更新。`,
    '删除确认',
    { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
  ).catch(() => false)
  if (!confirmed) {
    return
  }
  try {
    await deleteRecord(row.id)
    ElMessage.success('回合记录已删除')
    if (list.value.length === 1 && pagination.page > 1) {
      pagination.page -= 1
    }
    fetchRecords()
    emit('changed')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败，请稍后重试')
  }
}

onMounted(fetchRecords)

defineExpose({ refresh: fetchRecords })
</script>

<template>
  <div class="sheet-card">
    <div class="col-header-row" aria-hidden="true">
      <div class="corner" />
      <div v-for="col in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']" :key="col" class="col-header">{{ col }}</div>
    </div>

    <div class="sheet-body">
      <div class="sheet-title">
        <span>回合历史记录</span>
        <span class="title-sub">共 {{ pagination.total }} 条，支持编辑与删除</span>
      </div>

      <el-table
        v-loading="loading"
        :data="list"
        border
        height="392"
        style="width: 100%"
        empty-text="暂无回合记录，请在左侧录入并保存"
      >
        <el-table-column prop="round_no" label="回合编号" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="num-font">{{ row.round_no }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="num1" label="第一位置数字" align="center" width="112">
          <template #default="{ row }">
            <span class="digit-cell num-font">{{ row.num1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="num2" label="第二位置数字" align="center" width="112">
          <template #default="{ row }">
            <span class="digit-cell num-font">{{ row.num2 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="num3" label="第三位置数字" align="center" width="112">
          <template #default="{ row }">
            <span class="digit-cell num-font">{{ row.num3 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sum_val" label="总和" align="center" width="80">
          <template #default="{ row }">
            <span class="sum-cell num-font">{{ row.sum_val }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="create_time" label="录入时间" min-width="158">
          <template #default="{ row }">
            <span class="num-font time-cell">{{ row.create_time }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" fixed="right" width="108">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              <el-icon><EditPen /></el-icon>
              编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager-bar">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" title="编辑回合记录" width="420px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="96px">
        <el-form-item label="回合编号" prop="round_no">
          <el-input v-model="editForm.round_no" maxlength="50" />
        </el-form-item>
        <el-form-item label="第一位置" prop="num1">
          <el-input-number
            v-model="editForm.num1"
            :min="0"
            :max="9"
            :step="1"
            :precision="0"
            step-strictly
            controls-position="right"
            class="digit-input"
          />
        </el-form-item>
        <el-form-item label="第二位置" prop="num2">
          <el-input-number
            v-model="editForm.num2"
            :min="0"
            :max="9"
            :step="1"
            :precision="0"
            step-strictly
            controls-position="right"
            class="digit-input"
          />
        </el-form-item>
        <el-form-item label="第三位置" prop="num3">
          <el-input-number
            v-model="editForm.num3"
            :min="0"
            :max="9"
            :step="1"
            :precision="0"
            step-strictly
            controls-position="right"
            class="digit-input"
          />
        </el-form-item>
        <el-form-item label="新总和">
          <span class="num-font edit-sum">{{ editForm.num1 + editForm.num2 + editForm.num3 }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveEdit">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.sheet-card {
  border: 1px solid var(--wps-border);
  border-radius: var(--wps-radius-card);
  background: var(--wps-paper);
  box-shadow: var(--wps-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

.sheet-title {
  padding: 10px 14px;
  font-weight: 600;
  border-bottom: 1px dashed var(--wps-border-light);
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.sheet-title::before {
  content: '';
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: var(--wps-red);
  align-self: center;
}

.title-sub {
  font-size: 12px;
  font-weight: 400;
  color: var(--wps-text-3);
}

.sheet-body {
  padding: 0 14px 14px;
}

.digit-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--wps-border-light);
  border-radius: var(--wps-radius);
  background: #fafbfc;
  font-weight: 600;
}

.sum-cell {
  color: var(--wps-green);
  font-weight: 700;
  font-size: 15px;
}

.time-cell {
  color: var(--wps-text-2);
  font-size: 13px;
}

.pager-bar {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.edit-sum {
  color: var(--wps-green);
  font-weight: 700;
  font-size: 16px;
}

@media (max-width: 640px) {
  .pager-bar {
    justify-content: center;
  }
}
</style>

