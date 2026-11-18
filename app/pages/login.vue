<script setup lang="ts">
useSeoMeta({ title: 'Вход', robots: 'noindex' })

const route = useRoute()
const { loggedIn, fetch: refreshSession } = useUserSession()

const redirect = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/account'
})

if (loggedIn.value) await navigateTo(redirect.value, { replace: true })

const step = ref<'email' | 'code'>('email')
const email = ref('')
const code = ref('')
const loading = ref(false)
const error = ref('')

async function sendCode() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/email/start', { method: 'POST', body: { email: email.value, redirect: redirect.value } })
    step.value = 'code'
  } catch (e) {
    error.value = errorMessage(e, 'Не удалось отправить письмо')
  } finally {
    loading.value = false
  }
}

async function verify() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/email/verify', { method: 'POST', body: { email: email.value, code: code.value } })
    await refreshSession()
    await navigateTo(redirect.value, { replace: true })
  } catch (e) {
    error.value = errorMessage(e, 'Не удалось войти')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex justify-center p-4 sm:p-10">
    <div class="w-full max-w-sm rounded-xl border border-default bg-default p-5 sm:p-6 shadow-sm">
      <h1 class="text-lg font-semibold text-highlighted">Вход</h1>

      <form v-if="step === 'email'" class="mt-4 space-y-4" @submit.prevent="sendCode">
        <p class="text-sm text-muted">Пароль не нужен: пришлём на почту код для входа.</p>
        <UFormField label="Email">
          <UInput v-model="email" type="email" autocomplete="email" required autofocus class="w-full"/>
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-circle-alert"/>
        <UButton type="submit" block :loading="loading">Получить код</UButton>
      </form>

      <form v-else class="mt-4 space-y-4" @submit.prevent="verify">
        <p class="text-sm text-muted">
          Отправили код на <span class="font-medium text-highlighted">{{ email }}</span>.
          Введите его или откройте ссылку из письма.
        </p>
        <UFormField label="Код из письма">
          <UInput
              v-model="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              required
              autofocus
              class="w-full"
              :ui="{ base: 'text-center text-lg tracking-[0.4em] font-mono' }"
          />
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-circle-alert"/>
        <UButton type="submit" block :loading="loading">Войти</UButton>
        <UButton color="neutral" variant="ghost" block @click="step = 'email'; code = ''; error = ''">
          Другой адрес или отправить снова
        </UButton>
      </form>
    </div>
  </div>
</template>
