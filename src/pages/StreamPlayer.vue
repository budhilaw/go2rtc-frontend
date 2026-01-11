<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Icon } from '@iconify/vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import TapoControlPanel from '@/components/TapoControlPanel.vue'
import { useAppStore } from '@/stores/app'

import { useTapo } from '@/composables/useTapo'

const route = useRoute()
const store = useAppStore()

const streamSrc = computed(() => decodeURIComponent(route.params.src as string))
const streamInfo = computed(() => store.streams[streamSrc.value])

// Tapo panel state
const showTapoPanel = ref(false)

// Extract camera IP from stream source (for Tapo cameras)
const cameraIp = computed(() => {
  const src = streamSrc.value
  
  // 1. Try to find IP in the stream name itself (e.g. if name is URL-like)
  let match = src.match(/@([\d.]+)[:\/]/) || src.match(/\/\/([\d.]+)[:\/]/)
  if (match) return match[1]

  // 2. If not found, try to look up the stream info from the store and check producers
  const info = streamInfo.value
  
  if (info && info.producers) {
    for (const producer of info.producers) {
      // Check for URL (RTSP/HTTP sources)
      if (producer.url) {
        match = producer.url.match(/@([\d.]+)[:\/]/) || producer.url.match(/\/\/([\d.]+)[:\/]/)
        if (match) return match[1]
      }
      
      // Check for remote_addr (Tapo/other sources)
      if (producer.remote_addr) {
        // Handle "IP:PORT" or just "IP"
        // Also handling IPv6 just in case, though simpler regex for IPv4 is usually sufficient for these cameras
        const ip = producer.remote_addr.split(':')[0]
        if (ip && ip.match(/^[\d.]+$/)) {
             console.log('[StreamPlayer] Found IP from remote_addr:', ip)
             return ip
        }
      }
    }
  }
  
  console.log('[StreamPlayer] No IP found for stream:', src)
  return ''
})

const isTapoCamera = computed(() => !!cameraIp.value)

// Use Tapo Composable
const { api: tapoApi } = useTapo()

// PTZ Handling
async function handlePtz(command: 'up' | 'down' | 'left' | 'right' | 'zoom_in' | 'zoom_out') {
  if (isTapoCamera.value && tapoApi.value && cameraIp.value) {
    const directions = {
      up: 0,
      right: 90,
      down: 180,
      left: 270,
    }
    
    try {
      if (command in directions) {
        // Use step for discrete movement
        await tapoApi.value.ptzStep(cameraIp.value, directions[command as keyof typeof directions])
      } else {
        // Tapo zoom is digital only via StreamPlayer mostly, but if API supports it:
        console.warn('Zoom not implemented for Tapo via quick controls')
      }
    } catch (e) {
      console.error('Tapo PTZ Error:', e)
    }
  }
}

// We will only pass onPtz if it IS a Tapo camera
const ptzHandler = computed(() => {
  return isTapoCamera.value ? handlePtz : undefined
})

// Fetch stream info on load
store.fetchStreams()
</script>

