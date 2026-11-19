<script setup lang="ts">
const route = useRoute()

const { data: task } = await useFetch<TaskDetail>(() => `/api/tasks/${route.params.id}`)

const showSolution = ref(false)
const { loggedIn } = useUserSession()

// «Реши сам»
const myAnswer = ref('')
const checking = ref(false)
const checkResult = ref<boolean | null>(null)
const checkError = ref('')
async function check() {
  if (!task.value || !myAnswer.value.trim()) return
  checking.value = true
  checkError.value = ''
  try {
    const { correct } = await $fetch<{ correct: boolean }>(`/api/tasks/${task.value.id}/check`, {
      method: 'POST',
      body: { answer: myAnswer.value },
    })
    checkResult.value = correct
    if (correct) task.value.solved = true
  } catch (e) {
    checkError.value = errorMessage(e, 'Не удалось проверить')
  } finally {
    checking.value = false
  }
}
watch(myAnswer, () => (checkResult.value = null))

// Короткий доступ: решение приходит с сервера только по кнопке и засчитывается в лимит за сутки.
const revealing = ref(false)
const revealError = ref('')
async function openSolution() {
  const t = task.value
  if (!t) return
  if (!t.pass || t.pass.revealed) {
    showSolution.value = true
    return
  }
  revealing.value = true
  revealError.value = ''
  try {
    const result = await $fetch<TaskRevealResult>(`/api/tasks/${t.id}/reveal`, { method: 'POST' })
    t.answerHtml = result.answerHtml
    t.solutionsHtml = result.solutionsHtml
    t.pass.revealed = true
    if (result.quota) t.pass.used = result.quota.used
    showSolution.value = true
  } catch (e) {
    revealError.value = errorMessage(e, 'Не удалось открыть решение')
  } finally {
    revealing.value = false
  }
}

