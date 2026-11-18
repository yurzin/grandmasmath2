<script setup lang="ts">
// Вход по ссылке из письма.
useSeoMeta({ title: 'Вход', robots: 'noindex' })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()
const error = ref('')

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  const r = route.query.redirect
  const redirect = typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/account'
  try {
    await $fetch('/api/auth/email/verify', { method: 'POST', body: { token } })
    await refreshSession()
    await navigateTo(redirect, { replace: true })
  } catch (e) {
    error.value = errorMessage(e, 'Не удалось войти по ссылке')
  }
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 p-10 text-center">
    <template v-if="error">
      <UIcon name="i-lucide-link-2-off" class="size-10 text-dimmed"/>
      <p class="text-muted">{{ error }}</p>
      <UButton to="/login">Войти заново</UButton>
    </template>
    <template v-else>
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary"/>
      <p class="text-muted">Входим…</p>
    </template>
  </div>
</template>
