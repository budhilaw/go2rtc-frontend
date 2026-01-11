<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { StreamInfo } from '@/types'

const props = defineProps<{
  name: string
  info: StreamInfo | null
}>()

const emit = defineEmits<{
  delete: [name: string]
  probe: [name: string]
}>()

const isOnline = computed(() => {
  return props.info && (
    (props.info.producers?.length ?? 0) > 0 || 
    (props.info.consumers?.length ?? 0) > 0
  )
})

const producerCount = computed(() => props.info?.producers?.length ?? 0)
const consumerCount = computed(() => props.info?.consumers?.length ?? 0)

const codec = computed(() => {
  const producer = props.info?.producers?.[0]
  if (!producer?.medias) return null
  const video = producer.medias.find(m => m.kind === 'video')
  return video?.codec?.name || null
})
</script>

<template>
  <div class="card group animate-fade-in">
    <div class="flex flex-col gap-4">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div 
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            :class="isOnline ? 'bg-green-500/20' : 'bg-gray-500/20'"
          >
            <Icon 
              :icon="isOnline ? 'mdi:video' : 'mdi:video-off'" 
              class="text-xl"
              :style="{ color: isOnline ? 'var(--accent-success)' : 'var(--text-muted)' }"
            />
          </div>
          <div>
            <h3 class="font-semibold" style="color: var(--text-primary)">{{ name }}</h3>
            <div class="flex items-center gap-2 mt-0.5">
              <span 
                class="badge"
                :class="isOnline ? 'badge-success' : 'badge-warning'"
              >
                <span 
                  class="w-1.5 h-1.5 rounded-full"
                  :class="isOnline ? 'bg-green-500 animate-pulse-glow' : 'bg-yellow-500'"
                ></span>
                {{ isOnline ? 'Online' : 'Offline' }}
              </span>
              <span v-if="codec" class="badge badge-info">{{ codec }}</span>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="flex items-center gap-4 text-sm" style="color: var(--text-secondary)">
          <div class="flex items-center gap-1" title="Producers">
            <Icon icon="mdi:upload" />
            <span>{{ producerCount }}</span>
          </div>
          <div class="flex items-center gap-1" title="Consumers">
            <Icon icon="mdi:download" />
            <span>{{ consumerCount }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 pt-2 border-t" style="border-color: var(--border-color)">
        <RouterLink 
          :to="`/stream/${encodeURIComponent(name)}`" 
          class="btn btn-primary flex-1"
        >
          <Icon icon="mdi:play" />
          <span>Play</span>
        </RouterLink>
        
        <RouterLink 
          :to="`/links/${encodeURIComponent(name)}`"
          class="btn btn-secondary"
          title="Stream Links"
        >
          <Icon icon="mdi:link-variant" />
        </RouterLink>

        <button 
          @click="emit('probe', name)"
          class="btn btn-secondary"
          title="Probe Stream"
        >
          <Icon icon="mdi:magnify" />
        </button>

        <button 
          @click="emit('delete', name)"
          class="btn btn-ghost hover:text-red-500"
          title="Delete Stream"
        >
          <Icon icon="mdi:delete-outline" />
        </button>
      </div>
    </div>
  </div>
</template>
