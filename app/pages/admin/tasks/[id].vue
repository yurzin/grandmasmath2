<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface TaskTypeItem { id: number, number: number, examLevel: ExamLevel, name: string }
interface TopicItem { id: number, name: string }

const route = useRoute()
const toast = useToast()

const isNew = computed(() => route.params.id === 'new')
const taskId = computed(() => (isNew.value ? null : Number(route.params.id)))

const [{ data: taskTypes, refresh: refreshTaskTypes }, { data: topics, refresh: refreshTopics }, { data: loaded, error: loadError }] = await Promise.all([
  useFetch<TaskTypeItem[]>('/api/task-types'),
  useFetch<TopicItem[]>('/api/topics'),
  useFetch<AdminTask>(() => `/api/admin/tasks/${route.params.id}`, { immediate: !isNew.value }),
])

// В форме необязательные поля — строки; пустую строку сервер сохраняет как null.
type TaskForm = Omit<AdminTaskInput, 'title' | 'imageUrl' | 'source'> & { title: string, imageUrl: string, source: string }

function emptyTask(): TaskForm {
  return {
    title: '',
    taskTypeId: taskTypes.value?.[0]?.id ?? 0,
    topicId: null,
    difficulty: 3,
    body: '',
    answer: '',
    imageUrl: '',
    source: '',
    solutions: [''],
  }
}

function toForm(t: AdminTask): TaskForm {
  return {
    title: t.title ?? '',
    taskTypeId: t.taskTypeId,
    topicId: t.topicId,
    difficulty: t.difficulty,
    body: t.body,
    answer: t.answer,
    imageUrl: t.imageUrl ?? '',
    source: t.source ?? '',
    solutions: t.solutions.length ? [...t.solutions] : [''],
  }
}

const form = ref<TaskForm>(loaded.value ? toForm(loaded.value) : emptyTask())
const saved = ref(JSON.stringify(form.value))
const dirty = computed(() => JSON.stringify(form.value) !== saved.value)

useSeoMeta({
  title: () => (isNew.value ? 'Новая задача' : `Задача #${taskId.value}`) + ' — админка',
  robots: 'noindex',
})

const taskTypeItems = computed(() => (taskTypes.value ?? []).map(tt => ({
  label: `№${tt.number} (${tt.examLevel === 'base' ? 'база' : 'профиль'}) — ${tt.name}`,
  value: tt.id,
})))
const topicItems = computed(() => [
  { label: 'Без темы', value: 0 },
  ...(topics.value ?? []).map(t => ({ label: t.name, value: t.id })),
])
const topicModel = computed({
  get: () => form.value.topicId ?? 0,
  set: (v: number) => (form.value.topicId = v || null),
})
// Создание темы / номера прямо из редактора — новая запись сразу выбирается.
const topicModalOpen = ref(false)
const taskTypeModalOpen = ref(false)
async function onTopicCreated(topic: AdminTopic) {
  await refreshTopics()
  form.value.topicId = topic.id
}
async function onTaskTypeCreated(taskType: AdminTaskType) {
  await refreshTaskTypes()
  form.value.taskTypeId = taskType.id
}

const difficultyItems =[1, 2, 3, 4, 5].map(d => ({ label: `${d} из 5`, value: d }))

function moveSolution(index: number, delta: number) {
  const list = form.value.solutions
  const [item] = list.splice(index, 1)
  list.splice(index + delta, 0, item!)
}

const saving = ref(false)
async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const result = await $fetch<AdminTask>(isNew.value ? '/api/admin/tasks' : `/api/admin/tasks/${taskId.value}`, {
      method: isNew.value ? 'POST' : 'PUT',
      body: form.value,
    })
    loaded.value = result
    form.value = toForm(result)
    saved.value = JSON.stringify(form.value)
    toast.add({ title: 'Сохранено', color: 'success', icon: 'i-lucide-check' })
    if (isNew.value) await navigateTo(`/admin/tasks/${result.id}`, { replace: true })
  } catch (e) {
    toast.add({ title: 'Не сохранено', description: errorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!taskId.value) return
  const where = loaded.value?.collections.length
    ? `\nОна будет убрана из сборников: ${loaded.value.collections.map(c => c.title).join(', ')}.`
    : ''
  if (!confirm(`Удалить задачу #${taskId.value} вместе с решениями?${where}`)) return
  try {
    await $fetch(`/api/admin/tasks/${taskId.value}`, { method: 'DELETE' })
    saved.value = JSON.stringify(form.value) // не спрашивать про несохранённое
    toast.add({ title: 'Задача удалена', color: 'success' })
    await navigateTo('/admin/tasks')
  } catch (e) {
    toast.add({ title: 'Не удалось удалить', description: errorMessage(e), color: 'error' })
  }
}

defineShortcuts({ meta_s: () => save() })

onBeforeRouteLeave(() => {
  if (dirty.value && !confirm('Есть несохранённые изменения. Уйти без сохранения?')) return false
})
if (import.meta.client) {
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (dirty.value) e.preventDefault()
  }
  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
}
</script>

