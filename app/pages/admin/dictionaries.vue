<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Справочники — админка', robots: 'noindex' })

const toast = useToast()

const { data: topics, refresh: refreshTopics } = await useFetch<AdminTopic[]>('/api/admin/topics')
const { data: taskTypes, refresh: refreshTaskTypes } = await useFetch<AdminTaskType[]>('/api/admin/task-types')

const topicModal = reactive({ open: false, item: null as AdminTopic | null })
const taskTypeModal = reactive({ open: false, item: null as AdminTaskType | null })

function editTopic(item: AdminTopic | null) {
  topicModal.item = item
  topicModal.open = true
}
function editTaskType(item: AdminTaskType | null) {
  taskTypeModal.item = item
  taskTypeModal.open = true
}

async function remove(url: string, question: string, refresh: () => Promise<void>) {
  if (!confirm(question)) return
  try {
    await $fetch(url, { method: 'DELETE' })
    toast.add({ title: 'Удалено', color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: 'Не удалось удалить', description: errorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

const levelLabel: Record<ExamLevel, string> = { profile: 'профиль', base: 'база' }
</script>

<template>
  <UDashboardPanel id="admin-dictionaries">
    <template #header>
      <UDashboardNavbar title="Справочники"/>
    </template>

    <template #body>
      <div class="grid gap-6 xl:grid-cols-2 max-w-6xl">
        <section>
          <div class="mb-2 flex items-center">
            <h2 class="font-medium text-highlighted">Номера ЕГЭ</h2>
            <UButton class="ml-auto" icon="i-lucide-plus" size="sm" @click="editTaskType(null)">Добавить</UButton>
          </div>
          <div class="overflow-x-auto rounded-lg border border-default">
            <table class="w-full text-sm">
              <thead class="bg-muted text-left text-muted">
                <tr>
                  <th class="px-3 py-2 w-24">Номер</th>
                  <th class="px-3 py-2">Название</th>
                  <th class="px-3 py-2 text-right w-20">Задач</th>
                  <th class="w-20"/>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="tt in taskTypes" :key="tt.id">
                  <td class="px-3 py-2 whitespace-nowrap">№{{ tt.number }} <span class="text-dimmed">{{ levelLabel[tt.examLevel] }}</span></td>
                  <td class="px-3 py-2 text-highlighted">{{ tt.name }}</td>
                  <td class="px-3 py-2 text-right text-muted">{{ tt.taskCount }}</td>
                  <td class="px-2 py-1 text-right whitespace-nowrap">
                    <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs" aria-label="Изменить" @click="editTaskType(tt)"/>
                    <UButton
                        icon="i-lucide-trash-2"
                        color="error"
                        variant="ghost"
                        size="xs"
                        aria-label="Удалить"
                        :disabled="tt.taskCount > 0"
                        :title="tt.taskCount > 0 ? 'Используется в задачах' : undefined"
                        @click="remove(`/api/admin/task-types/${tt.id}`, `Удалить №${tt.number} (${levelLabel[tt.examLevel]}) — «${tt.name}»?`, refreshTaskTypes)"
                    />
                  </td>
                </tr>
                <tr v-if="!taskTypes?.length">
                  <td colspan="4" class="px-3 py-6 text-center text-muted">Пока пусто</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div class="mb-2 flex items-center">
            <h2 class="font-medium text-highlighted">Темы</h2>
            <UButton class="ml-auto" icon="i-lucide-plus" size="sm" @click="editTopic(null)">Добавить</UButton>
          </div>
          <div class="overflow-x-auto rounded-lg border border-default">
            <table class="w-full text-sm">
              <thead class="bg-muted text-left text-muted">
                <tr>
                  <th class="px-3 py-2">Название</th>
                  <th class="px-3 py-2 hidden sm:table-cell">Адрес</th>
                  <th class="px-3 py-2 text-right w-20">Задач</th>
                  <th class="w-20"/>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="t in topics" :key="t.id">
                  <td class="px-3 py-2 text-highlighted">{{ t.name }}</td>
                  <td class="px-3 py-2 hidden sm:table-cell text-dimmed">{{ t.slug }}</td>
                  <td class="px-3 py-2 text-right text-muted">{{ t.taskCount }}</td>
                  <td class="px-2 py-1 text-right whitespace-nowrap">
                    <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs" aria-label="Изменить" @click="editTopic(t)"/>
                    <UButton
                        icon="i-lucide-trash-2"
                        color="error"
                        variant="ghost"
                        size="xs"
                        aria-label="Удалить"
                        :disabled="t.taskCount > 0"
                        :title="t.taskCount > 0 ? 'Используется в задачах' : undefined"
                        @click="remove(`/api/admin/topics/${t.id}`, `Удалить тему «${t.name}»?`, refreshTopics)"
                    />
                  </td>
                </tr>
                <tr v-if="!topics?.length">
                  <td colspan="4" class="px-3 py-6 text-center text-muted">Пока пусто</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AdminTopicModal v-model:open="topicModal.open" :item="topicModal.item" @saved="refreshTopics()"/>
      <AdminTaskTypeModal v-model:open="taskTypeModal.open" :item="taskTypeModal.item" @saved="refreshTaskTypes()"/>
    </template>
  </UDashboardPanel>
</template>
