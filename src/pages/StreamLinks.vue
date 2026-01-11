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
    color: 'purple',
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
    icon: 'mdi:file-video-outline',
    url: `${window.location.origin}/api/stream.mp4?src=${encodeURIComponent(streamSrc.value)}`,
    color: 'blue',
    description: 'Continuous MP4 stream'
  },
  {
    id: 'mjpeg',
    name: 'MJPEG',
    icon: 'mdi:image-multiple-outline',
    url: `${window.location.origin}/api/stream.mjpeg?src=${encodeURIComponent(streamSrc.value)}`,
    color: 'cyan',
    description: 'Motion JPEG stream'
  },
  {
    id: 'snapshot',
    name: 'Snapshot',
    icon: 'mdi:camera-outline',
    url: `${window.location.origin}/api/frame.jpeg?src=${encodeURIComponent(streamSrc.value)}`,
    color: 'yellow',
    description: 'Single frame capture'
  },
])

const colorStyles: Record<string, { bg: string; text: string }> = {
  purple: { bg: 'var(--accent-primary-muted)', text: 'var(--accent-primary)' },
  green: { bg: 'var(--success-muted)', text: 'var(--success)' },
  orange: { bg: 'var(--warning-muted)', text: 'var(--warning)' },
  blue: { bg: 'var(--info-muted)', text: 'var(--info)' },
  cyan: { bg: 'var(--accent-secondary-muted)', text: 'var(--accent-secondary)' },
  yellow: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308' },
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
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <RouterLink to="/" class="breadcrumb-link">
        <Icon icon="mdi:home-outline" />
        <span>Dashboard</span>
      </RouterLink>
      <Icon icon="mdi:chevron-right" class="breadcrumb-sep" />
      <span class="breadcrumb-current">Stream Links</span>
    </div>

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Stream Links</h1>
        <p class="stream-name">{{ streamSrc }}</p>
        <p class="page-subtitle">Access this stream in various formats</p>
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
    <div class="preview-section">
      <div class="preview-container">
        <img 
          :src="streamsApi.getSnapshotUrl(streamSrc)"
          :alt="streamSrc"
          class="preview-image"
          loading="lazy"
        />
      </div>
    </div>

    <!-- Links Grid -->
    <div class="links-grid">
      <div 
        v-for="link in links"
        :key="link.id"
        class="link-card"
      >
        <div class="link-header">
          <div 
            class="link-icon"
            :style="{ background: colorStyles[link.color].bg, color: colorStyles[link.color].text }"
          >
            <Icon :icon="link.icon" />
          </div>
          <div class="link-info">
            <h3 class="link-name">{{ link.name }}</h3>
            <p class="link-desc">{{ link.description }}</p>
          </div>
        </div>

        <div class="link-url">{{ link.url }}</div>

        <div class="link-actions">
          <button @click="copyToClipboard(link)" class="btn btn-secondary flex-1">
            <Icon :icon="copiedLink === link.id ? 'mdi:check' : 'mdi:content-copy'" />
            {{ copiedLink === link.id ? 'Copied!' : 'Copy' }}
          </button>
          <button @click="openLink(link.url)" class="btn-icon">
            <Icon icon="mdi:open-in-new" />
          </button>
        </div>
      </div>
    </div>

    <!-- API Endpoints -->
    <div class="api-section">
      <h2 class="section-title">API Endpoints</h2>
      <div class="api-card">
        <div class="api-row">
          <span class="api-label">Stream Info (JSON)</span>
          <code class="api-code">/api/streams?src={{ streamSrc }}</code>
        </div>
        <div class="api-row">
          <span class="api-label">WebRTC Offer</span>
          <code class="api-code">POST /api/webrtc?src={{ streamSrc }}</code>
        </div>
        <div class="api-row last">
          <span class="api-label">WebSocket</span>
          <code class="api-code">/api/ws?src={{ streamSrc }}</code>
        </div>
      </div>
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
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
}

/* Header */
.page-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (min-width: 768px) {
  .page-header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stream-name {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-top: 0.5rem;
}

.page-subtitle {
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

/* Preview */
.preview-section {
  margin-bottom: 2rem;
}

.preview-container {
  max-width: 40rem;
  aspect-ratio: 16/9;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Links Grid */
.links-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (min-width: 768px) {
  .links-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .links-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.link-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
  transition: border-color var(--transition-fast);
}

.link-card:hover {
  border-color: var(--border-hover);
}

.link-header {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  margin-bottom: 1rem;
}

.link-icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.375rem;
  flex-shrink: 0;
}

.link-info {
  min-width: 0;
}

.link-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.link-desc {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
}

.link-url {
  padding: 0.75rem;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.75rem;
  color: var(--text-secondary);
  word-break: break-all;
  margin-bottom: 1rem;
}

.link-actions {
  display: flex;
  gap: 0.5rem;
}

.flex-1 {
  flex: 1;
}

/* API Section */
.api-section {
  margin-top: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.api-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.api-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.api-row.last {
  border-bottom: none;
}

.api-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.api-code {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.8125rem;
  padding: 0.375rem 0.625rem;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  color: var(--accent-primary);
}
</style>
