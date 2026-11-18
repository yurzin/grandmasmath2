<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Мои покупки', robots: 'noindex' })

const { user, clear } = useUserSession()
const { data: purchases } = await useFetch<PurchaseItem[]>('/api/purchases')
const { data: subscription } = await useFetch<SubscriptionInfo>('/api/subscriptions')

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/')
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' })
</script>

<template>
  <div class="max-w-3xl mx-auto p-3 sm:p-6">
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-semibold uppercase text-highlighted text-balance">Мои покупки</h1>
        <p class="text-sm text-muted">{{ user?.email }}</p>
      </div>
      <UButton class="ml-auto" icon="i-lucide-log-out" color="neutral" variant="ghost" @click="logout">Выйти</UButton>
    </div>

    <div
        v-if="subscription?.activeUntil"
        class="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-success/40 bg-default p-4"
    >
      <UIcon name="i-lucide-crown" class="size-6 text-success flex-none"/>
      <p class="flex-1 text-sm sm:text-base">
        Подписка на все сборники до
        <span class="font-medium text-highlighted">{{ dateFormat.format(new Date(subscription.activeUntil)) }}</span>.
        PDF скачиваются на страницах сборников.
      </p>
      <UButton to="/subscription" color="neutral" variant="outline">Продлить</UButton>
    </div>

    <div v-if="!purchases?.length" class="mt-6 rounded-xl border border-default bg-default p-6 text-center">
      <p class="text-muted">Покупок пока нет.</p>
      <UButton to="/collections" class="mt-3" icon="i-lucide-book-open">Смотреть сборники</UButton>
    </div>

    <ul v-else class="mt-5 sm:mt-6 space-y-3">
      <li
          v-for="p in purchases"
          :key="p.id"
          class="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-default bg-default p-4"
      >
        <div class="flex-1 min-w-0">
          <NuxtLink v-if="p.collection" :to="`/collections/${p.collection.slug}`" class="font-medium text-highlighted hover:text-primary">
            {{ p.collection.title }}
          </NuxtLink>
          <span v-else class="font-medium text-highlighted">
            Подписка на все сборники · {{ plural(p.months ?? 0, ['месяц', 'месяца', 'месяцев']) }}
          </span>
          <p class="text-xs text-muted">
            Заказ № {{ p.id }} · {{ p.amount }} ₽ ·
            <template v-if="p.paidAt">оплачен {{ dateFormat.format(new Date(p.paidAt)) }}</template>
            <template v-else>ожидает оплаты</template>
            <template v-if="p.accessFrom && p.accessUntil">
              · период {{ dateFormat.format(new Date(p.accessFrom)) }} — {{ dateFormat.format(new Date(p.accessUntil)) }}
            </template>
          </p>
        </div>
        <UButton
            v-if="p.status === 'succeeded' && p.kind === 'collection'"
            :to="`/api/purchases/${p.id}/download`"
            external
            icon="i-lucide-download"
          >
          Скачать PDF
        </UButton>
        <UButton
            v-else-if="p.confirmationUrl"
            :to="p.confirmationUrl"
            external
            icon="i-lucide-credit-card"
            color="neutral"
            variant="outline"
        >
          Продолжить оплату
        </UButton>
      </li>
    </ul>

    <p v-if="purchases?.some(p => p.status === 'succeeded')" class="mt-4 text-xs text-dimmed">
      В PDF указаны ваш email и номер заказа. Решения купленных сборников открыты и на сайте.
    </p>
    <p v-if="!subscription?.activeUntil && subscription?.plans.length" class="mt-4 text-sm text-muted">
      Нужны все сборники сразу? <NuxtLink to="/subscription" class="text-primary underline">Подписка</NuxtLink>.
    </p>
  </div>
</template>
