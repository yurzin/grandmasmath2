<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const { loggedIn } = useUserSession()

const links = computed<NavigationMenuItem[]>(() => [{
  label: 'Задачи',
  to: '/tasks',
  icon: 'i-lucide-list-checks',
  active: route.path === '/tasks' || route.path.startsWith('/tasks/')
}, {
  label: 'Сборники',
  to: '/collections',
  icon: 'i-lucide-book-open',
  active: route.path.startsWith('/collections')
}, {
  label: 'Подписка',
  to: '/subscription',
  icon: 'i-lucide-calendar-check',
  active: route.path.startsWith('/subscription')
}, {
  label: 'О нас',
  to: '/about',
  icon: 'i-lucide-info',
  active: route.path.startsWith('/about')
}])
</script>

<template>
  <UHeader>
    <template #left>
      <AppLogo/>
    </template>

    <UNavigationMenu :items="links" variant="link"/>

    <template #right>
      <UColorModeButton color="neutral" variant="ghost"/>
      <UButton
          v-if="loggedIn"
          to="/account"
          class="lg:-mr-2.5"
          icon="i-lucide-user"
          color="neutral"
          variant="ghost"
      >
        <span class="hidden sm:inline">Мои покупки</span>
      </UButton>
      <UButton v-else to="/login" icon="i-lucide-log-in" color="neutral" variant="ghost" class="lg:-mr-2.5">
        <span class="hidden sm:inline">Войти</span>
      </UButton>
    </template>

    <template #body>
      <UNavigationMenu :items="links" orientation="vertical"/>
    </template>
  </UHeader>
</template>
