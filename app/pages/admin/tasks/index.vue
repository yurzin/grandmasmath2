<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Задачи — админка', robots: 'noindex' })

const route = useRoute()
const router = useRouter()

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const collection = ref<string>(typeof route.query.collection === 'string' ? route.query.collection : 'all')
const debouncedSearch = ref(search.value)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (debouncedSearch.value = value), 300)
})

const { data: collections } = await useFetch<AdminCollectionListItem[]>('/api/admin/collections')
const collectionItems = computed(() => [
  { label: 'Все задачи', value: 'all' },
  { label: 'Вне сборников', value: 'none' },
  ...(collections.value ?? []).map(c => ({ label: c.title, value: String(c.id) })),
])

const query = computed(() => ({
  q: debouncedSearch.value || undefined,
  collection: collection.value === 'all' ? undefined : collection.value,
}))
watch(query, q => router.replace({ query: q }))

const { data: tasks, status } = await useFetch<AdminTaskListItem[]>('/api/admin/tasks', { query })

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
</script>

<template>
  <UDashboardPanel id="admin-tasks">
    <template #header>
      <UDashboardNavbar title="Задачи">
        <template #right>
          <UButton to="/admin/tasks/new" icon="i-lucide-plus">Новая задача</UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col sm:flex-row gap-2">
        <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Поиск по заголовку, тексту или id"
            class="w-full sm:max-w-sm"
            :loading="status === 'pending'"
        />
        <USelect v-model="collection" :items="collectionItems" class="w-full sm:w-64"/>
        <span class="sm:ml-auto self-center text-sm text-muted">
          {{ plural(tasks?.length ?? 0, ['задача', 'задачи', 'задач']) }}
        </span>
      </div>

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm">
          <thead class="bg-muted text-left text-muted">
            <tr>
              <th class="px-3 py-2 w-14">id</th>
              <th class="px-3 py-2">Задача</th>
              <th class="px-3 py-2 hidden md:table-cell">Сборник</th>
              <th class="px-3 py-2 hidden lg:table-cell w-36">Изменена</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
                v-for="t in tasks"
                :key="t.id"
                class="cursor-pointer hover:bg-elevated"
                @click="navigateTo(`/admin/tasks/${t.id}`)"
            >
              <td class="px-3 py-2 text-dimmed">{{ t.id }}</td>
              <td class="px-3 py-2">
                <NuxtLink :to="`/admin/tasks/${t.id}`" class="font-medium text-highlighted" @click.stop>
                  {{ t.title ?? t.label }}
                </NuxtLink>
                <div v-if="t.title" class="text-xs text-dimmed">{{ t.label }}</div>
              </td>
              <td class="px-3 py-2 hidden md:table-cell text-muted">
                <div v-for="c in t.collections" :key="c.id">{{ c.title }}, №{{ c.position }}</div>
                <span v-if="!t.collections.length" class="text-dimmed">—</span>
              </td>
              <td class="px-3 py-2 hidden lg:table-cell text-dimmed">{{ dateFormat.format(new Date(t.updatedAt)) }}</td>
            </tr>
            <tr v-if="!tasks?.length">
              <td colspan="4" class="px-3 py-8 text-center text-muted">Ничего не найдено</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </UDashboardPanel>
</template>
