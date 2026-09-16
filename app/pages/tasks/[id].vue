<script setup lang="ts">
interface Task {
  id: number
  title: string
  description: string
  height: number
}

const route = useRoute()

const { data: task } = await useFetch<Task>(() => `/api/tasks/${route.params.id}`)

useSeoMeta({
  title: () => task.value ? task.value.title : 'Задача не найдена'
})
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 sm:p-6">
    <UButton
        to="/"
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
        class="mb-4"
    >
      На главную
    </UButton>

    <div v-if="task" class="rounded-lg border border-default bg-default overflow-hidden">
      <div class="flex items-center justify-center bg-muted text-dimmed h-64 sm:h-80">
        <UIcon name="i-lucide-image" class="size-12"/>
      </div>

      <div class="p-4 sm:p-6">
        <span class="text-xs text-muted">Задача №{{ task.id }}</span>
        <h1 class="mt-1 text-xl sm:text-2xl font-semibold text-highlighted">
          {{ task.title }}
        </h1>
        <p class="mt-3 text-muted">
          {{ task.description }}
        </p>
      </div>
    </div>

    <div v-else class="flex flex-col items-center gap-3 py-16 text-center">
      <UIcon name="i-lucide-search-x" class="size-10 text-dimmed"/>
      <p class="text-muted">Задача не найдена</p>
    </div>
  </div>
</template>
