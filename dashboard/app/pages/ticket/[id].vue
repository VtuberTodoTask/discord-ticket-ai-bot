<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">読み込み中...</span>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else-if="!ticket" class="empty-state">
      <i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i>
      チケットが見つかりません
      <div class="mt-3">
        <NuxtLink to="/" class="btn btn-outline-primary btn-sm">
          <i class="bi bi-arrow-left me-1"></i>一覧に戻る
        </NuxtLink>
      </div>
    </div>

    <!-- Detail -->
    <div v-else>
      <div class="d-flex align-items-center mb-4">
        <NuxtLink to="/" class="btn btn-outline-secondary btn-sm me-3">
          <i class="bi bi-arrow-left"></i>
        </NuxtLink>
        <h1 class="h4 mb-0 text-white">
          <i class="bi bi-hash me-1"></i>{{ ticket.channelName }}
        </h1>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-6 col-lg-3">
          <div class="detail-card">
            <div class="label">ステータス</div>
            <div>
              <span class="badge badge-status" :style="{ backgroundColor: statusColor(ticket.status) }">
                {{ statusLabel(ticket.status) }}
              </span>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="detail-card">
            <div class="label">カテゴリ</div>
            <div>{{ categoryEmoji(ticket.category) }} {{ ticket.category || '未分類' }}</div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="detail-card">
            <div class="label">ユーザー</div>
            <div>{{ ticket.userTag }}</div>
            <div class="text-secondary small">{{ ticket.userId }}</div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="detail-card">
            <div class="label">メッセージ数</div>
            <div class="fs-4 fw-bold">{{ ticket.messageCount }}</div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="detail-card">
            <div class="label">作成日時</div>
            <div>{{ formatDate(ticket.createdAt) }}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="detail-card">
            <div class="label">最終更新</div>
            <div>{{ formatDate(ticket.updatedAt) }}</div>
            <div class="text-secondary small">{{ elapsed(ticket.updatedAt) }}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="detail-card">
            <div class="label">エスカレーション日時</div>
            <div>{{ ticket.escalatedAt ? formatDate(ticket.escalatedAt) : '—' }}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <i class="bi bi-card-text me-2"></i>概要
        </div>
        <div class="card-body">
          <p class="mb-0">{{ ticket.summary || '（なし）' }}</p>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-header">
          <i class="bi bi-info-circle me-2"></i>メタデータ
        </div>
        <div class="card-body">
          <table class="table table-sm mb-0">
            <tbody>
              <tr>
                <td class="text-secondary" style="width: 200px;">チャンネルID</td>
                <td><code>{{ ticket.channelId }}</code></td>
              </tr>
              <tr>
                <td class="text-secondary">ギルドID</td>
                <td><code>{{ ticket.guildId }}</code></td>
              </tr>
              <tr>
                <td class="text-secondary">ユーザーID</td>
                <td><code>{{ ticket.userId }}</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TrackedTicket } from '~/composables/useApi'

const route = useRoute()
const { fetchTicket } = useApi()

const ticket = ref<TrackedTicket | null>(null)
const loading = ref(true)

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

onMounted(async () => {
  try {
    ticket.value = await fetchTicket(route.params.id as string)
  }
  catch {
    ticket.value = null
  }
  finally {
    loading.value = false
  }
})
</script>
