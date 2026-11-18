<script setup lang="ts">
const links = [
  { label: 'Контакты', to: '/contacts' },
  { label: 'Оферта', to: '/offer' },
  { label: 'Политика конфиденциальности', to: '/privacy' },
]
</script>

<template>
  <UFooter class="border-t border-default">
    <template #left>
      <p class="text-muted text-sm">© {{ new Date().getFullYear() }} Бабушкина математика</p>
    </template>

    <nav class="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
      <NuxtLink v-for="l in links" :key="l.to" :to="l.to" class="text-muted hover:text-highlighted transition-colors">
        {{ l.label }}
      </NuxtLink>
    </nav>
  </UFooter>
</template>
