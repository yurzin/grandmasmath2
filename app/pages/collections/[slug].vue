<script setup lang="ts">
const route = useRoute()
const { loggedIn } = useUserSession()

const { data: collection } = await useFetch<CollectionDetail>(() => `/api/collections/${route.params.slug}`)

useSeoMeta({
  title: () => collection.value?.title ?? 'Сборник не найден',
  description: () => collection.value?.description ?? undefined,
})

const purchased = computed(() => Boolean(collection.value?.purchaseId))
const subscribed = computed(() => Boolean(collection.value?.subscriptionUntil))
const hasAccess = computed(() => purchased.value || subscribed.value)
const solvedCount = computed(() => collection.value?.tasks.filter(t => t.solved).length ?? 0)
const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' })
const agree = ref(false)
const buying = ref(false)
const buyError = ref('')

async function buy() {
  if (!collection.value) return
  if (!loggedIn.value) {
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  buyError.value = ''
  buying.value = true
  try {
    const { confirmationUrl } = await $fetch<{ purchaseId: number, confirmationUrl: string }>('/api/purchases', {
      method: 'POST',
      body: { collectionId: collection.value.id, agree: agree.value },
    })
    // ЮKassa — внешний адрес, тестовая оплата — внутренний.
    await navigateTo(confirmationUrl, { external: /^https?:\/\//.test(confirmationUrl) })
  } catch (e) {
    buyError.value = errorMessage(e, 'Не удалось перейти к оплате')
    buying.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
    <UButton
        to="/collections"
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
        class="mb-3 sm:mb-4"
    >
      Все сборники
    </UButton>

    <template v-if="collection">
      <h1 class="font-display text-2xl sm:text-4xl font-semibold uppercase text-highlighted text-balance">{{ collection.title }}</h1>
      <p v-if="collection.description" class="mt-2 text-sm sm:text-base text-muted">{{ collection.description }}</p>
      <p class="mt-2 text-sm text-muted">
        {{ plural(collection.tasks.length, ['задача', 'задачи', 'задач']) }}
        <template v-if="solvedCount"> · решено {{ solvedCount }}</template>
      </p>

      <!-- Покупка -->
      <div class="mt-5 rounded-xl border border-default card-surface-alt p-4 sm:p-5">
        <div v-if="hasAccess" class="flex flex-col sm:flex-row sm:items-center gap-3">
          <UIcon name="i-lucide-circle-check" class="size-6 text-success flex-none"/>
          <p class="flex-1 text-sm sm:text-base text-muted">
            <template v-if="purchased">Сборник куплен: решения открыты, PDF всегда в вашем кабинете.</template>
            <template v-else>
              Открыто по подписке до {{ dateFormat.format(new Date(collection.subscriptionUntil!)) }}: решения, проверка ответов и PDF.
            </template>
          </p>
          <UButton :to="`/api/collections/${collection.slug}/download`" external icon="i-lucide-download">Скачать PDF</UButton>
        </div>

        <div v-else-if="collection.price" class="space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="flex-1">
              <p class="font-display text-3xl font-semibold text-highlighted">{{ collection.price }} ₽</p>
              <p class="text-xs text-muted">PDF со всеми решениями и доступ к решениям на сайте</p>
            </div>
            <UButton size="lg" icon="i-lucide-shopping-cart" :loading="buying" :disabled="!agree" @click="buy">
              Купить
            </UButton>
          </div>
          <UCheckbox v-model="agree">
            <template #label>
              <span class="text-sm text-muted">
                Принимаю условия <NuxtLink to="/offer" target="_blank" class="text-primary underline">оферты</NuxtLink>
                и согласен на обработку персональных данных по
                <NuxtLink to="/privacy" target="_blank" class="text-primary underline">политике</NuxtLink>
              </span>
            </template>
          </UCheckbox>
          <UAlert v-if="buyError" color="error" variant="subtle" :title="buyError" icon="i-lucide-circle-alert"/>
        </div>

        <p v-else class="text-sm text-muted">Скоро в продаже.</p>

        <p v-if="!hasAccess" class="mt-3 border-t border-default pt-3 text-sm text-muted">
          Или <NuxtLink to="/subscription" class="text-primary underline">подписка на все сборники</NuxtLink> —
          решения, проверка ответов и PDF всех сборников на выбранный срок.
        </p>
      </div>

      <h2 class="mt-8 font-display text-xl font-semibold uppercase text-highlighted">Варианты</h2>
      <ol class="mt-3 grid gap-2 sm:grid-cols-2">
        <li v-for="t in collection.tasks" :key="t.id">
          <NuxtLink
              :to="`/tasks/${t.id}`"
              class="group flex h-full items-center gap-3 rounded-lg border border-default card-surface px-3 py-2.5 transition-colors hover:border-accented hover:bg-elevated/60"
              :class="t.solved ? 'border-success/40' : ''"
          >
            <span
                class="flex-none grid place-items-center size-9 rounded-md font-display text-base font-semibold tabular-nums"
                :class="t.solved ? 'bg-success/15 text-success' : 'bg-muted text-highlighted'"
            >{{ t.position }}</span>
            <span class="flex-1 min-w-0 text-sm text-highlighted group-hover:text-primary transition-colors">{{ t.title ?? `Вариант ${t.position}` }}</span>
            <UIcon v-if="t.solved" name="i-lucide-circle-check" class="flex-none size-5 text-success" aria-label="Решено"/>
            <span v-else-if="t.isFree" class="flex-none text-xs font-medium text-success">бесплатно</span>
            <UIcon v-else-if="!hasAccess" name="i-lucide-lock" class="flex-none size-4 text-dimmed" aria-label="Решение в платной части"/>
          </NuxtLink>
        </li>
      </ol>
    </template>

    <div v-else class="flex flex-col items-center gap-3 py-12 sm:py-16 text-center">
      <UIcon name="i-lucide-search-x" class="size-10 text-dimmed"/>
      <p class="text-muted">Сборник не найден</p>
    </div>
  </div>
</template>
