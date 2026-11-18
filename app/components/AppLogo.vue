<script setup lang="ts">
</script>

<template>
  <!-- Знак «БМ под корнем» (тот же, что public/favicon.svg) + надпись. Цвет знака — currentColor, поэтому он сам подстраивается под тему. -->
  <NuxtLink to="/" class="flex items-center gap-2.5 text-highlighted transition-opacity hover:opacity-80" aria-label="Бабушкина математика — на главную">
    <svg class="flex-none size-11 sm:size-12" viewBox="4 9 56 44" fill="none" stroke="currentColor" stroke-width="4" aria-hidden="true">
      <path d="M6 36 L11 33.5 L18 50 L27 13 H57" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M39.7 24.4 H32.1 V46 H36.1 A6.2 6.2 0 0 0 36.1 33.6 H32.1" stroke-width="3.2"/>
      <path d="M44.8 46 V24.4 L49.5 42 L54.2 24.4 V46" stroke-width="3.2" stroke-miterlimit="3"/>
    </svg>
    <span class="flex flex-col leading-none">
      <span class="font-display font-bold text-lg sm:text-xl tracking-wider">БАБУШКИНА</span>
      <span class="logo-serif text-base sm:text-lg -mt-1">математика</span>
    </span>
  </NuxtLink>
</template>

<style scoped>
/* Курсив с засечками, как в учебнике. */
.logo-serif {
  font-family: 'PT Serif', Georgia, serif;
  font-style: italic;
}
</style>
