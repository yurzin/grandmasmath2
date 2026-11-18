<script setup lang="ts">
// HTML готовится на сервере (Markdown + KaTeX, см. server/utils/markdown.ts).
defineProps<{ html: string }>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="math-content" v-html="html"/>
</template>
