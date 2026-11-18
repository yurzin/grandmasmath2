<script setup lang="ts">
const [{ data: collections }, { data: freeTasks }] = await Promise.all([
  useFetch<CollectionCard[]>('/api/collections'),
  useFetch<TaskCard[]>('/api/tasks', { query: { free: 1, limit: 6 } }),
])

const taskTotal = computed(() => (collections.value ?? []).reduce((sum, c) => sum + c.taskCount, 0))
const startTo = computed(() => freeTasks.value?.[0] ? `/tasks/${freeTasks.value[0].id}` : '/tasks')

const steps = [
  { title: 'Решите сами', text: 'Условие как на экзамене. Черновик и калькулятор — ваши.' },
  { title: 'Проверьте ответ', text: 'Введите число: сайт поймёт и «1 440 000», и «1440 тыс.».' },
  { title: 'Сверьтесь с решением', text: 'Подробный разбор каждого шага, иногда двумя способами.' },
]

useSeoMeta({
  title: 'Задачи ЕГЭ по математике с подробными решениями',
  description: 'Сборники задач ЕГЭ по математике с подробными решениями и проверкой ответа. Бесплатные варианты — сразу на сайте.',
})
</script>

<template>
  <div>
    <!-- Первый экран -->
    <section class="border-b border-default">
      <div class="max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <h1 class="font-display text-3xl sm:text-5xl font-semibold uppercase leading-tight text-highlighted text-balance">
            Задачи ЕГЭ с подробными решениями
          </h1>
          <p class="mt-4 max-w-2xl text-base sm:text-lg text-muted">
            Профильная математика: решайте сами, проверяйте ответ и разбирайте решение шаг за шагом.
            Бесплатные варианты открыты сразу, без регистрации.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <UButton :to="startTo" size="xl" icon="i-lucide-play">Начать решать</UButton>
            <UButton to="/collections" size="xl" color="secondary" variant="soft">Сборники</UButton>
          </div>
        </div>
        <div v-if="taskTotal" class="hidden md:grid gap-1 text-right">
          <span class="font-display text-7xl font-semibold leading-none text-highlighted">{{ taskTotal }}</span>
          <span class="text-sm text-muted">задач с решениями<br>в сборниках</span>
        </div>
      </div>
    </section>

    <!-- Бесплатные варианты -->
    <section v-if="freeTasks?.length" class="max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 class="font-display text-2xl sm:text-3xl font-semibold uppercase text-highlighted">Бесплатные варианты</h2>
          <p class="mt-1 text-sm sm:text-base text-muted">С ответом, решением и проверкой — для всех.</p>
        </div>
        <UButton to="/tasks" variant="link" trailing-icon="i-lucide-arrow-right" class="px-0">Все задачи</UButton>
      </div>
      <div class="mt-5 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
            v-for="t in freeTasks"
            :key="t.id"
            :to="`/tasks/${t.id}`"
            class="group flex flex-col rounded-xl border border-default bg-muted/50 p-4 transition-all hover:-translate-y-0.5 hover:border-accented hover:bg-default hover:shadow-md"
        >
          <span class="text-xs text-dimmed">{{ t.label }}</span>
          <span v-if="t.title !== t.label" class="mt-1 font-semibold text-highlighted group-hover:text-primary transition-colors">{{ t.title }}</span>
          <MathContent :html="t.excerptHtml" class="mt-2 text-sm text-muted line-clamp-4"/>
          <span class="mt-auto pt-3 inline-flex items-center gap-1 text-xs font-medium text-success">
            <span class="size-1.5 rounded-full bg-success"/>бесплатно
          </span>
        </NuxtLink>
      </div>
    </section>

    <!-- Как это работает: порядок шагов важен, поэтому нумерация -->
    <section class="bg-muted/60 border-y border-default">
      <div class="max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <h2 class="font-display text-2xl sm:text-3xl font-semibold uppercase text-highlighted">Как это работает</h2>
        <ol class="mt-6 grid gap-6 sm:grid-cols-3">
          <li v-for="(s, i) in steps" :key="s.title" class="flex gap-4">
            <span class="flex-none grid place-items-center size-11 rounded-full bg-primary text-inverted font-display text-lg font-semibold">{{ i + 1 }}</span>
            <div>
              <h3 class="font-semibold text-highlighted">{{ s.title }}</h3>
              <p class="mt-1 text-sm text-muted">{{ s.text }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- Сборники -->
    <section class="max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <h2 class="font-display text-2xl sm:text-3xl font-semibold uppercase text-highlighted">Сборники</h2>
      <p class="mt-1 text-sm sm:text-base text-muted">PDF со всеми решениями и доступ к решениям на сайте.</p>
      <div class="mt-5 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CollectionTile v-for="c in collections" :key="c.slug" :collection="c"/>
        <NuxtLink
            to="/subscription"
            class="group flex flex-col justify-between gap-4 rounded-xl bg-primary p-4 sm:p-5 text-inverted transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div>
            <UIcon name="i-lucide-calendar-check" class="size-6"/>
            <h3 class="mt-3 text-lg font-semibold">Подписка на все сборники</h3>
            <p class="mt-1 text-sm opacity-80">Все решения, проверка ответов и PDF на выбранный срок — от месяца до года.</p>
          </div>
          <span class="text-sm font-medium inline-flex items-center gap-1">
            Выбрать срок <UIcon name="i-lucide-arrow-right" class="size-4 transition-transform group-hover:translate-x-0.5"/>
          </span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
