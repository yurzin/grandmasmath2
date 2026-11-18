<script setup lang="ts">
const { data: collections } = await useFetch<CollectionCard[]>('/api/collections')

useSeoMeta({ title: 'Сборники задач ЕГЭ' })
</script>

<template>
  <div class="max-w-5xl mx-auto p-3 sm:p-6">
    <h1 class="text-xl sm:text-2xl font-semibold text-highlighted">Сборники задач</h1>
    <p class="mt-1 text-sm sm:text-base text-muted">Подробные решения задач ЕГЭ по темам.</p>

    <p v-if="!collections?.length" class="mt-6 text-muted">Сборников пока нет.</p>

    <div class="mt-4 sm:mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2">
      <NuxtLink
          v-for="c in collections"
          :key="c.slug"
          :to="`/collections/${c.slug}`"
          class="group flex flex-col rounded-xl border border-default bg-default p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-book-open" class="flex-none size-6 text-primary"/>
          <h2 class="text-base sm:text-lg font-semibold text-highlighted group-hover:text-primary transition-colors">
            {{ c.title }}
          </h2>
        </div>
        <p v-if="c.description" class="mt-2 text-sm text-muted">{{ c.description }}</p>
        <div class="mt-auto pt-4 flex items-center justify-between text-sm">
          <span class="text-muted">{{ plural(c.taskCount, ['задача', 'задачи', 'задач']) }}</span>
          <span v-if="c.price" class="font-semibold text-highlighted">{{ c.price }} ₽</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
