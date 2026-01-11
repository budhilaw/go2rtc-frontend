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
  { 
    id: 'rtsp', 
    name: 'RTSP Camera', 
    icon: 'mdi:cctv', 
    color: 'blue',
    description: 'Connect to RTSP/RTSPS streams'
  },
  { 
    id: 'rtmp', 
    name: 'RTMP Stream', 
    icon: 'mdi:broadcast', 
    color: 'red',
    description: 'Connect to RTMP streams'
  },
  { 
    id: 'onvif', 
    name: 'ONVIF Camera', 
    icon: 'mdi:camera-outline', 
    color: 'green',
    description: 'Auto-discover ONVIF cameras'
  },
  { 
    id: 'ffmpeg', 
    name: 'FFmpeg', 
    icon: 'mdi:movie-open', 
    color: 'orange',
    description: 'Use FFmpeg for custom sources'
  },
  { 
    id: 'homekit', 
    name: 'HomeKit', 
    icon: 'mdi:apple', 
    color: 'gray',
    description: 'Connect HomeKit cameras'
  },
  { 
    id: 'hass', 
    name: 'Home Assistant', 
    icon: 'mdi:home-assistant', 
    color: 'cyan',
    description: 'Import from Home Assistant'
  },
  { 
    id: 'nest', 
    name: 'Google Nest', 
    icon: 'mdi:google', 
    color: 'yellow',
    description: 'Connect Nest cameras'
  },
  { 
    id: 'ring', 
    name: 'Ring', 
    icon: 'mdi:doorbell-video', 
    color: 'blue',
    description: 'Connect Ring doorbells/cameras'
  },
  { 
    id: 'aqara', 
    name: 'Aqara', 
    icon: 'mdi:home-automation', 
    color: 'orange',
    description: 'Connect Aqara cameras'
  },
  { 
    id: 'tapo', 
    name: 'TP-Link Tapo', 
    icon: 'mdi:router-wireless', 
    color: 'green',
    description: 'Connect Tapo cameras'
  },
  { 
    id: 'echo', 
    name: 'Amazon Echo', 
    icon: 'mdi:amazon-alexa', 
    color: 'cyan',
    description: 'Connect Echo Show cameras'
  },
  { 
    id: 'http', 
    name: 'HTTP/HTTPS', 
    icon: 'mdi:web', 
    color: 'purple',
    description: 'Connect to HTTP streams'
  },
]

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
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
    <div class="mb-8">
      <h1 class="text-3xl font-bold gradient-text">Add Stream</h1>
      <p class="mt-1" style="color: var(--text-secondary)">
        Choose a source type to add a new stream
      </p>
    </div>

    <!-- Source Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <button
        v-for="source in streamSources"
        :key="source.id"
        @click="openModal(source)"
        class="card text-left group hover:scale-[1.02] transition-all"
      >
        <div 
          class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border transition-colors"
          :class="colorClasses[source.color]"
        >
          <Icon :icon="source.icon" class="text-2xl" />
        </div>
        <h3 class="font-semibold mb-1" style="color: var(--text-primary)">{{ source.name }}</h3>
        <p class="text-sm" style="color: var(--text-muted)">{{ source.description }}</p>
      </button>
    </div>

    <!-- Add Stream Modal -->
    <Teleport to="body">
      <transition name="fade">
        <div 
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px)"
          @click.self="closeModal"
        >
          <div class="glass-card w-full max-w-md p-6 animate-fade-in">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-3">
                <div 
                  v-if="selectedSource"
                  class="w-10 h-10 rounded-lg flex items-center justify-center"
                  :class="colorClasses[selectedSource.color]"
                >
                  <Icon :icon="selectedSource.icon" class="text-xl" />
                </div>
                <h2 class="text-xl font-bold" style="color: var(--text-primary)">
                  Add {{ selectedSource?.name }}
                </h2>
              </div>
              <button @click="closeModal" class="btn-icon btn-ghost">
                <Icon icon="mdi:close" class="text-xl" />
              </button>
            </div>

            <form @submit.prevent="addStream" class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
                  Stream Name
                </label>
                <input
                  v-model="streamName"
                  type="text"
                  class="input"
                  placeholder="my_camera"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
                  Stream URL
                </label>
                <input
                  v-model="streamUrl"
                  type="text"
                  class="input font-mono text-sm"
                  :placeholder="getPlaceholderUrl(selectedSource?.id || '')"
                  required
                />
              </div>

              <div v-if="error" class="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p class="text-sm text-red-400">{{ error }}</p>
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <button type="button" @click="closeModal" class="btn btn-secondary">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  class="btn btn-primary"
                  :disabled="isSubmitting"
                >
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
