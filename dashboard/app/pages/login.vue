<template>
  <div class="login-wrapper">
    <div class="card" style="max-width: 400px; width: 100%;">
      <div class="card-body p-4">
        <h1 class="h5 text-center mb-4" style="color: #5865f2;">
          <i class="bi bi-ticket-perforated me-2"></i>Ticket Dashboard
        </h1>
        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <input
              v-model="token"
              type="password"
              class="form-control"
              placeholder="アクセストークンを入力"
              required
            />
          </div>
          <div v-if="error" class="alert alert-danger py-2 small">
            トークンが正しくありません
          </div>
          <button type="submit" class="btn w-100" style="background: #5865f2; color: #fff;" :disabled="submitting">
            <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
            ログイン
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { login } = useApi()
const router = useRouter()

const token = ref('')
const error = ref(false)
const submitting = ref(false)

async function handleLogin() {
  submitting.value = true
  error.value = false
  const success = await login(token.value)
  if (success) {
    router.push('/')
  }
  else {
    error.value = true
  }
  submitting.value = false
}
</script>
