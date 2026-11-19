<script setup lang="ts">
// Сюда возвращает ЮKassa после оплаты. Статус проверяем у сервера, пока он не определится.
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Оплата', robots: 'noindex' })

const route = useRoute()
const { data: purchase, refresh, error } = await useFetch<PurchaseItem>(() => `/api/purchases/${route.params.id}`)

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' })
const gaveUp = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let attempts = 0

function poll() {
  if (purchase.value?.status !== 'pending') return
  if (++attempts > 30) {
    gaveUp.value = true
    return
  }
  timer = setTimeout(async () => {
    await refresh()
    poll()
  }, 2000)
}

onMounted(poll)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="max-w-lg mx-auto p-4 sm:p-10">
    <div class="rounded-xl border border-default card-surface p-6 text-center space-y-3">
      <template v-if="error || !purchase">
        <UIcon name="i-lucide-search-x" class="size-10 text-dimmed"/>
        <p class="text-muted">Покупка не найдена</p>
      </template>

      <template v-else-if="purchase.status === 'succeeded'">
        <UIcon name="i-lucide-circle-check" class="size-12 text-success"/>
        <h1 class="text-lg font-semibold text-highlighted">Оплата прошла</h1>
        <template v-if="purchase.collection">
          <p class="text-sm text-muted">Сборник «{{ purchase.collection.title }}» ваш: решения открыты на сайте, PDF можно скачать.</p>
          <div class="flex flex-col sm:flex-row justify-center gap-2 pt-2">
            <UButton :to="`/api/purchases/${purchase.id}/download`" external icon="i-lucide-download">Скачать PDF</UButton>
            <UButton :to="`/collections/${purchase.collection.slug}`" color="neutral" variant="outline">К сборнику</UButton>
          </div>
        </template>
        <template v-else>
          <p class="text-sm text-muted">
            Подписка действует
            <template v-if="purchase.accessFrom && purchase.accessUntil">
              с {{ dateFormat.format(new Date(purchase.accessFrom)) }} по {{ dateFormat.format(new Date(purchase.accessUntil)) }}
            </template>:
            открыты все сборники, решения и PDF.
          </p>
          <UButton to="/collections" icon="i-lucide-book-open">К сборникам</UButton>
        </template>
      </template>

      <template v-else-if="purchase.status === 'canceled'">
        <UIcon name="i-lucide-circle-x" class="size-12 text-error"/>
        <h1 class="text-lg font-semibold text-highlighted">Оплата не прошла</h1>
        <p class="text-sm text-muted">Деньги не списаны. Можно попробовать ещё раз.</p>
        <UButton :to="purchase.collection ? `/collections/${purchase.collection.slug}` : '/subscription'">Вернуться</UButton>
      </template>

      <template v-else>
        <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-primary"/>
        <h1 class="text-lg font-semibold text-highlighted">Проверяем оплату…</h1>
        <p v-if="!gaveUp" class="text-sm text-muted">Обычно это занимает несколько секунд.</p>
        <template v-else>
          <p class="text-sm text-muted">Банк ещё не подтвердил платёж. Как только подтвердит, покупка появится в кабинете.</p>
          <div class="flex flex-col sm:flex-row justify-center gap-2">
            <UButton to="/account">Мои покупки</UButton>
            <UButton v-if="purchase.confirmationUrl" :to="purchase.confirmationUrl" external color="neutral" variant="outline">
              Вернуться к оплате
            </UButton>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
