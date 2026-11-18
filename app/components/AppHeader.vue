<script setup lang="ts">

import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const { loggedIn } = useUserSession()

const links = computed<NavigationMenuItem[]>(() => [{
  label: 'Главная',
  to: '/',
  icon: 'i-lucide-house',
  active: route.path === '/'
}, {
  label: 'Сборники',
  to: '/collections',
  icon: 'i-lucide-book-open',
  active: route.path.startsWith('/collections')
}, {
  label: 'О нас',
  to: '/about',
  icon: 'i-lucide-info',
  active: route.path.startsWith('/about')
}, {
  label: 'Контакты',
  to: '/contacts',
  icon: 'i-lucide-phone',
  active: route.path.startsWith('/contacts')
}
])
</script>

<template>
  <UHeader>
    <template #left>
      <AppLogo class="h-14 sm:h-20 w-auto"/>
    </template>

    <UNavigationMenu :items="links"/>

    <template #right>
      <UButton
          v-if="loggedIn"
          to="/account"
          icon="i-lucide-user"
          color="neutral"
          variant="ghost"
      >
        <span class="hidden sm:inline">Мои покупки</span>
      </UButton>
      <UButton v-else to="/login" icon="i-lucide-log-in" color="neutral" variant="ghost">
        <span class="hidden sm:inline">Войти</span>
      </UButton>
    </template>

    <template #body>
      <UNavigationMenu :items="links" orientation="vertical"/>
    </template>
  </UHeader>
</template>