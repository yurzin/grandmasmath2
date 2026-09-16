<script setup lang="ts">
interface Task {
  id: number
  title: string
  description: string
  height: number
}

const { data: pins } = await useFetch<Task[]>('/api/tasks')
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4">
      <NuxtLink
        v-for="pin in pins"
        :key="pin.id"
        :to="`/tasks/${pin.id}`"
        class="block mb-4 break-inside-avoid rounded-lg overflow-hidden border border-default bg-default"
      >
        <div
          class="flex items-center justify-center bg-muted text-dimmed"
          :style="{ height: pin.height + 'px' }"
        >
          <UIcon name="i-lucide-image" class="size-8"/>
        </div>
        <p class="p-3 text-sm text-muted">
          {{ pin.description }}
        </p>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>

</style>