// Водяной знак с email покупателя поверх решения (короткий доступ).
const watermarkStyle = computed(() => {
  const email = task.value?.pass?.watermark
  if (!email) return undefined
  const safe = email.replace(/[<>&"']/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160">`
    + `<text x="160" y="90" text-anchor="middle" transform="rotate(-20 160 80)" `
    + `font-family="sans-serif" font-size="14" fill="rgb(160,180,255)" fill-opacity="0.09">${safe}</text></svg>`
  return { backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")` }
})

const timeFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

// Варианты для закрытой задачи: короткий доступ (если продаётся) — с возвратом на эту задачу.
const { data: offers } = useFetch<SubscriptionInfo>('/api/subscriptions', { lazy: true, server: false })
const cheapestPass = computed(() => offers.value?.passes.reduce<SubscriptionInfo['passes'][number] | null>(
  (min, p) => (!min || p.price < min.price ? p : min), null) ?? null)

// Переход к соседнему варианту — та же страница, поэтому сбрасываем ответ и раскрытое решение.
watch(() => route.params.id, () => {
  myAnswer.value = ''
  checkResult.value = null
  checkError.value = ''
  revealError.value = ''
  showSolution.value = false
})

const back = computed(() => task.value?.collection
  ? { to: `/collections/${task.value.collection.slug}`, label: task.value.collection.title }
  : { to: '/tasks', label: 'Все задачи' })

useSeoMeta({
  title: () => task.value ? task.value.title : 'Задача не найдена'
})
</script>

<template>
  <div class="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
    <div class="mb-3 sm:mb-4 flex items-center justify-between gap-2">
      <UButton
          :to="back.to"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          class="min-w-0"
      >
        <span class="truncate">{{ back.label }}</span>
      </UButton>

      <!-- Соседние варианты сборника -->
      <div v-if="task?.collection" class="flex flex-none items-center gap-1">
        <UButton
            :to="task.collection.prevTaskId ? `/tasks/${task.collection.prevTaskId}` : undefined"
            :disabled="!task.collection.prevTaskId"
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Предыдущий вариант"
        />
        <span class="text-sm text-muted tabular-nums">{{ task.collection.position }} из {{ task.collection.total }}</span>
        <UButton
            :to="task.collection.nextTaskId ? `/tasks/${task.collection.nextTaskId}` : undefined"
            :disabled="!task.collection.nextTaskId"
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Следующий вариант"
        />
      </div>
    </div>

    <div v-if="task" class="rounded-xl border border-default card-surface overflow-hidden">
      <img
          v-if="task.imageUrl"
          :src="task.imageUrl"
          :alt="task.title"
          class="w-full max-h-80 object-contain bg-muted"
      >

      <div class="p-3 sm:p-6">
        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <UBadge color="primary" variant="subtle" size="sm" class="sm:text-sm sm:px-2.5 sm:py-1">
            ЕГЭ {{ task.examLevel === 'profile' ? 'профиль' : 'база' }} · задание {{ task.taskNumber }}
          </UBadge>
          <UBadge color="neutral" variant="outline" size="sm" class="sm:text-sm sm:px-2.5 sm:py-1">
            {{ task.taskType }}
          </UBadge>
        </div>

        <span v-if="task.collection" class="block mt-2.5 sm:mt-3 text-xs text-muted">
          Вариант {{ task.collection.position }} из сборника «{{ task.collection.title }}»
        </span>
        <h1 class="mt-1.5 text-lg sm:text-xl font-semibold text-highlighted">{{ task.title }}</h1>

        <MathContent :html="task.bodyHtml" class="mt-3 sm:mt-4 text-sm sm:text-base text-default"/>

        <div
            v-if="task.locked"
            class="mt-5 sm:mt-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-muted p-3 sm:p-4"
        >
          <UIcon name="i-lucide-lock" class="flex-none size-6 text-primary"/>
          <p class="flex-1 text-sm sm:text-base text-muted">
            Ответ, подробное решение и проверка своего ответа — в сборнике
            <span v-if="task.collection" class="font-medium text-highlighted">«{{ task.collection.title }}»</span>
            или по <NuxtLink to="/subscription" class="text-primary underline">подписке на все сборники</NuxtLink>.
            <template v-if="cheapestPass">
              Нужно только сейчас? Доступ ко всем решениям на сайте —
              {{ plural(cheapestPass.days, ['день', 'дня', 'дней']) }} за {{ cheapestPass.price }} ₽.
            </template>
          </p>
          <div class="flex flex-col sm:flex-none gap-2">
            <UButton
                v-if="cheapestPass"
                :to="{ path: '/subscription', query: { next: route.fullPath } }"
                icon="i-lucide-timer"
                color="primary"
                class="justify-center"
            >
              {{ plural(cheapestPass.days, ['день', 'дня', 'дней']) }} — {{ cheapestPass.price }} ₽
            </UButton>
            <UButton
                v-if="task.collection"
                :to="`/collections/${task.collection.slug}`"
                icon="i-lucide-book-open"
                :color="cheapestPass ? 'neutral' : 'primary'"
                :variant="cheapestPass ? 'outline' : 'solid'"
                class="justify-center"
            >
              К сборнику
            </UButton>
          </div>
        </div>

        <!-- Реши сам -->
        <form
            v-if="task.checkable && !showSolution"
            class="mt-5 sm:mt-6 rounded-lg border border-default p-3 sm:p-4 space-y-2"
            @submit.prevent="check"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-pencil-line" class="size-5 text-primary"/>
            <span class="font-medium text-highlighted">Реши сам</span>
            <UBadge v-if="task.solved" color="success" variant="subtle" size="sm" icon="i-lucide-check">решено</UBadge>
          </div>
          <div class="flex flex-col sm:flex-row gap-2">
            <UInput
                v-model="myAnswer"
                placeholder="Ваш ответ — число"
                inputmode="decimal"
                class="flex-1"
                :color="checkResult === null ? 'neutral' : checkResult ? 'success' : 'error'"
                :highlight="checkResult !== null"
            />
            <UButton type="submit" class="justify-center" :loading="checking" :disabled="!myAnswer.trim()">Проверить</UButton>
          </div>
          <p v-if="checkResult === true" class="text-sm text-success">Верно! Можно сверить ход решения.</p>
          <p v-else-if="checkResult === false" class="text-sm text-error">Пока неверно. Попробуйте ещё раз или посмотрите решение.</p>
          <p v-if="checkError" class="text-sm text-error">{{ checkError }}</p>
          <p v-if="!loggedIn" class="text-xs text-dimmed">
            <NuxtLink :to="{ path: '/login', query: { redirect: route.fullPath } }" class="underline">Войдите</NuxtLink>,
            чтобы решённые задачи отмечались в сборниках.
          </p>
        </form>

        <div v-if="!task.locked" class="mt-5 sm:mt-6">
          <template v-if="!showSolution">
            <UButton
                icon="i-lucide-eye"
                color="neutral"
                variant="outline"
                block
                class="sm:w-auto"
                :loading="revealing"
                @click="openSolution"
            >
              Показать ответ и решение
            </UButton>
            <p v-if="task.pass" class="mt-2 text-xs text-dimmed">
              Короткий доступ до {{ timeFormat.format(new Date(task.pass.until)) }}<template v-if="task.pass.limit">
                · за сутки открыто {{ task.pass.used }} из {{ task.pass.limit }} решений</template><template v-if="task.pass.revealed">
                · это решение уже открыто, повторно — бесплатно</template>.
            </p>
            <UAlert v-if="revealError" class="mt-3" color="error" variant="subtle" :title="revealError" icon="i-lucide-circle-alert"/>
          </template>

          <div v-else class="space-y-5 sm:space-y-6 rounded-lg" :style="watermarkStyle">
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

    <div v-if="task?.collection && (task.collection.prevTaskId || task.collection.nextTaskId)" class="mt-4 flex justify-between gap-3">
      <UButton
          v-if="task.collection.prevTaskId"
          :to="`/tasks/${task.collection.prevTaskId}`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="outline"
      >
        Предыдущий
      </UButton>
      <span v-else/>
      <UButton
          v-if="task.collection.nextTaskId"
          :to="`/tasks/${task.collection.nextTaskId}`"
          trailing-icon="i-lucide-arrow-right"
          color="neutral"
          variant="outline"
      >
        Следующий
      </UButton>
    </div>

    <div v-if="!task" class="flex flex-col items-center gap-3 py-12 sm:py-16 text-center">
      <UIcon name="i-lucide-search-x" class="size-10 text-dimmed"/>
      <p class="text-muted">Задача не найдена</p>
    </div>
  </div>
</template>
