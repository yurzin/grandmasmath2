<script setup lang="ts">
useSeoMeta({
  title: 'Подписка и доступ к решениям',
  description: 'Доступ ко всем решениям задач ЕГЭ: на день или неделю — на сайте, по подписке — с PDF всех сборников.',
})

const route = useRoute()
const { loggedIn } = useUserSession()
const { data: info } = await useFetch<SubscriptionInfo>('/api/subscriptions')

// Откуда пришли (например, с закрытой задачи) — туда и вернём после оплаты.
const next = computed(() => (isSafeNextPath(route.query.next) ? route.query.next : undefined))

const agree = ref(false)
const buyingPlan = ref<number | null>(null)
const error = ref('')
const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' })
const dateTimeFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

// Выгода длинного срока относительно помесячной цены.
const monthly = computed(() => info.value?.plans.find(p => p.months === 1)?.price ?? null)
const saving = (p: { months: number, price: number }) =>
  monthly.value && p.months > 1 ? Math.round((1 - p.price / (monthly.value * p.months)) * 100) : 0

const hasOffers = computed(() => Boolean(info.value?.plans.length || info.value?.passes.length))

async function buy(planId: number) {
  if (!loggedIn.value) {
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  error.value = ''
  buyingPlan.value = planId
  try {
    const { confirmationUrl } = await $fetch<{ confirmationUrl: string }>('/api/subscriptions', {
      method: 'POST',
      body: { planId, agree: agree.value, next: next.value },
    })
    await navigateTo(confirmationUrl, { external: /^https?:\/\//.test(confirmationUrl) })
  } catch (e) {
    error.value = errorMessage(e, 'Не удалось перейти к оплате')
    buyingPlan.value = null
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
    <h1 class="font-display text-2xl sm:text-3xl font-semibold uppercase text-highlighted text-balance">Доступ к решениям</h1>
    <p class="mt-1 text-sm sm:text-base text-muted">
      Без автосписаний: срок не продлевается сам, продлить можно в любой момент — новый срок добавится к текущему.
    </p>

    <UAlert
        v-if="info?.activeUntil"
        class="mt-4"
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        :title="`Подписка действует до ${dateFormat.format(new Date(info.activeUntil))}`"
        description="Все решения и PDF открыты. Продление начнётся с этой даты."
    />
    <UAlert
        v-else-if="info?.passUntil"
        class="mt-4"
        color="success"
        variant="subtle"
        icon="i-lucide-timer"
        :title="`Короткий доступ действует до ${dateTimeFormat.format(new Date(info.passUntil))}`"
        description="Решения открыты на сайте. Продление начнётся с этого момента."
    />

    <!-- Короткий доступ -->
    <section v-if="info?.passes.length" id="pass" class="mt-6">
      <h2 class="font-display text-xl font-semibold uppercase text-highlighted">Нужно прямо сейчас</h2>
      <p class="mt-1 text-sm text-muted">
        Все решения и проверка ответов на сайте. Без PDF. Удобно, если нужно разобрать несколько задач перед контрольной.
      </p>
      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <div
            v-for="p in info.passes"
            :key="p.id"
            class="flex flex-col rounded-xl border border-default card-surface-alt p-5"
        >
          <p class="text-sm text-muted">{{ plural(p.days, ['день', 'дня', 'дней']) }}</p>
          <p class="mt-1 font-display text-4xl font-semibold text-highlighted">{{ p.price.toLocaleString('ru-RU') }} ₽</p>
          <p class="mt-1 h-5 text-xs text-muted">
            <template v-if="p.dailyLimit">до {{ p.dailyLimit }} решений в сутки</template>
          </p>
          <UButton
              class="mt-4 justify-center"
              :disabled="!agree || Boolean(info.activeUntil)"
              :loading="buyingPlan === p.id"
              @click="buy(p.id)"
          >
            {{ info.passUntil ? 'Продлить' : 'Открыть доступ' }}
          </UButton>
        </div>
      </div>
    </section>

    <!-- Подписка -->
    <section v-if="info?.plans.length" class="mt-8">
      <h2 class="font-display text-xl font-semibold uppercase text-highlighted">Подписка на все сборники</h2>
      <p class="mt-1 text-sm text-muted">
        Все сборники на выбранный срок: подробные решения без ограничений, проверка своих ответов и PDF.
      </p>
      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <div
            v-for="p in info.plans"
            :key="p.id"
            class="flex flex-col rounded-xl border border-default card-surface p-5"
        >
          <p class="text-sm text-muted">{{ plural(p.months, ['месяц', 'месяца', 'месяцев']) }}</p>
          <p class="mt-1 font-display text-4xl font-semibold text-highlighted">{{ p.price.toLocaleString('ru-RU') }} ₽</p>
          <p class="mt-1 h-5 text-xs text-success">
            <template v-if="saving(p) > 0">выгоднее на {{ saving(p) }}%</template>
          </p>
          <UButton
              class="mt-4 justify-center"
              :disabled="!agree"
              :loading="buyingPlan === p.id"
              @click="buy(p.id)"
          >
            {{ info.activeUntil ? 'Продлить' : 'Оформить' }}
          </UButton>
        </div>
      </div>
    </section>

    <p v-if="!hasOffers" class="mt-6 text-muted">Подписка скоро появится.</p>

    <div v-if="hasOffers" class="mt-5 space-y-3">
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
