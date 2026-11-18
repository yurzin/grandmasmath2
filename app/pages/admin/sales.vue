<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Продажи — админка', robots: 'noindex' })

const toast = useToast()
const { data: plans, refresh: refreshPlans } = await useFetch<AdminPlan[]>('/api/admin/subscription-plans')
const { data: purchases } = await useFetch<AdminPurchase[]>('/api/admin/purchases')

// Правки тарифов — локальная копия, сохраняется кнопкой в строке.
const drafts = ref<Record<number, { price: number, active: boolean }>>({})
watch(plans, (list) => {
  drafts.value = Object.fromEntries((list ?? []).map(p => [p.id, { price: p.price, active: p.active }]))
}, { immediate: true })
const changed = (p: AdminPlan) => drafts.value[p.id]?.price !== p.price || drafts.value[p.id]?.active !== p.active

async function savePlan(p: AdminPlan) {
  try {
    await $fetch(`/api/admin/subscription-plans/${p.id}`, { method: 'PUT', body: { months: p.months, ...drafts.value[p.id] } })
    toast.add({ title: 'Тариф сохранён', color: 'success', icon: 'i-lucide-check' })
    await refreshPlans()
  } catch (e) {
    toast.add({ title: 'Не сохранено', description: errorMessage(e), color: 'error' })
  }
}

const newPlan = reactive({ months: 6, price: 1490 })
async function addPlan() {
  try {
    await $fetch('/api/admin/subscription-plans', { method: 'POST', body: { ...newPlan, active: false } })
    toast.add({ title: 'Тариф добавлен (выключен)', color: 'success' })
    await refreshPlans()
  } catch (e) {
    toast.add({ title: 'Не добавлено', description: errorMessage(e), color: 'error' })
  }
}

const paid = computed(() => (purchases.value ?? []).filter(p => p.status === 'succeeded'))
const revenue = computed(() => paid.value.reduce((sum, p) => sum + p.amount, 0))
const activeSubscribers = computed(() => new Set(paid.value
  .filter(p => p.kind === 'subscription' && p.accessUntil && new Date(p.accessUntil) > new Date())
  .map(p => p.email)).size)

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
const shortDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' })
const statusBadge: Record<AdminPurchase['status'], { label: string, color: 'success' | 'warning' | 'neutral' }> = {
  succeeded: { label: 'оплачено', color: 'success' },
  pending: { label: 'ожидает', color: 'warning' },
  canceled: { label: 'отменено', color: 'neutral' },
}
</script>

<template>
  <UDashboardPanel id="admin-sales">
    <template #header>
      <UDashboardNavbar title="Продажи"/>
    </template>

    <template #body>
      <div class="space-y-6 max-w-6xl">
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border border-default p-4">
            <p class="text-xs text-muted">Оплачено (последние 200 покупок)</p>
            <p class="text-2xl font-semibold text-highlighted">{{ revenue.toLocaleString('ru-RU') }} ₽</p>
          </div>
          <div class="rounded-lg border border-default p-4">
            <p class="text-xs text-muted">Оплаченных покупок</p>
            <p class="text-2xl font-semibold text-highlighted">{{ paid.length }}</p>
          </div>
          <div class="rounded-lg border border-default p-4">
            <p class="text-xs text-muted">Действующих подписчиков</p>
            <p class="text-2xl font-semibold text-highlighted">{{ activeSubscribers }}</p>
          </div>
        </div>

        <section>
          <h2 class="mb-2 font-medium text-highlighted">Тарифы подписки «все сборники»</h2>
          <p class="mb-2 text-sm text-muted">Выключенный тариф не показывается на сайте. Новая цена действует только для новых оплат.</p>
          <div class="overflow-x-auto rounded-lg border border-default">
            <table class="w-full text-sm">
              <thead class="bg-muted text-left text-muted">
                <tr>
                  <th class="px-3 py-2">Срок</th>
                  <th class="px-3 py-2 w-40">Цена, ₽</th>
                  <th class="px-3 py-2 w-36">Продаётся</th>
                  <th class="w-32"/>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="p in plans" :key="p.id">
                  <td class="px-3 py-2 text-highlighted">{{ plural(p.months, ['месяц', 'месяца', 'месяцев']) }}</td>
                  <td class="px-3 py-1.5">
                    <UInput v-if="drafts[p.id]" v-model.number="drafts[p.id]!.price" type="number" min="1" size="sm" class="w-28"/>
                  </td>
                  <td class="px-3 py-1.5">
                    <USwitch v-if="drafts[p.id]" v-model="drafts[p.id]!.active"/>
                  </td>
                  <td class="px-3 py-1.5 text-right">
                    <UButton size="sm" :disabled="!changed(p)" @click="savePlan(p)">Сохранить</UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <form class="mt-2 flex flex-wrap items-end gap-2" @submit.prevent="addPlan">
            <UFormField label="Новый тариф, месяцев">
              <UInput v-model.number="newPlan.months" type="number" min="1" max="36" size="sm" class="w-28"/>
            </UFormField>
            <UFormField label="Цена, ₽">
              <UInput v-model.number="newPlan.price" type="number" min="1" size="sm" class="w-28"/>
            </UFormField>
            <UButton type="submit" size="sm" icon="i-lucide-plus" color="neutral" variant="outline">Добавить</UButton>
          </form>
        </section>

        <section>
          <h2 class="mb-2 font-medium text-highlighted">Последние покупки</h2>
          <div class="overflow-x-auto rounded-lg border border-default">
            <table class="w-full text-sm">
              <thead class="bg-muted text-left text-muted">
                <tr>
                  <th class="px-3 py-2">№</th>
                  <th class="px-3 py-2">Покупатель</th>
                  <th class="px-3 py-2">Что</th>
                  <th class="px-3 py-2 text-right">Сумма</th>
                  <th class="px-3 py-2">Статус</th>
                  <th class="px-3 py-2 hidden md:table-cell">Дата</th>
                  <th class="px-3 py-2 hidden lg:table-cell text-right">Скачиваний</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="p in purchases" :key="p.id">
                  <td class="px-3 py-2 text-dimmed">{{ p.id }}</td>
                  <td class="px-3 py-2">{{ p.email }}</td>
                  <td class="px-3 py-2">
                    <template v-if="p.kind === 'subscription'">
                      Подписка, {{ plural(p.months ?? 0, ['месяц', 'месяца', 'месяцев']) }}
                      <span v-if="p.accessUntil" class="text-xs text-dimmed">до {{ shortDate.format(new Date(p.accessUntil)) }}</span>
                    </template>
                    <template v-else>{{ p.collectionTitle }}</template>
                    <UBadge v-if="p.provider === 'mock'" color="warning" variant="outline" size="sm" class="ml-1">тест</UBadge>
                  </td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">{{ p.amount }} ₽</td>
                  <td class="px-3 py-2"><UBadge :color="statusBadge[p.status].color" variant="subtle" size="sm">{{ statusBadge[p.status].label }}</UBadge></td>
                  <td class="px-3 py-2 hidden md:table-cell text-dimmed">{{ dateFormat.format(new Date(p.paidAt ?? p.createdAt)) }}</td>
                  <td class="px-3 py-2 hidden lg:table-cell text-right text-muted">{{ p.downloadCount }}</td>
                </tr>
                <tr v-if="!purchases?.length">
                  <td colspan="7" class="px-3 py-8 text-center text-muted">Покупок пока нет</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
