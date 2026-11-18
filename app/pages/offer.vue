<script setup lang="ts">
useSeoMeta({ title: 'Публичная оферта' })
</script>

<template>
  <div class="max-w-3xl mx-auto p-3 sm:p-6">
    <h1 class="text-xl sm:text-2xl font-semibold text-highlighted">Публичная оферта</h1>
    <!-- TODO(владелец): разместить текст договора-оферты на продажу электронных сборников
         (продавец, ИНН, предмет, цена и оплата, порядок передачи файла, возвраты, контакты). -->
    <UAlert
        class="mt-4"
        color="warning"
        variant="subtle"
        icon="i-lucide-file-pen"
        title="Текст оферты готовится"
        description="До начала продаж здесь будет размещён договор-оферта."
    />
  </div>
</template>