<template>
  <div class="animate-fade-in">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <RouterLink to="/" class="breadcrumb-link">
        <Icon icon="mdi:home-outline" />
        <span>Dashboard</span>
      </RouterLink>
      <Icon icon="mdi:chevron-right" class="breadcrumb-sep" />
      <span class="breadcrumb-current">{{ streamSrc }}</span>
    </div>

    <!-- Stream Header -->
    <div class="stream-header">
      <div class="stream-info">
        <h1 class="stream-title">{{ streamSrc }}</h1>
        <div class="stream-badges">
          <span v-if="streamInfo?.producers?.length" class="badge badge-success">
            <span class="status-dot online"></span>
            Live
          </span>
          <span v-else class="badge badge-warning">
            <div class="loading-dot"></div>
            Connecting
          </span>
          <span v-if="streamInfo?.consumers?.length" class="badge badge-info">
            <Icon icon="mdi:eye-outline" />
            {{ streamInfo.consumers.length }} viewer{{ streamInfo.consumers.length !== 1 ? 's' : '' }}
          </span>
          <span v-if="cameraIp" class="badge badge-primary">
            <Icon icon="mdi:cctv" />
            Tapo
          </span>
        </div>
      </div>

      <div class="stream-actions">
        <button 
          v-if="cameraIp"
          @click="showTapoPanel = !showTapoPanel"
          class="btn"
          :class="showTapoPanel ? 'btn-primary' : 'btn-secondary'"
        >
          <Icon icon="mdi:cctv" />
          <span>Camera Controls</span>
        </button>

        <RouterLink :to="`/links/${encodeURIComponent(streamSrc)}`" class="btn btn-secondary">
          <Icon icon="mdi:link-variant" />
          <span>Stream Links</span>
        </RouterLink>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content-layout" :class="{ 'with-panel': showTapoPanel && cameraIp }">
      <!-- Video Player Column -->
      <div class="video-column">
        <VideoPlayer 
          :src="streamSrc" 
          :mode="store.playbackMode"
          :autoplay="true"
          :camera-ip="cameraIp"
          :on-ptz="ptzHandler"
        />

        <!-- Stream Info Cards -->
        <div v-if="streamInfo" class="info-grid">
          <!-- Producers -->
          <div class="info-card">
            <div class="info-header">
              <div class="info-icon green">
                <Icon icon="mdi:arrow-up" />
              </div>
              <h3 class="info-title">Producers</h3>
            </div>
            <div v-if="streamInfo.producers?.length" class="info-list">
              <div 
                v-for="(producer, idx) in streamInfo.producers" 
                :key="idx"
                class="info-item"
              >
                <p class="info-url">{{ producer.url || 'Unknown source' }}</p>
                <div v-if="producer.medias" class="info-badges">
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
            <p v-else class="info-empty">No producers connected</p>
          </div>

          <!-- Consumers -->
          <div class="info-card">
            <div class="info-header">
              <div class="info-icon blue">
                <Icon icon="mdi:arrow-down" />
              </div>
              <h3 class="info-title">Consumers</h3>
            </div>
            <div v-if="streamInfo.consumers?.length" class="info-list">
              <div 
                v-for="(consumer, idx) in streamInfo.consumers" 
                :key="idx"
                class="info-item"
              >
                <p class="info-addr">{{ consumer.remote_addr || 'Unknown' }}</p>
                <p v-if="consumer.user_agent" class="info-agent">{{ consumer.user_agent }}</p>
              </div>
            </div>
            <p v-else class="info-empty">No consumers connected</p>
          </div>
        </div>
      </div>

      <!-- Tapo Control Panel -->
      <transition name="slide">
        <div v-if="showTapoPanel && cameraIp" class="panel-column">
          <div class="tapo-panel-wrapper">
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
/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.breadcrumb-link:hover {
  color: var(--accent-primary);
}

.breadcrumb-sep {
  color: var(--text-dim);
  font-size: 1rem;
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
}

/* Stream Header */
.stream-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 768px) {
  .stream-header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.stream-info {
  min-width: 0;
}

.stream-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  word-break: break-word;
}

.stream-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stream-actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.loading-dot {
  width: 0.875rem;
  height: 0.875rem;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Content Layout */
.content-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .content-layout {
    flex-direction: row;
  }
  
  .content-layout.with-panel .video-column {
    flex: 1;
    min-width: 0;
  }
}

.video-column {
  flex: 1;
  min-width: 0;
}

.panel-column {
  width: 100%;
  flex-shrink: 0;
}

@media (min-width: 1024px) {
  .panel-column {
    width: 22rem;
  }
}

.tapo-panel-wrapper {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  position: sticky;
  top: 5rem;
}

/* Info Grid */
.info-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1.5rem;
}

@media (min-width: 768px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.info-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.info-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
}

.info-icon.green {
  background: var(--success-muted);
  color: var(--success);
}

.info-icon.blue {
  background: var(--info-muted);
  color: var(--info);
}

.info-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-item {
  padding: 0.875rem;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.info-url {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  word-break: break-all;
  margin-bottom: 0.5rem;
}

.info-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.info-addr {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.info-agent {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.info-empty {
  color: var(--text-muted);
  font-size: 0.875rem;
  padding: 1rem 0;
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
