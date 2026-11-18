<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({ title: 'Вход в админку', robots: 'noindex' })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()

const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: form })
    await refreshSession()
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin')
      ? route.query.redirect
      : '/admin/tasks'
    await navigateTo(redirect)
  } catch (e) {
    error.value = errorMessage(e, 'Не удалось войти')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-muted p-4">
    <form class="w-full max-w-sm space-y-4 rounded-xl border border-default bg-default p-6 shadow-sm" @submit.prevent="submit">
      <div class="flex items-center gap-2 text-lg font-semibold text-highlighted">
        <UIcon name="i-lucide-shield" class="size-5 text-primary"/>
        Вход в админку
      </div>

      <UFormField label="Email">
        <UInput v-model="form.email" type="email" autocomplete="username" required class="w-full"/>
      </UFormField>
      <UFormField label="Пароль">
        <UInput v-model="form.password" type="password" autocomplete="current-password" required class="w-full"/>
      </UFormField>

      <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-circle-alert"/>

      <UButton type="submit" block :loading="loading">Войти</UButton>
    </form>
  </div>
</template>
