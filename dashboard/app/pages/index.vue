<template>
  <div>
    <h1 class="h4 mb-4 text-white">
      <i class="bi bi-list-task me-2"></i>チケット一覧
    </h1>

    <!-- Stats -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <StatCard label="AI対応中" :value="stats?.ai_handling ?? 0" color="#5865f2" />
      </div>
      <div class="col-6 col-md-3">
        <StatCard label="運営対応中" :value="stats?.staff_handling ?? 0" color="#f97316" />
      </div>
      <div class="col-6 col-md-3">
        <StatCard label="クローズ" :value="stats?.closed ?? 0" color="#57f287" />
      </div>
      <div class="col-6 col-md-3">
        <StatCard label="合計" :value="stats?.total ?? 0" color="#a0a0b8" />
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-3 d-flex flex-wrap gap-2 align-items-center">
      <span class="text-secondary small me-1">ステータス:</span>
      <button
        v-for="s in statusOptions"
        :key="s.value"
        class="btn btn-sm btn-filter"
        :class="{ active: statusFilter === s.value }"
        @click="statusFilter = s.value"
      >
        {{ s.label }}
      </button>
    </div>
    <div class="mb-4 d-flex flex-wrap gap-2 align-items-center">
      <span class="text-secondary small me-1">カテゴリ:</span>
      <button
        v-for="c in categoryOptions"
        :key="c.value"
        class="btn btn-sm btn-filter"
        :class="{ active: categoryFilter === c.value }"
        @click="categoryFilter = c.value"
      >
        {{ c.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">読み込み中...</span>
      </div>
    </div>

    <!-- Table -->
    <TicketTable v-else :tickets="tickets" />
  </div>
</template>

<script setup lang="ts">
import type { TrackedTicket, TicketStats } from '~/composables/useApi'

const { fetchTickets, fetchStats } = useApi()

const statusFilter = ref('open')
const categoryFilter = ref('all')
const tickets = ref<TrackedTicket[]>([])
const stats = ref<TicketStats | null>(null)
const loading = ref(true)

const statusOptions = [
  { value: 'open', label: 'オープン' },
  { value: 'ai_handling', label: 'AI対応中' },
  { value: 'staff_handling', label: '運営対応中' },
  { value: 'closed', label: 'クローズ' },
  { value: 'all', label: 'すべて' },
]

const categoryOptions = [
  { value: 'all', label: 'すべて' },
  { value: 'お気持ち', label: '💭 お気持ち' },
  { value: '提案', label: '💡 提案' },
  { value: '質問', label: '❓ 質問' },
]

async function load() {
  loading.value = true
  try {
    const [t, s] = await Promise.all([
      fetchTickets(statusFilter.value, categoryFilter.value),
      fetchStats(),
    ])
    tickets.value = t
    stats.value = s
  }
  catch (e) {
    console.error('Failed to load tickets:', e)
  }
  finally {
    loading.value = false
  }
}

watch([statusFilter, categoryFilter], () => load())

onMounted(() => load())
</script>
