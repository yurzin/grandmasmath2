<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const toast = useToast()

const isNew = computed(() => route.params.id === 'new')
const collectionId = computed(() => (isNew.value ? null : Number(route.params.id)))

const [{ data: loaded, error: loadError }, { data: allTasks }] = await Promise.all([
  useFetch<AdminCollection>(() => `/api/admin/collections/${route.params.id}`, { immediate: !isNew.value }),
  useFetch<AdminTaskListItem[]>('/api/admin/tasks'),
])

// Необязательные поля в форме — строки; цена — строка из поля ввода.
interface CollectionForm {
  slug: string
  title: string
  description: string
  price: string
  status: CollectionStatus
  version: number
  coverUrl: string
  tasks: { taskId: number, isFree: boolean }[]
}

function toForm(c?: AdminCollection | null): CollectionForm {
  return {
    slug: c?.slug ?? '',
    title: c?.title ?? '',
    description: c?.description ?? '',
    price: c?.price != null ? String(c.price) : '',
    status: c?.status ?? 'draft',
    version: c?.version ?? 1,
    coverUrl: c?.coverUrl ?? '',
    tasks: c?.tasks.map(t => ({ ...t })) ?? [],
  }
}

const form = ref<CollectionForm>(toForm(loaded.value))

// Новому сборнику предлагаем адрес из названия, пока его не правили руками.
const slugTouched = ref(!isNew.value)
watch(() => form.value.title, (title) => {
  if (!slugTouched.value) form.value.slug = slugify(title)
})
const saved = ref(JSON.stringify(form.value))
const dirty = computed(() => JSON.stringify(form.value) !== saved.value)

useSeoMeta({
  title: () => (isNew.value ? 'Новый сборник' : form.value.title || 'Сборник') + ' — админка',
  robots: 'noindex',
})

const statusItems = [
  { label: 'Черновик — не виден на сайте', value: 'draft' },
  { label: 'Опубликован', value: 'published' },
  { label: 'В архиве — не виден на сайте', value: 'archived' },
]

const titles = computed<Record<number, string>>(() => ({
  ...Object.fromEntries((allTasks.value ?? []).map(t => [t.id, t.title ?? t.label])),
  ...loaded.value?.taskTitles,
}))

const addItems = computed(() => {
  const used = new Set(form.value.tasks.map(t => t.taskId))
  return (allTasks.value ?? [])
    .filter(t => !used.has(t.id))
    .map(t => ({ label: `#${t.id} · ${t.title ?? t.label}`, value: t.id }))
})
const toAdd = ref<number>()
watch(toAdd, (id) => {
  if (!id) return
  form.value.tasks.push({ taskId: id, isFree: false })
  nextTick(() => (toAdd.value = undefined))
})

function move(index: number, delta: number) {
  const list = form.value.tasks
  const [item] = list.splice(index, 1)
  list.splice(index + delta, 0, item!)
}

