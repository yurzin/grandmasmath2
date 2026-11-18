<script setup lang="ts">
interface Topic { id: number; name: string }
interface TaskType { id: number; number: number; examLevel: 'base' | 'profile'; name: string }

const { data: topics } = await useFetch<Topic[]>('/api/topics')
const { data: taskTypes } = await useFetch<TaskType[]>('/api/task-types')

const filters = reactive<{ topic?: string, taskType?: string, difficulty?: string }>({
  topic: undefined,
  taskType: undefined,
  difficulty: undefined,
})

const topicItems = computed(() => (topics.value ?? []).map((t) => ({ label: t.name, value: String(t.id) })))
const taskTypeItems = computed(() => (taskTypes.value ?? []).map((tt) => ({
  label: `№${tt.number} (${tt.examLevel === 'base' ? 'база' : 'профиль'}) — ${tt.name}`,
  value: String(tt.id),
})))
const difficultyItems = [1, 2, 3, 4, 5].map((d) => ({ label: `Сложность ${d}`, value: String(d) }))

const query = computed(() => ({
  topic: filters.topic,
  task_type: filters.taskType,
  difficulty: filters.difficulty,
}))

const hasFilters = computed(() => Boolean(filters.topic || filters.taskType || filters.difficulty))

function resetFilters() {
  filters.topic = undefined
  filters.taskType = undefined
  filters.difficulty = undefined
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
            placeholder="Все номера ЕГЭ"
            color="neutral"
            variant="outline"
            class="w-full sm:w-72"
        />

        <USelect
            v-model="filters.topic"
            :items="topicItems"
            icon="i-lucide-shapes"
            placeholder="Все темы"
            color="neutral"
            variant="outline"
            class="w-full sm:w-56"
        />

        <USelect
            v-model="filters.difficulty"
            :items="difficultyItems"
            icon="i-lucide-gauge"
            placeholder="Любая сложность"
            color="neutral"
            variant="outline"
            class="w-full sm:w-48"
        />

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