<template>
  <UDashboardPanel id="admin-task-edit">
    <template #header>
      <UDashboardNavbar :title="isNew ? 'Новая задача' : `Задача #${taskId}`">
        <template #leading>
          <UButton to="/admin/tasks" icon="i-lucide-arrow-left" color="neutral" variant="ghost" aria-label="К списку"/>
        </template>
        <template #right>
          <span v-if="dirty" class="hidden sm:inline text-xs text-warning">не сохранено</span>
          <UButton
              v-if="!isNew"
              :to="`/tasks/${taskId}`"
              target="_blank"
              icon="i-lucide-external-link"
              color="neutral"
              variant="ghost"
              class="hidden sm:inline-flex"
          >
            На сайте
          </UButton>
          <UButton icon="i-lucide-save" :loading="saving" @click="save">Сохранить</UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loadError" class="py-12 text-center text-muted">Задача не найдена</div>

      <div v-else class="space-y-6 max-w-7xl">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UFormField label="Заголовок" class="sm:col-span-2" hint="необязательно">
            <UInput v-model="form.title" placeholder="Например: Наибольший кредит…" class="w-full"/>
          </UFormField>
          <UFormField label="Номер ЕГЭ" class="sm:col-span-2">
            <UFieldGroup class="w-full">
              <USelect v-model="form.taskTypeId" :items="taskTypeItems" class="flex-1 min-w-0"/>
              <UButton icon="i-lucide-plus" color="neutral" variant="outline" aria-label="Новый номер ЕГЭ" @click="taskTypeModalOpen = true"/>
            </UFieldGroup>
          </UFormField>
          <UFormField label="Тема">
            <UFieldGroup class="w-full">
              <USelect v-model="topicModel" :items="topicItems" class="flex-1 min-w-0"/>
              <UButton icon="i-lucide-plus" color="neutral" variant="outline" aria-label="Новая тема" @click="topicModalOpen = true"/>
            </UFieldGroup>
          </UFormField>
          <UFormField label="Сложность">
            <USelect v-model="form.difficulty" :items="difficultyItems" class="w-full"/>
          </UFormField>
          <UFormField label="Источник" hint="необязательно">
            <UInput v-model="form.source" class="w-full"/>
          </UFormField>
          <UFormField label="Картинка (URL)" hint="необязательно">
            <UInput v-model="form.imageUrl" class="w-full"/>
          </UFormField>
        </div>

        <p class="text-xs text-dimmed">
          Текст — Markdown. Формулы: <code>$x^2$</code> в строке; выключная — <code>$$</code> на отдельных строках
          до и после. Таблицы — <code>| a | b |</code>, списки — <code>- пункт</code>.
        </p>

        <AdminMarkdownField v-model="form.body" label="Условие" :rows="8"/>

        <AdminMarkdownField v-model="form.answer" label="Ответ" inline placeholder="Например: 5 млн рублей"/>

        <div class="space-y-5">
          <AdminMarkdownField
              v-for="(solution, index) in form.solutions"
              :key="index"
              :model-value="solution"
              :label="index === 0 ? 'Решение' : `Другое решение ${form.solutions.length > 2 ? index : ''}`"
              :rows="14"
              @update:model-value="(value: string) => (form.solutions[index] = value)"
          >
            <template #actions>
              <UButton
                  icon="i-lucide-arrow-up"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :disabled="index === 0"
                  aria-label="Выше"
                  @click="moveSolution(index, -1)"
              />
              <UButton
                  icon="i-lucide-arrow-down"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :disabled="index === form.solutions.length - 1"
                  aria-label="Ниже"
                  @click="moveSolution(index, 1)"
              />
              <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  aria-label="Удалить решение"
                  @click="form.solutions.splice(index, 1)"
              />
            </template>
          </AdminMarkdownField>

          <UButton icon="i-lucide-plus" color="neutral" variant="outline" @click="form.solutions.push('')">
            Добавить решение
          </UButton>
        </div>

        <div v-if="!isNew" class="flex flex-wrap items-center gap-3 border-t border-default pt-4 text-sm text-muted">
          <span v-if="loaded?.collections.length">
            В сборниках:
            <template v-for="(c, i) in loaded.collections" :key="c.id">
              <NuxtLink :to="`/admin/collections/${c.id}`" class="text-primary">{{ c.title }}</NuxtLink>, №{{ c.position }}<template v-if="i < loaded.collections.length - 1">; </template>
            </template>
          </span>
          <span v-else>Не входит ни в один сборник</span>
          <UButton class="ml-auto" icon="i-lucide-trash-2" color="error" variant="soft" @click="remove">
            Удалить задачу
          </UButton>
        </div>
      </div>

      <AdminTopicModal v-model:open="topicModalOpen" @saved="onTopicCreated"/>
      <AdminTaskTypeModal v-model:open="taskTypeModalOpen" @saved="onTaskTypeCreated"/>
    </template>
  </UDashboardPanel>
</template>
