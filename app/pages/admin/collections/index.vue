<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Сборники — админка', robots: 'noindex' })

const { data: collections } = await useFetch<AdminCollectionListItem[]>('/api/admin/collections')

const statusLabel: Record<CollectionStatus, { label: string, color: 'success' | 'neutral' | 'warning' }> = {
  published: { label: 'опубликован', color: 'success' },
  draft: { label: 'черновик', color: 'warning' },
  archived: { label: 'в архиве', color: 'neutral' },
}
</script>

<template>
  <UDashboardPanel id="admin-collections">
    <template #header>
      <UDashboardNavbar title="Сборники">
        <template #right>
          <UButton to="/admin/collections/new" icon="i-lucide-plus">Новый сборник</UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm">
          <thead class="bg-muted text-left text-muted">
            <tr>
              <th class="px-3 py-2">Название</th>
              <th class="px-3 py-2">Статус</th>
              <th class="px-3 py-2 text-right">Задач</th>
              <th class="px-3 py-2 text-right hidden sm:table-cell">Цена</th>
              <th class="px-3 py-2 text-right hidden sm:table-cell">Версия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
                v-for="c in collections"
                :key="c.id"
                class="cursor-pointer hover:bg-elevated"
                @click="navigateTo(`/admin/collections/${c.id}`)"
            >
              <td class="px-3 py-2">
                <NuxtLink :to="`/admin/collections/${c.id}`" class="font-medium text-highlighted" @click.stop>{{ c.title }}</NuxtLink>
                <div class="text-xs text-dimmed">/collections/{{ c.slug }}</div>
              </td>
              <td class="px-3 py-2">
                <UBadge :color="statusLabel[c.status].color" variant="subtle" size="sm">{{ statusLabel[c.status].label }}</UBadge>
              </td>
              <td class="px-3 py-2 text-right">{{ c.taskCount }}</td>
              <td class="px-3 py-2 text-right hidden sm:table-cell">{{ c.price != null ? `${c.price} ₽` : '—' }}</td>
              <td class="px-3 py-2 text-right hidden sm:table-cell text-muted">{{ c.version }}</td>
            </tr>
            <tr v-if="!collections?.length">
              <td colspan="5" class="px-3 py-8 text-center text-muted">Сборников пока нет</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </UDashboardPanel>
</template>
