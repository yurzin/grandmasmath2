<script setup lang="ts">
interface Task {
  id: number
  title: string
  description: string
  height: number
}

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

const { data: pins, pending } = await useFetch<Task[]>('/api/tasks', { query })
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:flex-wrap gap-3 px-4 sm:px-6 pt-4 sm:pt-6">
      <USelect
          v-model="filters.taskType"
          :items="taskTypeItems"
          placeholder="Все номера ЕГЭ"
          color="neutral"
          variant="outline"
          class="w-full sm:w-72"
      />

      <USelect
          v-model="filters.topic"
          :items="topicItems"
          placeholder="Все темы"
          color="neutral"
          variant="outline"
          class="w-full sm:w-56"
      />

      <USelect
          v-model="filters.difficulty"
          :items="difficultyItems"
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
          class="cursor-pointer"
          @click="resetFilters"
      >
        Сбросить фильтры
      </UButton>
    </div>

    <p v-if="pending" class="px-4 sm:px-6 pt-6 text-muted">Загрузка…</p>
    <p v-else-if="!pins?.length" class="px-4 sm:px-6 pt-6 text-muted">По этим фильтрам задач пока нет.</p>

    <div class="p-4 sm:p-6">
      <div class="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4">
        <NuxtLink
            v-for="pin in pins"
            :key="pin.id"
            :to="`/tasks/${pin.id}`"
            class="block mb-4 break-inside-avoid rounded-lg overflow-hidden border border-default bg-default"
        >
          <div
              class="flex items-center justify-center bg-muted text-dimmed"
              :style="{ height: pin.height + 'px' }"
          >
            <UIcon name="i-lucide-image" class="size-8"/>
          </div>
          <p class="p-3 text-sm text-muted">
            {{ pin.description }}
          </p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
