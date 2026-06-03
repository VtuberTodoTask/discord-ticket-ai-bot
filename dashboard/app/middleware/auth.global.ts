export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const { checkAuth, getToken } = useApi()

  const token = getToken()
  if (!token) {
    try {
      const ok = await checkAuth()
      if (ok) return
    }
    catch {
      // no auth required (token not set on server)
      return
    }
    return navigateTo('/login')
  }

  try {
    const ok = await checkAuth()
    if (!ok) {
      return navigateTo('/login')
    }
  }
  catch {
    return navigateTo('/login')
  }
})
