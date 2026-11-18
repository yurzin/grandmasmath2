<script setup lang="ts">
// Имитация страницы оплаты ЮKassa — только в режиме разработки, когда ключи ЮKassa не заданы.
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Тестовая оплата', robots: 'noindex' })
if (!import.meta.dev) throw createError({ statusCode: 404, fatal: true })

const route = useRoute()
const paymentId = String(route.query.payment ?? '')
const purchaseId = String(route.query.purchase ?? '')
const loading = ref(false)
const error = ref('')

async function finish(state: 'succeeded' | 'canceled') {
  loading.value = true
  try {
    await $fetch('/api/purchases/mock-pay', { method: 'POST', body: { paymentId, state } })
    await navigateTo(`/purchases/${purchaseId}`)
  } catch (e) {
    error.value = errorMessage(e, 'Ошибка тестовой оплаты')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto p-4 sm:p-10">
    <div class="rounded-xl border-2 border-dashed border-warning bg-default p-6 space-y-4 text-center">
      <UBadge color="warning" variant="subtle">Тестовый режим</UBadge>
      <h1 class="text-lg font-semibold text-highlighted">Имитация оплаты</h1>
      <p class="text-sm text-muted">
        Ключи ЮKassa не заданы, поэтому вместо настоящей оплаты — эта страница.
        Деньги не списываются. В продакшене её нет.
      </p>
      <UAlert v-if="error" color="error" variant="subtle" :title="error"/>
      <div class="flex flex-col sm:flex-row justify-center gap-2">
        <UButton color="success" icon="i-lucide-check" :loading="loading" @click="finish('succeeded')">Оплатить</UButton>
        <UButton color="neutral" variant="outline" :loading="loading" @click="finish('canceled')">Отменить</UButton>
      </div>
    </div>
  </div>
</template>
