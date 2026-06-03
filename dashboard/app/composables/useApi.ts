export interface TrackedTicket {
  channelId: string
  channelName: string
  guildId: string
  userId: string
  userTag: string
  category: string
  status: string
  summary: string
  createdAt: string
  updatedAt: string
  escalatedAt: string | null
  messageCount: number
}

export interface TicketStats {
  total: number
  ai_handling: number
  staff_handling: number
  closed: number
  by_category: Record<string, number>
}

export interface ModerationRecord {
  timestamp: string
  guildId: string
  channelId: string
  channelName: string
  userId: string
  userTag: string
  messageContent: string
  violationType: string
  severity: 'low' | 'medium' | 'high'
  aiSummary: string
}

export function useApi() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string

  function getToken(): string | null {
    if (import.meta.client) {
      return localStorage.getItem('dashboard_token')
    }
    return null
  }

  function setToken(token: string) {
    if (import.meta.client) {
      localStorage.setItem('dashboard_token', token)
    }
  }

  function clearToken() {
    if (import.meta.client) {
      localStorage.removeItem('dashboard_token')
    }
  }

  function headers(): Record<string, string> {
    const token = getToken()
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
    return {}
  }

  async function login(token: string): Promise<boolean> {
    try {
      const res = await $fetch<{ success: boolean; token?: string }>(`${apiBase}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { token },
      })
      if (res.success && res.token) {
        setToken(res.token)
        return true
      }
      return res.success
    }
    catch {
      return false
    }
  }

  async function checkAuth(): Promise<boolean> {
    try {
      await $fetch(`${apiBase}/api/auth/check`, { headers: headers() })
      return true
    }
    catch {
      return false
    }
  }

  async function fetchTickets(status = 'open', category = 'all'): Promise<TrackedTicket[]> {
    return await $fetch<TrackedTicket[]>(`${apiBase}/api/tickets`, {
      headers: headers(),
      params: { status, category },
    })
  }

  async function fetchTicket(channelId: string): Promise<TrackedTicket> {
    return await $fetch<TrackedTicket>(`${apiBase}/api/tickets/${channelId}`, {
      headers: headers(),
    })
  }

  async function fetchStats(): Promise<TicketStats> {
    return await $fetch<TicketStats>(`${apiBase}/api/stats`, {
      headers: headers(),
    })
  }

  async function fetchModeration(): Promise<ModerationRecord[]> {
    return await $fetch<ModerationRecord[]>(`${apiBase}/api/moderation`, {
      headers: headers(),
    })
  }

  return {
    getToken,
    setToken,
    clearToken,
    login,
    checkAuth,
    fetchTickets,
    fetchTicket,
    fetchStats,
    fetchModeration,
  }
}
