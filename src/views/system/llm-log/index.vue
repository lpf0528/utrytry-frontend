<template>
  <div class="app-container">
    <div class="filter-container" style="margin-bottom: 20px;">
      <el-input
        v-model="listQuery.model"
        placeholder="模型名称"
        style="width: 200px"
        class="filter-item"
        @keyup.enter="handleFilter"
      />
      <el-button class="filter-item" type="primary" icon="Search" @click="handleFilter" style="margin-left: 10px;">
        搜索
      </el-button>
      <el-button
        v-permission="['llm:log:delete']"
        class="filter-item"
        type="danger"
        icon="Delete"
        style="margin-left: 10px;"
        @click="handleClear"
      >
        清空日志
      </el-button>
    </div>

    <el-table v-loading="listLoading" :data="list" border fit highlight-current-row style="width: 100%">
      <el-table-column label="ID" prop="id" align="center" width="80" />
      <el-table-column label="模型" prop="model" align="center" width="150" />
      <el-table-column label="Token 消耗" align="center" width="180">
        <template #default="{ row }">
          <div><el-tag size="small">Prompt: {{ row.prompt_tokens }}</el-tag></div>
          <div style="margin-top: 4px"><el-tag type="success" size="small">Total: {{ row.total_tokens }}</el-tag></div>
        </template>
      </el-table-column>
      <el-table-column label="耗时" align="center" width="100">
        <template #default="{ row }">
          {{ row.latency_ms.toFixed(0) }}ms
        </template>
      </el-table-column>
      <el-table-column label="输出摘要" min-width="300">
        <template #default="{ row }">
          <span class="text-ellipsis">{{ row.output_content }}</span>
        </template>
      </el-table-column>
      <el-table-column label="时间" prop="created_at" align="center" width="180" />
      <el-table-column label="操作" align="center" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="handleDetail(row)">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="listQuery.page"
      v-model:limit="listQuery.limit"
      @pagination="getList"
    />

    <el-dialog v-model="detailVisible" title="LLM 调用详情" width="70%">
      <div v-if="currentRow" class="detail-container">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="模型">{{ currentRow.model }}</el-descriptions-item>
          <el-descriptions-item label="总 Token">{{ currentRow.total_tokens }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ currentRow.latency_ms.toFixed(0) }}ms</el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 20px">
          <p class="section-title">输入 (Messages):</p>
          <div class="code-block">
            <div v-for="(msg, index) in currentRow.input_messages" :key="index" class="message-item">
              <span class="role">[{{ msg.role }}]:</span> {{ msg.content }}
            </div>
          </div>
        </div>

        <div style="margin-top: 20px">
          <p class="section-title">输出 (Response):</p>
          <div class="code-block output">
            {{ currentRow.output_content }}
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getLLMLogs, clearLLMLogs } from '@/api/system/llm-log'
import Pagination from '@/components/Pagination/index.vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const list = ref([])
const total = ref(0)
const listLoading = ref(true)
const detailVisible = ref(false)
const currentRow = ref<any>(null)

const listQuery = ref({
  page: 1,
  limit: 20,
  model: undefined
})

const getList = async () => {
  listLoading.value = true
  try {
    const { data } = await getLLMLogs(listQuery.value)
    list.value = data.items
    total.value = data.total
  } catch (error) {
    console.error(error)
  } finally {
    listLoading.value = false
  }
}

const handleFilter = () => {
  listQuery.value.page = 1
  getList()
}

const handleDetail = (row: any) => {
  currentRow.value = row
  detailVisible.value = true
}

const handleClear = () => {
  ElMessageBox.confirm('确定要清空所有 LLM 调用日志吗？此操作不可恢复。', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await clearLLMLogs()
      ElMessage.success('清空成功')
      handleFilter()
    } catch (error) {
      console.error(error)
    }
  })
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
.text-ellipsis {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.section-title {
  font-weight: bold;
  margin-bottom: 8px;
}
.code-block {
  background-color: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
.message-item {
  margin-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}
.message-item:last-child {
  border-bottom: none;
}
.role {
  color: #409eff;
  font-weight: bold;
}
.output {
  color: #67c23a;
}
</style>
