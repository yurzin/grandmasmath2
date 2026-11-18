<script setup lang="ts">
const route = useRoute()
const { loggedIn } = useUserSession()

const { data: collection } = await useFetch<CollectionDetail>(() => `/api/collections/${route.params.slug}`)

useSeoMeta({
  title: () => collection.value?.title ?? 'Сборник не найден',
  description: () => collection.value?.description ?? undefined,
})

const purchased = computed(() => Boolean(collection.value?.purchaseId))
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
  <div class="max-w-3xl mx-auto p-3 sm:p-6">
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
      <h1 class="text-xl sm:text-2xl font-semibold text-highlighted">{{ collection.title }}</h1>
      <p v-if="collection.description" class="mt-2 text-sm sm:text-base text-muted">{{ collection.description }}</p>
      <p class="mt-2 text-sm text-muted">{{ plural(collection.tasks.length, ['задача', 'задачи', 'задач']) }}</p>

      <!-- Покупка -->
      <div class="mt-4 rounded-xl border border-default bg-default p-4 sm:p-5">
        <div v-if="purchased" class="flex flex-col sm:flex-row sm:items-center gap-3">
          <UIcon name="i-lucide-circle-check" class="size-6 text-success flex-none"/>
          <p class="flex-1 text-sm sm:text-base text-muted">Сборник куплен: решения открыты, PDF в вашем кабинете.</p>
          <UButton :to="`/api/purchases/${collection.purchaseId}/download`" external icon="i-lucide-download">Скачать PDF</UButton>
        </div>

        <div v-else-if="collection.price" class="space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="flex-1">
              <p class="text-2xl font-semibold text-highlighted">{{ collection.price }} ₽</p>
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
      </div>

      <ol class="mt-5 sm:mt-6 divide-y divide-default rounded-xl border border-default bg-default overflow-hidden">
        <li v-for="t in collection.tasks" :key="t.id">
          <NuxtLink
              :to="`/tasks/${t.id}`"
              class="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors hover:bg-elevated"
          >
            <span class="flex-none w-20 text-xs sm:text-sm text-dimmed">Вариант {{ t.position }}</span>
            <span class="flex-1 text-sm sm:text-base text-highlighted">{{ t.title }}</span>
            <UBadge v-if="t.isFree" color="success" variant="subtle" size="sm">бесплатно</UBadge>
            <UIcon v-else-if="!purchased" name="i-lucide-lock" class="flex-none size-4 text-dimmed" aria-label="Решение в платной части"/>
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
