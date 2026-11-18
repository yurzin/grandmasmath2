<script setup lang="ts">
useSeoMeta({ title: 'Политика обработки персональных данных' })
</script>

<template>
  <div class="max-w-3xl mx-auto p-3 sm:p-6">
    <h1 class="text-xl sm:text-2xl font-semibold text-highlighted">Политика обработки персональных данных</h1>
    <!-- TODO(владелец): текст политики по 152-ФЗ (оператор, какие данные — email, цели — вход и
         выдача покупок, сроки хранения, где хранятся, права субъекта, контакты). -->
    <UAlert
        class="mt-4"
        color="warning"
        variant="subtle"
        icon="i-lucide-file-pen"
        title="Текст политики готовится"
        description="До начала продаж здесь будет размещена политика обработки персональных данных."
    />
  </div>
</template>
