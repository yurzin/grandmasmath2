<script setup lang="ts">
</script>

<template>
  <!-- Знак из логотипа (обрезаем подпись картинки) + та же надпись текстом: так она читается и в компактной шапке. -->
  <NuxtLink to="/" class="flex items-center gap-2.5 transition-opacity hover:opacity-80" aria-label="Бабушкина математика — на главную">
    <span class="logo-mark">
      <img src="~/assets/img/logo.png" alt="" width="48" height="61">
    </span>
    <span class="flex flex-col leading-none text-highlighted">
      <span class="font-display font-bold text-lg sm:text-xl tracking-wider">БАБУШКИНА</span>
      <span class="logo-script text-lg sm:text-xl -mt-0.5">математика</span>
    </span>
  </NuxtLink>
</template>

<style scoped>
/* Знак занимает верхние ~72% картинки, ниже — надпись. */
.logo-mark {
  display: block;
  flex: none;
  width: 48px;
  height: 44px;
  overflow: hidden;
  border-radius: 0.5rem;
}

.logo-mark img {
  display: block;
  width: 48px;
  height: 61px;
  max-width: none;
}

/* В тёмной теме тёмно-синий знак не виден на тёмном фоне — кладём его на светлую плашку. */
.dark .logo-mark {
  background: var(--color-ink-50);
  padding: 2px 3px 0;
  box-sizing: content-box;
  height: 40px;
}

.dark .logo-mark img {
  width: 44px;
  height: 56px;
}

.logo-script {
  font-family: 'Marck Script', 'Segoe Script', cursive;
}
</style>
