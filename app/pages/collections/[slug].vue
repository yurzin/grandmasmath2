<script setup lang="ts">
const route = useRoute()

const { data: collection } = await useFetch<CollectionDetail>(() => `/api/collections/${route.params.slug}`)

useSeoMeta({
  title: () => collection.value?.title ?? 'Сборник не найден',
  description: () => collection.value?.description ?? undefined,
})
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
      <p class="mt-2 text-sm text-muted">
        {{ plural(collection.tasks.length, ['задача', 'задачи', 'задач']) }}<template v-if="collection.price"> · {{ collection.price }} ₽</template>
      </p>

      <ol class="mt-5 sm:mt-6 divide-y divide-default rounded-xl border border-default bg-default overflow-hidden">
        <li v-for="t in collection.tasks" :key="t.id">
          <NuxtLink
              :to="`/tasks/${t.id}`"
              class="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors hover:bg-elevated"
          >
            <span class="flex-none w-20 text-xs sm:text-sm text-dimmed">Вариант {{ t.position }}</span>
            <span class="flex-1 text-sm sm:text-base text-highlighted">{{ t.title }}</span>
            <UBadge v-if="t.isFree" color="success" variant="subtle" size="sm">бесплатно</UBadge>
            <UIcon v-else name="i-lucide-lock" class="flex-none size-4 text-dimmed" aria-label="Решение в платной части"/>
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
