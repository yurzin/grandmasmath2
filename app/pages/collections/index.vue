<script setup lang="ts">
const { data: collections } = await useFetch<CollectionCard[]>('/api/collections')

useSeoMeta({ title: 'Сборники задач ЕГЭ' })
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
    <h1 class="font-display text-2xl sm:text-3xl font-semibold uppercase text-highlighted">Сборники задач</h1>
    <p class="mt-1 text-sm sm:text-base text-muted">Подробные решения задач ЕГЭ по темам. Каждый сборник — PDF и решения на сайте.</p>

    <p v-if="!collections?.length" class="mt-6 text-muted">Сборников пока нет.</p>

    <div class="mt-5 sm:mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <CollectionTile v-for="c in collections" :key="c.slug" :collection="c"/>
    </div>

    <p class="mt-6 text-sm text-muted">
      Нужны все сборники сразу? <NuxtLink to="/subscription" class="text-primary underline">Подписка</NuxtLink>
      открывает все решения, проверку ответов и PDF на выбранный срок.
    </p>
  </div>
</template>
