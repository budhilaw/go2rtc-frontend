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
  <div class="stream-card">
    <!-- Header -->
    <div class="card-header">
      <div class="card-info">
        <div class="status-icon" :class="{ online: isOnline }">
          <Icon :icon="isOnline ? 'mdi:video' : 'mdi:video-off'" />
        </div>
        <div class="card-text">
          <h3 class="card-title">{{ name }}</h3>
          <div class="card-badges">
            <span class="status-badge" :class="isOnline ? 'online' : 'offline'">
              <span class="status-dot"></span>
              {{ isOnline ? 'Online' : 'Offline' }}
            </span>
            <span v-if="codec" class="codec-badge">{{ codec }}</span>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="card-stats">
        <div class="stat" title="Producers">
          <Icon icon="mdi:arrow-up" />
          <span>{{ producerCount }}</span>
        </div>
        <div class="stat" title="Consumers">
          <Icon icon="mdi:arrow-down" />
          <span>{{ consumerCount }}</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="card-actions">
      <RouterLink 
        :to="`/stream/${encodeURIComponent(name)}`" 
        class="btn btn-primary action-play"
      >
        <Icon icon="mdi:play" />
        <span>Play</span>
      </RouterLink>
      
      <RouterLink 
        :to="`/links/${encodeURIComponent(name)}`"
        class="btn-icon"
        title="Stream Links"
      >
        <Icon icon="mdi:link-variant" />
      </RouterLink>

      <button 
        @click="emit('probe', name)"
        class="btn-icon"
        title="Probe Stream"
      >
        <Icon icon="mdi:magnify" />
      </button>

      <button 
        @click="emit('delete', name)"
        class="btn-icon delete-btn"
        title="Delete Stream"
      >
        <Icon icon="mdi:delete-outline" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.stream-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
  transition: all var(--transition-fast);
}

.stream-card:hover {
  border-color: var(--border-hover);
}

/* Header */
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.card-info {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  min-width: 0;
  flex: 1;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-lg);
  background: var(--bg-hover);
  color: var(--text-muted);
  font-size: 1.25rem;
  flex-shrink: 0;
}

.status-icon.online {
  background: var(--success-muted);
  color: var(--success);
}

.card-text {
  min-width: 0;
  flex: 1;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  word-break: break-word;
  line-height: 1.3;
}

.card-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-badge.online {
  background: var(--success-muted);
  color: var(--success);
}

.status-badge.offline {
  background: var(--warning-muted);
  color: var(--warning);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge.online .status-dot {
  animation: pulse 2s ease-in-out infinite;
}

.codec-badge {
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--info-muted);
  color: var(--info);
  text-transform: uppercase;
}

/* Stats */
.card-stats {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

/* Actions */
.card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.action-play {
  flex: 1;
}

.delete-btn:hover {
  background: var(--danger-muted);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.2);
}
</style>
