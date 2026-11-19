<script setup lang="ts">
defineProps<{ collection: CollectionCard }>()
</script>

<template>
  <NuxtLink
      :to="`/collections/${collection.slug}`"
      class="group flex flex-col rounded-xl border border-default card-surface p-4 sm:p-5 transition-all hover:-translate-y-0.5 hover:border-accented hover:shadow-md"
  >
    <div class="flex items-start gap-3">
      <span class="flex-none grid place-items-center size-10 rounded-lg bg-secondary/10 text-secondary">
        <UIcon name="i-lucide-book-open" class="size-5"/>
      </span>
      <div class="min-w-0">
        <h3 class="text-base sm:text-lg font-semibold text-highlighted group-hover:text-primary transition-colors">
          {{ collection.title }}
        </h3>
        <p class="text-sm text-muted">{{ plural(collection.taskCount, ['задача', 'задачи', 'задач']) }} с решениями</p>
      </div>
    </div>
    <p v-if="collection.description" class="mt-3 text-sm text-muted line-clamp-3">{{ collection.description }}</p>
    <div class="mt-auto pt-4 flex items-center justify-between gap-3">
      <span v-if="collection.price" class="font-display text-2xl font-semibold text-highlighted">{{ collection.price }} ₽</span>
      <span v-else class="text-sm text-muted">Скоро в продаже</span>
      <span class="text-sm font-medium text-primary inline-flex items-center gap-1">
        Открыть <UIcon name="i-lucide-arrow-right" class="size-4 transition-transform group-hover:translate-x-0.5"/>
      </span>
    </div>
  </NuxtLink>
</template>
