<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Icon } from '@iconify/vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import TapoControlPanel from '@/components/TapoControlPanel.vue'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const store = useAppStore()

const streamSrc = computed(() => decodeURIComponent(route.params.src as string))
const streamInfo = computed(() => store.streams[streamSrc.value])

// Tapo panel state
const showTapoPanel = ref(false)

// Extract camera IP from stream source (for Tapo cameras)
const cameraIp = computed(() => {
  // Try to extract IP from stream URL patterns like:
  // rtsp://user:pass@192.168.1.100:554/stream
  // tapo://user:pass@192.168.1.100
  const src = streamSrc.value
  const match = src.match(/@([\d.]+)[:\/]/) || src.match(/\/\/([\d.]+)[:\/]/)
  return match ? match[1] : ''
})

// Check if this looks like a Tapo camera (has IP and name contains 'tapo')
const isTapoCamera = computed(() => {
  return cameraIp.value && streamSrc.value.toLowerCase().includes('tapo')
})

// Fetch stream info on load
store.fetchStreams()
</script>

<template>
  <div class="animate-fade-in">
    <!-- Back Navigation -->
    <div class="mb-6">
      <RouterLink to="/" class="inline-flex items-center gap-2 hover:text-blue-400 transition-colors" style="color: var(--text-secondary)">
        <Icon icon="mdi:arrow-left" />
        Back to Dashboard
      </RouterLink>
    </div>

    <!-- Stream Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold" style="color: var(--text-primary)">{{ streamSrc }}</h1>
        <div class="flex items-center gap-2 mt-2">
          <span v-if="streamInfo?.producers?.length" class="badge badge-success">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Live
          </span>
          <span v-else class="badge badge-warning">
            Connecting...
          </span>
          <span v-if="streamInfo?.consumers?.length" class="badge badge-info">
            {{ streamInfo.consumers.length }} viewer{{ streamInfo.consumers.length !== 1 ? 's' : '' }}
          </span>
          <span v-if="isTapoCamera" class="badge bg-green-500/20 text-green-400">
            <Icon icon="mdi:cctv" class="mr-1" />
            Tapo
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Tapo Controls Button -->
        <button 
          v-if="cameraIp"
          @click="showTapoPanel = !showTapoPanel"
          class="btn"
          :class="showTapoPanel ? 'btn-primary' : 'btn-secondary'"
        >
          <Icon icon="mdi:cctv" />
          Camera Controls
        </button>

        <RouterLink :to="`/links/${encodeURIComponent(streamSrc)}`" class="btn btn-secondary">
          <Icon icon="mdi:link-variant" />
          Stream Links
        </RouterLink>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex gap-6">
      <!-- Video Player -->
      <div class="flex-1">
        <div class="max-w-5xl">
          <VideoPlayer 
            :src="streamSrc" 
            :mode="store.playbackMode"
            :autoplay="true"
          />
        </div>

        <!-- Stream Info -->
        <div v-if="streamInfo" class="max-w-5xl mt-6 grid md:grid-cols-2 gap-4">
          <!-- Producers -->
          <div class="card">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2" style="color: var(--text-primary)">
              <Icon icon="mdi:upload" class="text-green-400" />
              Producers
            </h3>
            <div v-if="streamInfo.producers?.length" class="space-y-3">
              <div 
                v-for="(producer, idx) in streamInfo.producers" 
                :key="idx"
                class="p-3 rounded-lg"
                style="background: var(--bg-secondary)"
              >
                <p class="text-sm font-mono break-all" style="color: var(--text-secondary)">
                  {{ producer.url || 'Unknown source' }}
                </p>
                <div v-if="producer.medias" class="flex flex-wrap gap-2 mt-2">
                  <span 
                    v-for="media in producer.medias" 
                    :key="media.kind"
                    class="badge badge-info"
                  >
                    {{ media.codec?.name || media.kind }}
                  </span>
                </div>
              </div>
            </div>
            <p v-else style="color: var(--text-muted)">No producers</p>
          </div>

          <!-- Consumers -->
          <div class="card">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2" style="color: var(--text-primary)">
              <Icon icon="mdi:download" class="text-blue-400" />
              Consumers
            </h3>
            <div v-if="streamInfo.consumers?.length" class="space-y-3">
              <div 
                v-for="(consumer, idx) in streamInfo.consumers" 
                :key="idx"
                class="p-3 rounded-lg"
                style="background: var(--bg-secondary)"
              >
                <p class="text-sm" style="color: var(--text-secondary)">
                  {{ consumer.remote_addr || 'Unknown' }}
                </p>
                <p v-if="consumer.user_agent" class="text-xs mt-1" style="color: var(--text-muted)">
                  {{ consumer.user_agent }}
                </p>
              </div>
            </div>
            <p v-else style="color: var(--text-muted)">No consumers</p>
          </div>
        </div>
      </div>

      <!-- Tapo Control Panel (Side Panel) -->
      <transition name="slide">
        <div 
          v-if="showTapoPanel && cameraIp" 
          class="shrink-0 w-80"
        >
          <div class="card sticky top-24">
            <TapoControlPanel 
              :camera-ip="cameraIp"
              :stream-name="streamSrc"
              @close="showTapoPanel = false"
            />
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
