<script setup lang="ts">
useSeoMeta({
  title: 'Подписка на все сборники',
  description: 'Доступ ко всем сборникам задач ЕГЭ: подробные решения, проверка ответов и PDF.',
})

const route = useRoute()
const { loggedIn } = useUserSession()
const { data: info } = await useFetch<SubscriptionInfo>('/api/subscriptions')

const agree = ref(false)
const buyingPlan = ref<number | null>(null)
const error = ref('')
const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' })

// Выгода длинного срока относительно помесячной цены.
const monthly = computed(() => info.value?.plans.find(p => p.months === 1)?.price ?? null)
const saving = (p: { months: number, price: number }) =>
  monthly.value && p.months > 1 ? Math.round((1 - p.price / (monthly.value * p.months)) * 100) : 0

async function subscribe(planId: number) {
  if (!loggedIn.value) {
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  error.value = ''
  buyingPlan.value = planId
  try {
    const { confirmationUrl } = await $fetch<{ confirmationUrl: string }>('/api/subscriptions', {
      method: 'POST',
      body: { planId, agree: agree.value },
    })
    await navigateTo(confirmationUrl, { external: /^https?:\/\//.test(confirmationUrl) })
  } catch (e) {
    error.value = errorMessage(e, 'Не удалось перейти к оплате')
    buyingPlan.value = null
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-3 sm:p-6">
    <h1 class="text-xl sm:text-2xl font-semibold text-highlighted">Подписка на все сборники</h1>
    <p class="mt-1 text-sm sm:text-base text-muted">
      На выбранный срок открываются все сборники: подробные решения, проверка своих ответов и PDF.
      Без автосписаний — продлить можно в любой момент, новый срок добавится к текущему.
    </p>

    <UAlert
        v-if="info?.activeUntil"
        class="mt-4"
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        :title="`Подписка действует до ${dateFormat.format(new Date(info.activeUntil))}`"
        description="Продление начнётся с этой даты."
    />

    <div v-if="info?.plans.length" class="mt-5 grid gap-3 sm:grid-cols-3">
      <div
          v-for="p in info.plans"
          :key="p.id"
          class="flex flex-col rounded-xl border border-default bg-default p-5"
      >
        <p class="text-sm text-muted">{{ plural(p.months, ['месяц', 'месяца', 'месяцев']) }}</p>
        <p class="mt-1 text-3xl font-semibold text-highlighted">{{ p.price.toLocaleString('ru-RU') }} ₽</p>
        <p class="mt-1 h-5 text-xs text-success">
          <template v-if="saving(p) > 0">выгоднее на {{ saving(p) }}%</template>
        </p>
        <UButton
            class="mt-4 justify-center"
            :disabled="!agree"
            :loading="buyingPlan === p.id"
            @click="subscribe(p.id)"
        >
          {{ info.activeUntil ? 'Продлить' : 'Оформить' }}
        </UButton>
      </div>
    </div>
    <p v-else class="mt-6 text-muted">Подписка скоро появится.</p>

    <div v-if="info?.plans.length" class="mt-4 space-y-3">
      <UCheckbox v-model="agree">
        <template #label>
          <span class="text-sm text-muted">
            Принимаю условия <NuxtLink to="/offer" target="_blank" class="text-primary underline">оферты</NuxtLink>
            и согласен на обработку персональных данных по
            <NuxtLink to="/privacy" target="_blank" class="text-primary underline">политике</NuxtLink>
          </span>
        </template>
      </UCheckbox>
      <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-circle-alert"/>
    </div>
  </div>
</template>
