<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Icon } from '@iconify/vue'
import { streamsApi } from '@/services/api'

const route = useRoute()
const streamSrc = computed(() => decodeURIComponent(route.params.src as string))
const copiedLink = ref<string | null>(null)

interface StreamLink {
  id: string
  name: string
  icon: string
  url: string
  color: string
  description: string
}

const links = computed<StreamLink[]>(() => [
  {
    id: 'webrtc',
    name: 'WebRTC',
    icon: 'mdi:video-wireless',
    url: `${window.location.origin}/stream/${encodeURIComponent(streamSrc.value)}`,
    color: 'blue',
    description: 'Low latency browser playback'
  },
  {
    id: 'rtsp',
    name: 'RTSP',
    icon: 'mdi:cctv',
    url: `rtsp://${window.location.hostname}:8554/${encodeURIComponent(streamSrc.value)}`,
    color: 'green',
    description: 'For VLC, media players, NVRs'
  },
  {
    id: 'hls',
    name: 'HLS',
    icon: 'mdi:playlist-play',
    url: `${window.location.origin}/api/stream.m3u8?src=${encodeURIComponent(streamSrc.value)}`,
    color: 'orange',
    description: 'HTTP Live Streaming'
  },
  {
    id: 'mp4',
    name: 'MP4',
    icon: 'mdi:file-video',
    url: `${window.location.origin}/api/stream.mp4?src=${encodeURIComponent(streamSrc.value)}`,
    color: 'purple',
    description: 'Continuous MP4 stream'
  },
  {
    id: 'mjpeg',
    name: 'MJPEG',
    icon: 'mdi:image-multiple',
    url: `${window.location.origin}/api/stream.mjpeg?src=${encodeURIComponent(streamSrc.value)}`,
    color: 'cyan',
    description: 'Motion JPEG stream'
  },
  {
    id: 'snapshot',
    name: 'Snapshot',
    icon: 'mdi:camera',
    url: `${window.location.origin}/api/frame.jpeg?src=${encodeURIComponent(streamSrc.value)}`,
    color: 'yellow',
    description: 'Single frame capture'
  },
])

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-400',
  green: 'bg-green-500/20 text-green-400',
  orange: 'bg-orange-500/20 text-orange-400',
  purple: 'bg-purple-500/20 text-purple-400',
  cyan: 'bg-cyan-500/20 text-cyan-400',
  yellow: 'bg-yellow-500/20 text-yellow-400',
}

async function copyToClipboard(link: StreamLink) {
  try {
    await navigator.clipboard.writeText(link.url)
    copiedLink.value = link.id
    setTimeout(() => copiedLink.value = null, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

function openLink(url: string) {
  window.open(url, '_blank')
}
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

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-bold gradient-text">Stream Links</h1>
        <p class="mt-2 text-lg" style="color: var(--text-primary)">{{ streamSrc }}</p>
        <p class="mt-1" style="color: var(--text-secondary)">
          Access this stream in various formats
        </p>
      </div>

      <RouterLink 
        :to="`/stream/${encodeURIComponent(streamSrc)}`"
        class="btn btn-primary"
      >
        <Icon icon="mdi:play" />
        Open Player
      </RouterLink>
    </div>

    <!-- Preview -->
    <div class="mb-8">
      <div class="aspect-video max-w-2xl rounded-xl overflow-hidden" style="background: var(--bg-secondary)">
        <img 
          :src="streamsApi.getSnapshotUrl(streamSrc)"
          :alt="streamSrc"
          class="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    </div>

    <!-- Links Grid -->
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="link in links"
        :key="link.id"
        class="card"
      >
        <div class="flex items-start gap-4">
          <div 
            class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            :class="colorClasses[link.color]"
          >
            <Icon :icon="link.icon" class="text-2xl" />
          </div>
          
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold" style="color: var(--text-primary)">{{ link.name }}</h3>
            <p class="text-sm mt-0.5" style="color: var(--text-muted)">{{ link.description }}</p>
          </div>
        </div>

        <!-- URL -->
        <div 
          class="mt-4 p-3 rounded-lg font-mono text-xs break-all"
          style="background: var(--bg-secondary); color: var(--text-secondary)"
        >
          {{ link.url }}
        </div>

        <!-- Actions -->
        <div class="flex gap-2 mt-4">
          <button 
            @click="copyToClipboard(link)"
            class="btn btn-secondary flex-1"
          >
            <Icon :icon="copiedLink === link.id ? 'mdi:check' : 'mdi:content-copy'" />
            {{ copiedLink === link.id ? 'Copied!' : 'Copy' }}
          </button>
          <button 
            @click="openLink(link.url)"
            class="btn btn-ghost"
          >
            <Icon icon="mdi:open-in-new" />
          </button>
        </div>
      </div>
    </div>

    <!-- API Endpoints -->
    <div class="mt-8">
      <h2 class="text-xl font-bold mb-4" style="color: var(--text-primary)">API Endpoints</h2>
      <div class="card">
        <div class="space-y-3">
          <div class="flex items-center justify-between py-2 border-b" style="border-color: var(--border-color)">
            <span style="color: var(--text-secondary)">Stream Info (JSON)</span>
            <code class="text-sm px-2 py-1 rounded" style="background: var(--bg-secondary); color: var(--accent-primary)">
              /api/streams?src={{ streamSrc }}
            </code>
          </div>
          <div class="flex items-center justify-between py-2 border-b" style="border-color: var(--border-color)">
            <span style="color: var(--text-secondary)">WebRTC Offer</span>
            <code class="text-sm px-2 py-1 rounded" style="background: var(--bg-secondary); color: var(--accent-primary)">
              POST /api/webrtc?src={{ streamSrc }}
            </code>
          </div>
          <div class="flex items-center justify-between py-2">
            <span style="color: var(--text-secondary)">WebSocket</span>
            <code class="text-sm px-2 py-1 rounded" style="background: var(--bg-secondary); color: var(--accent-primary)">
              /api/ws?src={{ streamSrc }}
            </code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
