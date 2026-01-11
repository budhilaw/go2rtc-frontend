<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { streamsApi } from '@/services/api'
import type { StreamSource } from '@/types'

const router = useRouter()
const showModal = ref(false)
const selectedSource = ref<StreamSource | null>(null)
const streamName = ref('')
const streamUrl = ref('')
const isSubmitting = ref(false)
const error = ref<string | null>(null)

const streamSources: StreamSource[] = [
  { id: 'rtsp', name: 'RTSP Camera', icon: 'mdi:cctv', color: 'blue', description: 'Connect to RTSP/RTSPS streams' },
  { id: 'rtmp', name: 'RTMP Stream', icon: 'mdi:broadcast', color: 'red', description: 'Connect to RTMP streams' },
  { id: 'onvif', name: 'ONVIF Camera', icon: 'mdi:camera-outline', color: 'green', description: 'Auto-discover ONVIF cameras' },
  { id: 'ffmpeg', name: 'FFmpeg', icon: 'mdi:movie-open-outline', color: 'orange', description: 'Use FFmpeg for custom sources' },
  { id: 'homekit', name: 'HomeKit', icon: 'mdi:apple', color: 'gray', description: 'Connect HomeKit cameras' },
  { id: 'hass', name: 'Home Assistant', icon: 'mdi:home-assistant', color: 'cyan', description: 'Import from Home Assistant' },
  { id: 'nest', name: 'Google Nest', icon: 'mdi:google', color: 'yellow', description: 'Connect Nest cameras' },
  { id: 'ring', name: 'Ring', icon: 'mdi:doorbell-video', color: 'blue', description: 'Connect Ring doorbells/cameras' },
  { id: 'aqara', name: 'Aqara', icon: 'mdi:home-automation', color: 'orange', description: 'Connect Aqara cameras' },
  { id: 'tapo', name: 'TP-Link Tapo', icon: 'mdi:router-wireless', color: 'green', description: 'Connect Tapo cameras' },
  { id: 'echo', name: 'Amazon Echo', icon: 'mdi:amazon-alexa', color: 'cyan', description: 'Connect Echo Show cameras' },
  { id: 'http', name: 'HTTP/HTTPS', icon: 'mdi:web', color: 'purple', description: 'Connect to HTTP streams' },
]

const colorStyles = {
  blue: { bg: 'var(--info-muted)', text: 'var(--info)', border: 'rgba(59, 130, 246, 0.2)' },
  red: { bg: 'var(--danger-muted)', text: 'var(--danger)', border: 'rgba(239, 68, 68, 0.2)' },
  green: { bg: 'var(--success-muted)', text: 'var(--success)', border: 'rgba(34, 197, 94, 0.2)' },
  orange: { bg: 'var(--warning-muted)', text: 'var(--warning)', border: 'rgba(234, 179, 8, 0.2)' },
  gray: { bg: 'rgba(113, 113, 122, 0.15)', text: '#a1a1aa', border: 'rgba(113, 113, 122, 0.2)' },
  cyan: { bg: 'var(--accent-secondary-muted)', text: 'var(--accent-secondary)', border: 'rgba(6, 182, 212, 0.2)' },
  yellow: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: 'rgba(234, 179, 8, 0.2)' },
  purple: { bg: 'var(--accent-primary-muted)', text: 'var(--accent-primary)', border: 'rgba(139, 92, 246, 0.2)' },
}

function getStyle(color: string) {
  return colorStyles[color as keyof typeof colorStyles] || colorStyles.blue
}

function openModal(source: StreamSource) {
  selectedSource.value = source
  streamName.value = ''
  streamUrl.value = getPlaceholderUrl(source.id)
  error.value = null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedSource.value = null
}

function getPlaceholderUrl(sourceId: string): string {
  switch (sourceId) {
    case 'rtsp': return 'rtsp://user:pass@192.168.1.100:554/stream1'
    case 'rtmp': return 'rtmp://server/live/stream'
    case 'onvif': return 'onvif://user:pass@192.168.1.100:80'
    case 'ffmpeg': return 'ffmpeg:device#video=Camera'
    case 'homekit': return 'homekit://device-id'
    case 'hass': return 'hass://camera.entity_id'
    case 'nest': return 'nest://device-id'
    case 'ring': return 'ring://device-id'
    case 'tapo': return 'tapo://user:pass@192.168.1.100'
    case 'http': return 'http://example.com/stream.m3u8'
    default: return ''
  }
}

async function addStream() {
  if (!streamName.value || !streamUrl.value) {
    error.value = 'Please fill in all fields'
    return
  }

  isSubmitting.value = true
  error.value = null

  try {
    await streamsApi.add(streamName.value, streamUrl.value)
    closeModal()
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to add stream'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="animate-fade-in">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">Add Stream</h1>
      <p class="page-subtitle">Choose a source type to add a new stream</p>
    </div>

    <!-- Source Grid -->
    <div class="source-grid">
      <button
        v-for="source in streamSources"
        :key="source.id"
        @click="openModal(source)"
        class="source-card"
      >
        <div 
          class="source-icon"
          :style="{ 
            background: getStyle(source.color).bg, 
            color: getStyle(source.color).text,
            borderColor: getStyle(source.color).border
          }"
        >
          <Icon :icon="source.icon" />
        </div>
        <h3 class="source-name">{{ source.name }}</h3>
        <p class="source-desc">{{ source.description }}</p>
      </button>
    </div>

    <!-- Add Stream Modal -->
    <Teleport to="body">
      <transition name="fade">
        <div 
          v-if="showModal"
          class="modal-overlay"
          @click.self="closeModal"
        >
          <div class="modal-content animate-scale-in">
            <div class="modal-header">
              <div class="modal-title-row">
                <div 
                  v-if="selectedSource"
                  class="source-icon small"
                  :style="{ 
                    background: getStyle(selectedSource.color).bg, 
                    color: getStyle(selectedSource.color).text 
                  }"
                >
                  <Icon :icon="selectedSource.icon" />
                </div>
                <h2 class="modal-title">Add {{ selectedSource?.name }}</h2>
              </div>
              <button @click="closeModal" class="btn-icon">
                <Icon icon="mdi:close" />
              </button>
            </div>

            <form @submit.prevent="addStream" class="modal-form">
              <div class="form-group">
                <label class="form-label">Stream Name</label>
                <input
                  v-model="streamName"
                  type="text"
                  class="input"
                  placeholder="my_camera"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Stream URL</label>
                <input
                  v-model="streamUrl"
                  type="text"
                  class="input mono"
                  :placeholder="getPlaceholderUrl(selectedSource?.id || '')"
                  required
                />
              </div>

              <div v-if="error" class="error-box">
                <Icon icon="mdi:alert-circle-outline" />
                <span>{{ error }}</span>
              </div>

              <div class="modal-actions">
                <button type="button" @click="closeModal" class="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                  <Icon v-if="isSubmitting" icon="mdi:loading" class="animate-spin" />
                  <Icon v-else icon="mdi:plus" />
                  Add Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

/* Source Grid */
.source-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 768px) {
  .source-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .source-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.source-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1.25rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.source-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}

.source-icon {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  border: 1px solid;
}

.source-icon.small {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.25rem;
  margin-bottom: 0;
}

.source-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.source-desc {
  font-size: 0.8125rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.modal-content {
  width: 100%;
  max-width: 28rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.mono {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.8125rem;
}

.error-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--danger-muted);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-lg);
  color: var(--danger);
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
