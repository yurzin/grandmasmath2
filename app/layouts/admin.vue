<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { user, clear } = useUserSession()

// Значок «на проверке» у пункта «Задачи»; обновляется после кнопки «Проверено» (refreshNuxtData).
const { data: review } = await useFetch<{ count: number }>('/api/admin/tasks/review-count', { key: 'admin-review-count' })

const links = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Задачи',
    icon: 'i-lucide-list-checks',
    to: '/admin/tasks',
    badge: review.value?.count ? { label: String(review.value.count), color: 'warning', variant: 'subtle' } : undefined,
  },
  { label: 'Сборники', icon: 'i-lucide-book-open', to: '/admin/collections' },
  { label: 'Справочники', icon: 'i-lucide-tags', to: '/admin/dictionaries' },
  { label: 'Продажи', icon: 'i-lucide-receipt', to: '/admin/sales' },
])

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/admin/login')
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <NuxtLink to="/admin/tasks" class="flex items-center gap-2 font-semibold text-highlighted">
          <UIcon name="i-lucide-shield" class="size-5 text-primary"/>
          <span v-if="!collapsed">Админка</span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :items="links" :collapsed="collapsed" orientation="vertical"/>
        <UNavigationMenu
            :items="[{ label: 'Открыть сайт', icon: 'i-lucide-external-link', to: '/', target: '_blank' }]"
            :collapsed="collapsed"
            orientation="vertical"
            class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex w-full items-center gap-2">
          <UIcon name="i-lucide-user" class="size-4 text-muted flex-none"/>
          <span v-if="!collapsed" class="flex-1 truncate text-sm text-muted">{{ user?.email }}</span>
          <UButton
              icon="i-lucide-log-out"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Выйти"
              @click="logout"
          />
        </div>
      </template>
    </UDashboardSidebar>

    <slot/>
  </UDashboardGroup>
</template>
