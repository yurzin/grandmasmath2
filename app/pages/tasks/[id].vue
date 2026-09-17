<script setup lang="ts">
interface TaskDetail {
  id: number
  title: string
  description: string
  height: number
  answer: string
  difficulty: number
  topic: string | null
  taskType: string
  examLevel: 'base' | 'profile'
  solutions: string[]
}

const route = useRoute()

const { data: task } = await useFetch<TaskDetail>(() => `/api/tasks/${route.params.id}`)

const showSolution = ref(false)

useSeoMeta({
  title: () => task.value ? task.value.title : 'Задача не найдена'
})
</script>

<template>
  <div class="max-w-2xl mx-auto p-3 sm:p-6">
    <UButton
        to="/"
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
        class="mb-3 sm:mb-4"
    >
      На главную
    </UButton>

    <div v-if="task" class="rounded-lg border border-default bg-default overflow-hidden">
      <div class="flex items-center justify-center bg-muted text-dimmed h-40 sm:h-64 md:h-80">
        <UIcon name="i-lucide-image" class="size-10 sm:size-12"/>
      </div>

      <div class="p-3 sm:p-6">
        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <UBadge :color="task.examLevel === 'profile' ? 'primary' : 'neutral'" variant="subtle" size="sm" class="sm:text-sm sm:px-2.5 sm:py-1">
            {{ task.examLevel === 'profile' ? 'Профильный уровень' : 'Базовый уровень' }}
          </UBadge>
          <UBadge v-if="task.topic" color="neutral" variant="outline" size="sm" class="sm:text-sm sm:px-2.5 sm:py-1">
            {{ task.topic }}
          </UBadge>
          <UBadge color="neutral" variant="outline" size="sm" class="sm:text-sm sm:px-2.5 sm:py-1">
            Сложность: {{ task.difficulty }}/5
          </UBadge>
        </div>

        <span class="block mt-2.5 sm:mt-3 text-xs text-muted">Задача №{{ task.id }} · {{ task.taskType }}</span>
        <p class="mt-2.5 sm:mt-3 text-sm sm:text-base text-muted whitespace-pre-line">
          {{ task.description }}
        </p>

        <div class="mt-5 sm:mt-6">
          <UButton
              v-if="!showSolution"
              icon="i-lucide-eye"
              color="neutral"
              variant="outline"
              block
              class="sm:w-auto"
              @click="showSolution = true"
          >
            Показать ответ и решение
          </UButton>

          <div v-else class="space-y-3 sm:space-y-4">
            <div class="rounded-lg bg-muted p-3 sm:p-4">
              <span class="text-xs text-muted">Ответ</span>
              <p class="mt-1 font-semibold text-highlighted">{{ task.answer }}</p>
            </div>

            <div v-if="task.solutions.length">
              <span class="text-xs text-muted">Решение</span>
              <ol class="mt-2 space-y-2.5 sm:space-y-3">
                <li
                    v-for="(step, index) in task.solutions"
                    :key="index"
                    class="flex gap-2.5 sm:gap-3"
                >
                  <span class="flex-none flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {{ index + 1 }}
                  </span>
                  <p class="text-sm sm:text-base text-muted whitespace-pre-line">{{ step }}</p>
                </li>
              </ol>
            </div>

            <UButton
                icon="i-lucide-eye-off"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="showSolution = false"
            >
              Скрыть
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center gap-3 py-12 sm:py-16 text-center">
      <UIcon name="i-lucide-search-x" class="size-10 text-dimmed"/>
      <p class="text-muted">Задача не найдена</p>
    </div>
  </div>
</template>
