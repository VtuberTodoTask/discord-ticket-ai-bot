<template>
  <div>
    <h1 class="h4 mb-4 text-white">
      <i class="bi bi-shield-exclamation me-2"></i>モデレーションログ
    </h1>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">読み込み中...</span>
      </div>
    </div>

    <!-- Table -->
    <div v-else-if="logs.length > 0" class="card">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th>日時</th>
              <th>ユーザー</th>
              <th>チャンネル</th>
              <th>違反種別</th>
              <th>重大度</th>
              <th>AI概要</th>
              <th>発言内容</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, i) in logs" :key="i">
              <td class="text-nowrap">{{ formatDate(log.timestamp) }}</td>
              <td>{{ log.userTag }}</td>
              <td>
                <i class="bi bi-hash"></i>{{ log.channelName }}
              </td>
              <td>{{ log.violationType }}</td>
              <td>
                <span
                  class="badge badge-status"
                  :style="{
                    backgroundColor: severityColor(log.severity),
                    color: log.severity === 'low' ? '#000' : '#fff',
                  }"
                >
                  {{ severityLabel(log.severity) }}
                </span>
              </td>
              <td>{{ log.aiSummary }}</td>
              <td
                class="text-truncate"
                style="max-width: 300px;"
                :title="log.messageContent"
              >
                {{ log.messageContent }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="empty-state">
      <i class="bi bi-shield-check fs-1 d-block mb-2"></i>
      モデレーションログはありません
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModerationRecord } from '~/composables/useApi'

const { fetchModeration } = useApi()

const logs = ref<ModerationRecord[]>([])
const loading = ref(true)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
}

function severityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: '#fee75c',
    medium: '#f97316',
    high: '#ed4245',
  }
  return colors[severity] ?? '#666'
}

function severityLabel(severity: string): string {
  const labels: Record<string, string> = {
    low: '軽微',
    medium: '中程度',
    high: '重大',
  }
  return labels[severity] ?? severity
}

onMounted(async () => {
  try {
    logs.value = await fetchModeration()
  }
  catch (e) {
    console.error('Failed to load moderation logs:', e)
  }
  finally {
    loading.value = false
  }
})
</script>
