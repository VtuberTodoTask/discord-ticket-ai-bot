<template>
  <div class="card stat-card" :style="{ borderLeftColor: color }">
    <div class="card-body">
      <div class="stat-label">{{ label }}</div>
      <div class="stat-value" :style="{ color }">{{ value }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: number | string
  color: string
}>()
</script>
