<template>
  <div class="card">
    <div class="table-responsive">
      <table class="table table-hover mb-0">
        <thead>
          <tr>
            <th>チャンネル</th>
            <th>ステータス</th>
            <th>カテゴリ</th>
            <th>ユーザー</th>
            <th>概要</th>
            <th>メッセージ数</th>
            <th>最終更新</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ticket in tickets" :key="ticket.channelId">
            <td>
              <NuxtLink :to="`/ticket/${ticket.channelId}`" class="ticket-link">
                <i class="bi bi-hash"></i>{{ ticket.channelName }}
              </NuxtLink>
            </td>
            <td>
              <span class="badge badge-status" :style="{ backgroundColor: statusColor(ticket.status) }">
                {{ statusLabel(ticket.status) }}
              </span>
            </td>
            <td>
              <span v-if="ticket.category">
                {{ categoryEmoji(ticket.category) }} {{ ticket.category }}
              </span>
              <span v-else class="text-secondary">未分類</span>
            </td>
            <td>{{ ticket.userTag }}</td>
            <td class="text-truncate" style="max-width: 300px;">
              {{ ticket.summary || '（なし）' }}
            </td>
            <td>
              <span class="badge bg-secondary">{{ ticket.messageCount }}</span>
            </td>
            <td :title="formatDate(ticket.updatedAt)">
              {{ elapsed(ticket.updatedAt) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="tickets.length === 0" class="empty-state">
      <i class="bi bi-inbox fs-1 d-block mb-2"></i>
      該当するチケットはありません
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TrackedTicket } from '~/composables/useApi'

defineProps<{
  tickets: TrackedTicket[]
}>()

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    ai_handling: '#5865f2',
    staff_handling: '#f97316',
    closed: '#57f287',
  }
  return colors[status] ?? '#666'
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ai_handling: 'AI対応中',
    staff_handling: '運営対応中',
    closed: 'クローズ',
  }
  return labels[status] ?? status
}

function categoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    'お気持ち': '💭',
    '提案': '💡',
    '質問': '❓',
  }
  return emojis[category] ?? '📋'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
}

function elapsed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}分前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}
</script>
