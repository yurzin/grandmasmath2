<script setup lang="ts">
interface TaskType { id: number, number: number, examLevel: 'base' | 'profile', name: string, taskCount: number }

// Фильтр по реальным номерам заданий ЕГЭ — только тем, по которым на сайте есть задачи.
const { data: taskTypes } = await useFetch<TaskType[]>('/api/task-types', { query: { used: 1 } })

const filters = reactive<{ taskType?: string, free: boolean }>({ taskType: undefined, free: false })

const taskTypeItems = computed(() => (taskTypes.value ?? []).map(tt => ({
  label: `${taskTypeLabel(tt.number, tt.examLevel, tt.name)} (${tt.taskCount})`,
  value: String(tt.id),
})))

const query = computed(() => ({
  task_type: filters.taskType,
  free: filters.free ? 1 : undefined,
}))

const hasFilters = computed(() => Boolean(filters.taskType || filters.free))

function resetFilters() {
  filters.taskType = undefined
  filters.free = false
}

const { data: pins, pending } = await useFetch<TaskCard[]>('/api/tasks', { query })

useSeoMeta({ title: 'Задачи ЕГЭ с решениями' })
</script>

<template>
  <div class="max-w-(--ui-container) mx-auto">
    <div class="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8">
      <h1 class="font-display text-2xl sm:text-3xl font-semibold uppercase text-highlighted">Задачи</h1>
      <p class="mt-1 text-sm sm:text-base text-muted">Все задачи сайта. Бесплатные можно решать и смотреть с решением сразу.</p>
    </div>
    <div class="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
      <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3 rounded-xl border border-default bg-muted p-3 sm:p-4">
        <div class="flex items-center gap-2 text-sm font-medium text-highlighted">
          <UIcon name="i-lucide-sliders-horizontal" class="size-4 text-primary"/>
          Фильтры
        </div>

        <USelect
            v-model="filters.taskType"
            :items="taskTypeItems"
            icon="i-lucide-hash"
            placeholder="Все задания ЕГЭ"
            color="neutral"
            variant="outline"
            class="w-full sm:w-96"
        />

        <USwitch v-model="filters.free" label="Только бесплатные"/>

        <UButton
            v-if="hasFilters"
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            block
            class="cursor-pointer sm:w-auto sm:ml-auto"
            @click="resetFilters"
        >
          Сбросить фильтры
        </UButton>
      </div>
    </div>

    <p v-if="pending" class="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 text-sm sm:text-base text-muted">Загрузка…</p>
    <p v-else-if="!pins?.length" class="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 text-sm sm:text-base text-muted">По этим фильтрам задач пока нет.</p>

    <div class="px-4 sm:px-6 lg:px-8 py-3 sm:py-6">
      <div class="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3 sm:gap-4">
        <NuxtLink
            v-for="pin in pins"
            :key="pin.id"
            :to="`/tasks/${pin.id}`"
            class="group block mb-3 sm:mb-4 break-inside-avoid rounded-xl overflow-hidden border border-default bg-default transition-all hover:-translate-y-0.5 hover:border-accented hover:shadow-md"
        >
          <div class="p-2.5 sm:p-3">
            <span class="block text-[11px] sm:text-xs text-dimmed">{{ pin.label }}</span>
            <span v-if="pin.isFree" class="mt-1 inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-success">
              <span class="size-1.5 rounded-full bg-success"/>бесплатно
            </span>
            <p
                v-if="pin.title !== pin.label"
                class="mt-1 text-sm sm:text-base font-semibold text-highlighted transition-colors group-hover:text-primary"
            >
              {{ pin.title }}
            </p>
            <MathContent :html="pin.excerptHtml" class="mt-1.5 text-xs sm:text-sm text-muted line-clamp-6"/>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

