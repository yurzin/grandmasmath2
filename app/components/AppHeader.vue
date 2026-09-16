<script setup lang="ts">

import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const links = computed<NavigationMenuItem[]>(() => [{
  label: 'Главная',
  to: '/',
  icon: 'i-lucide-house',
  active: route.path === '/'
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
      <AppLogo class="h-20 w-auto"/>
    </template>

    <UNavigationMenu :items="links"/>

    <template #body>
      <UNavigationMenu :items="links" orientation="vertical"/>
    </template>
  </UHeader>
</template>