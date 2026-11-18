<script setup lang="ts">
const route = useRoute()

const { data: task } = await useFetch<TaskDetail>(() => `/api/tasks/${route.params.id}`)

const showSolution = ref(false)

const back = computed(() => task.value?.collection
  ? { to: `/collections/${task.value.collection.slug}`, label: task.value.collection.title }
  : { to: '/', label: 'На главную' })

useSeoMeta({
  title: () => task.value ? task.value.title : 'Задача не найдена'
})
</script>

<template>
  <div class="max-w-3xl mx-auto p-3 sm:p-6">
    <UButton
        :to="back.to"
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
        class="mb-3 sm:mb-4"
    >
      {{ back.label }}
    </UButton>

    <div v-if="task" class="rounded-lg border border-default bg-default overflow-hidden">
      <img
          v-if="task.imageUrl"
          :src="task.imageUrl"
          :alt="task.title"
          class="w-full max-h-80 object-contain bg-muted"
      >

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

        <span class="block mt-2.5 sm:mt-3 text-xs text-muted">
          <template v-if="task.collection">Вариант {{ task.collection.position }} · </template>
          {{ task.taskType }}
        </span>
        <h1 class="mt-1.5 text-lg sm:text-xl font-semibold text-highlighted">{{ task.title }}</h1>

        <MathContent :html="task.bodyHtml" class="mt-3 sm:mt-4 text-sm sm:text-base text-default"/>

        <div
            v-if="task.locked"
            class="mt-5 sm:mt-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-muted p-3 sm:p-4"
        >
          <UIcon name="i-lucide-lock" class="flex-none size-6 text-primary"/>
          <p class="flex-1 text-sm sm:text-base text-muted">
            Ответ и подробное решение этой задачи — в сборнике
            <span v-if="task.collection" class="font-medium text-highlighted">«{{ task.collection.title }}»</span>.
          </p>
          <UButton
              v-if="task.collection"
              :to="`/collections/${task.collection.slug}`"
              icon="i-lucide-book-open"
              color="primary"
              class="sm:flex-none justify-center"
          >
            К сборнику
          </UButton>
        </div>

        <div v-else class="mt-5 sm:mt-6">
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

          <div v-else class="space-y-5 sm:space-y-6">
            <section
                v-for="(solution, index) in task.solutionsHtml"
                :key="index"
                class="border-t border-default pt-4 sm:pt-5"
            >
              <h2 class="text-xs font-semibold uppercase tracking-widest text-primary">
                {{ index === 0 ? 'Решение' : 'Другое решение' }}
              </h2>
              <MathContent :html="solution" class="mt-2 text-sm sm:text-base text-default"/>
            </section>

            <div class="rounded-lg bg-muted p-3 sm:p-4">
              <span class="text-xs text-muted">Ответ</span>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <p class="mt-1 font-semibold text-highlighted" v-html="task.answerHtml"/>
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