const saving = ref(false)
async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const body: AdminCollectionInput = {
      ...form.value,
      description: form.value.description || null,
      coverUrl: form.value.coverUrl || null,
      price: form.value.price.trim() === '' ? null : Number(form.value.price),
    }
    const result = await $fetch<AdminCollection>(
      isNew.value ? '/api/admin/collections' : `/api/admin/collections/${collectionId.value}`,
      { method: isNew.value ? 'POST' : 'PUT', body },
    )
    loaded.value = result
    form.value = toForm(result)
    saved.value = JSON.stringify(form.value)
    toast.add({ title: 'Сохранено', color: 'success', icon: 'i-lucide-check' })
    if (isNew.value) await navigateTo(`/admin/collections/${result.id}`, { replace: true })
  } catch (e) {
    toast.add({ title: 'Не сохранено', description: errorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!collectionId.value) return
  if (!confirm(`Удалить сборник «${form.value.title}»? Задачи останутся, удалится только сам сборник и его состав.`)) return
  try {
    await $fetch(`/api/admin/collections/${collectionId.value}`, { method: 'DELETE' })
    saved.value = JSON.stringify(form.value)
    toast.add({ title: 'Сборник удалён', color: 'success' })
    await navigateTo('/admin/collections')
  } catch (e) {
    toast.add({ title: 'Не удалось удалить', description: errorMessage(e), color: 'error' })
  }
}

// ---------- PDF сборника ----------
const { data: pdfStatus, refresh: refreshPdfStatus } = await useFetch<AdminPdfStatus>(
  () => `/api/admin/collections/${route.params.id}/pdf`,
  { immediate: !isNew.value, server: false },
)
const pdfBuilding = ref(false)
const pdfError = ref<{ message: string, log: string } | null>(null)

async function buildPdf() {
  pdfBuilding.value = true
  pdfError.value = null
  try {
    pdfStatus.value = await $fetch<AdminPdfStatus>(`/api/admin/collections/${collectionId.value}/pdf`, { method: 'POST' })
    toast.add({ title: 'PDF собран', color: 'success', icon: 'i-lucide-check' })
  } catch (e) {
    const log = (e as { data?: { data?: { log?: string } } })?.data?.data?.log ?? ''
    pdfError.value = { message: errorMessage(e, 'Не удалось собрать PDF'), log }
  } finally {
    pdfBuilding.value = false
  }
}

// После сохранения содержимое могло измениться — PDF может устареть.
watch(saved, () => {
  if (!isNew.value) refreshPdfStatus()
})

const dateTimeFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' })

defineShortcuts({ meta_s: () => save() })

onBeforeRouteLeave(() => {
  if (dirty.value && !confirm('Есть несохранённые изменения. Уйти без сохранения?')) return false
})
</script>

<template>
  <UDashboardPanel id="admin-collection-edit">
    <template #header>
      <UDashboardNavbar :title="isNew ? 'Новый сборник' : (loaded?.title ?? 'Сборник')">
        <template #leading>
          <UButton to="/admin/collections" icon="i-lucide-arrow-left" color="neutral" variant="ghost" aria-label="К списку"/>
        </template>
        <template #right>
          <span v-if="dirty" class="hidden sm:inline text-xs text-warning">не сохранено</span>
          <UButton
              v-if="!isNew && loaded?.status === 'published'"
              :to="`/collections/${loaded.slug}`"
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
      <div v-if="loadError" class="py-12 text-center text-muted">Сборник не найден</div>

      <div v-else class="space-y-6 max-w-4xl">
        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField label="Название" class="sm:col-span-2">
            <UInput v-model="form.title" class="w-full"/>
          </UFormField>
          <UFormField label="Адрес (slug)" hint="латиница и дефисы" :help="`На сайте: /collections/${form.slug || '…'}`">
            <UInput v-model="form.slug" placeholder="economic-tasks" class="w-full" @input="slugTouched = true"/>
          </UFormField>
          <UFormField label="Статус">
            <USelect v-model="form.status" :items="statusItems" class="w-full"/>
          </UFormField>
          <UFormField label="Цена, ₽" hint="пусто — не назначена">
            <UInput v-model="form.price" type="number" min="0" class="w-full"/>
          </UFormField>
          <UFormField label="Версия" hint="увеличивайте при заметных правках">
            <UInput v-model.number="form.version" type="number" min="1" class="w-full"/>
          </UFormField>
          <UFormField label="Описание" class="sm:col-span-2">
            <UTextarea v-model="form.description" :rows="3" autoresize class="w-full"/>
          </UFormField>
          <UFormField label="Обложка (URL)" hint="необязательно" class="sm:col-span-2">
            <UInput v-model="form.coverUrl" class="w-full"/>
          </UFormField>
        </div>

        <div>
          <div class="mb-2 flex items-center gap-2">
            <h2 class="text-sm font-medium text-highlighted">
              Задачи · {{ form.tasks.length }}
            </h2>
            <span class="text-xs text-dimmed">номер варианта = позиция в списке</span>
          </div>

          <ol class="divide-y divide-default rounded-lg border border-default">
            <li v-for="(t, index) in form.tasks" :key="t.taskId" class="flex items-center gap-2 px-3 py-2 text-sm">
              <span class="w-8 flex-none text-right text-dimmed">{{ index + 1 }}.</span>
              <NuxtLink :to="`/admin/tasks/${t.taskId}`" class="flex-1 min-w-0 truncate text-highlighted hover:text-primary">
                {{ titles[t.taskId] ?? `Задача #${t.taskId}` }}
              </NuxtLink>
              <USwitch v-model="t.isFree" label="бесплатно" size="sm" class="flex-none"/>
              <UButton icon="i-lucide-arrow-up" color="neutral" variant="ghost" size="xs" :disabled="index === 0" aria-label="Выше" @click="move(index, -1)"/>
              <UButton icon="i-lucide-arrow-down" color="neutral" variant="ghost" size="xs" :disabled="index === form.tasks.length - 1" aria-label="Ниже" @click="move(index, 1)"/>
              <UButton icon="i-lucide-x" color="error" variant="ghost" size="xs" aria-label="Убрать из сборника" @click="form.tasks.splice(index, 1)"/>
            </li>
            <li v-if="!form.tasks.length" class="px-3 py-6 text-center text-sm text-muted">В сборнике пока нет задач</li>
          </ol>

          <USelectMenu
              v-model="toAdd"
              :items="addItems"
              value-key="value"
              placeholder="Добавить задачу…"
              icon="i-lucide-plus"
              :search-input="{ placeholder: 'Поиск по названию или id' }"
              class="mt-2 w-full"
          />
        </div>

        <section v-if="!isNew" class="rounded-lg border border-default p-4 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <UIcon name="i-lucide-file-text" class="size-5 text-primary"/>
            <h2 class="font-medium text-highlighted">PDF сборника</h2>
            <UBadge v-if="pdfStatus?.upToDate" color="success" variant="subtle" size="sm">актуален</UBadge>
            <UBadge v-else-if="pdfStatus" color="warning" variant="subtle" size="sm">не собран или устарел</UBadge>
            <span v-if="pdfStatus?.upToDate && pdfStatus.builtAt" class="text-xs text-dimmed">
              собран {{ dateTimeFormat.format(new Date(pdfStatus.builtAt)) }} ·
              {{ ((pdfStatus.size ?? 0) / 1024).toFixed(0) }} КБ
            </span>
          </div>

          <p class="text-sm text-muted">
            Собирается из сохранённых задач сборника по шаблону XeLaTeX. Сборка занимает до полуминуты;
            пока содержимое не меняется, готовый файл берётся из кэша.
          </p>

          <div class="flex flex-wrap gap-2">
            <UButton
                icon="i-lucide-hammer"
                :loading="pdfBuilding"
                :disabled="dirty || pdfStatus?.upToDate"
                @click="buildPdf"
            >
              {{ pdfBuilding ? 'Собираю…' : 'Собрать PDF' }}
            </UButton>
            <UButton
                :disabled="!pdfStatus?.upToDate"
                :to="`/api/admin/collections/${collectionId}/pdf/download`"
                external
                icon="i-lucide-download"
                color="neutral"
                variant="outline"
            >
              Скачать
            </UButton>
            <UButton
                :disabled="!pdfStatus?.upToDate"
                :to="`/api/admin/collections/${collectionId}/pdf/download?stamp=1`"
                external
                icon="i-lucide-stamp"
                color="neutral"
                variant="ghost"
            >
              Образец с водяным знаком
            </UButton>
          </div>
          <p v-if="dirty" class="text-xs text-warning">Сначала сохраните изменения — PDF собирается из сохранённых данных.</p>

          <UAlert
              v-if="pdfStatus?.warnings.length"
              color="warning"
              variant="subtle"
              icon="i-lucide-triangle-alert"
              title="При переводе в LaTeX кое-что пропущено"
          >
            <template #description>
              <ul class="list-disc pl-4 text-xs">
                <li v-for="(w, i) in pdfStatus.warnings.slice(0, 10)" :key="i">{{ w }}</li>
              </ul>
            </template>
          </UAlert>

          <UAlert v-if="pdfError" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="pdfError.message">
            <template v-if="pdfError.log" #description>
              <pre class="mt-1 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{{ pdfError.log }}</pre>
            </template>
          </UAlert>
        </section>

        <div v-if="!isNew" class="flex border-t border-default pt-4">
          <UButton class="ml-auto" icon="i-lucide-trash-2" color="error" variant="soft" @click="remove">
            Удалить сборник
          </UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
