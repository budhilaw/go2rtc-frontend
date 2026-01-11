<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { Icon } from '@iconify/vue'
import Hls from 'hls.js'
import { useTapo } from '@/composables/useTapo'

const props = defineProps<{
  src: string
  mode?: string
  autoplay?: boolean
  muted?: boolean
  controls?: boolean
  poster?: string
  cameraIp?: string  // Camera IP for Tapo API
  onPtz?: (command: 'up' | 'down' | 'left' | 'right' | 'zoom_in' | 'zoom_out') => Promise<void>
}>()

const emit = defineEmits<{
  error: [error: Error]
  playing: []
  modeChange: [mode: string]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const isPlaying = ref(false)
const isMuted = ref(props.muted || false)
const volume = ref(isMuted.value ? 0 : 1)
const isFullscreen = ref(false)
const showControls = ref(true)
const connectionState = ref<string>('')

// Playback Modes
const currentMode = ref(props.mode || 'webrtc')
const modes = ['webrtc', 'mse', 'hls', 'mjpeg']

// WebRTC
let pc: RTCPeerConnection | null = null

// MSE
let ws: WebSocket | null = null

// HLS
let hls: Hls | null = null

// PTZ
const showPtzPanel = ref(false)
const ptzLoading = ref(false)
// Using empty string for relative URL (current origin)
const baseUrl = computed(() => '')

// Tapo API for PTZ
const { tapoApiUrl, tapoCameraIp, tapoUsername, tapoPassword, isConfigured: isTapoConfigured } = useTapo()

// Effective camera IP: use prop if provided, otherwise fall back to configured default
const effectiveCameraIp = computed(() => props.cameraIp || tapoCameraIp.value)

type PtzCommand = 'up' | 'down' | 'left' | 'right' | 'zoom_in' | 'zoom_out' | 'home'

// Direction mapping for Tapo PTZ step
const directionMap: Record<string, number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
}

// PTZ Controls

async function sendPtzCommand(command: PtzCommand) {
  // Debug prop availability each time
  console.log('[VideoPlayer] sendPtzCommand called. command:', command, 'Has onPtz:', !!props.onPtz)

  if (props.onPtz) {
    console.log('[VideoPlayer] Using custom PTZ handler')
    ptzLoading.value = true
    try {
      if (command === 'home') {
        console.warn('Home command not supported by custom handler')
      } else {
        await props.onPtz(command)
      }
    } finally {
      ptzLoading.value = false
    }
    return
  }

  // Use Tapo API if configured and cameraIp is available (from prop or configured default)
  if (isTapoConfigured.value && effectiveCameraIp.value) {
    const direction = directionMap[command]
    if (direction === undefined) {
      console.warn(`[VideoPlayer] Command ${command} not supported for Tapo PTZ`)
      return
    }
    
    const fullUrl = `${tapoApiUrl.value}/api/cameras/${effectiveCameraIp.value}/ptz/step`
    console.log('[VideoPlayer] Tapo PTZ. Full URL:', fullUrl)
    
    ptzLoading.value = true
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tapo-Username': tapoUsername.value,
          'X-Tapo-Password': tapoPassword.value,
        },
        body: JSON.stringify({ direction })
      })
      
      if (!response.ok) {
        throw new Error(`Tapo PTZ failed: ${response.status} ${response.statusText}`)
      }
      console.log('[VideoPlayer] Tapo PTZ success')
    } catch (e) {
      console.error('[VideoPlayer] Tapo PTZ error:', e)
    } finally {
      ptzLoading.value = false
    }
    return
  }

  // Fallback to go2rtc PTZ (legacy)
  const url = `${baseUrl.value}/api/ptz?src=${encodeURIComponent(props.src)}&command=${command}`
  const fullUrl = `${window.location.origin}${url}`
  console.log('[VideoPlayer] Default PTZ Handler. Full URL:', fullUrl)

  ptzLoading.value = true
  try {
    const response = await fetch(url, {
      method: 'POST'
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('PTZ API not found (404). This stream might not support PTZ or go2rtc API is unavailable.')
      } else {
        throw new Error(`PTZ failed: ${response.statusText}`)
      }
    }
  } catch (e) {
    console.error('PTZ error:', e)
  } finally {
    ptzLoading.value = false
  }
}

// Continuous PTZ (hold button)
let ptzInterval: number | null = null

function startPtz(command: PtzCommand) {
  sendPtzCommand(command)
  ptzInterval = window.setInterval(() => {
    sendPtzCommand(command)
  }, 200)
}

function stopPtz() {
  if (ptzInterval) {
    clearInterval(ptzInterval)
    ptzInterval = null
  }
}

async function startWebRTC() {
  isLoading.value = true
  error.value = null
  connectionState.value = 'connecting'

  try {
    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    pc.ontrack = (event) => {
      if (videoRef.value && event.streams[0]) {
        videoRef.value.srcObject = event.streams[0]
        isLoading.value = false
      }
    }

    pc.oniceconnectionstatechange = () => {
      connectionState.value = pc?.iceConnectionState || ''
      if (pc?.iceConnectionState === 'connected' || pc?.iceConnectionState === 'completed') {
        isLoading.value = false
        isPlaying.value = true
        emit('playing')
      } else if (pc?.iceConnectionState === 'failed' || pc?.iceConnectionState === 'disconnected') {
        error.value = 'WebRTC connection failed'
      }
    }

    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    await new Promise<void>((resolve) => {
      if (pc!.iceGatheringState === 'complete') {
        resolve()
      } else {
        pc!.onicegatheringstatechange = () => {
          if (pc!.iceGatheringState === 'complete') {
            resolve()
          }
        }
      }
    })

    const response = await fetch(`${baseUrl.value}/api/webrtc?src=${encodeURIComponent(props.src)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pc.localDescription)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const answer = await response.json()
    await pc.setRemoteDescription(answer)

  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    error.value = err.message
    emit('error', err)
    isLoading.value = false
  }
}

async function startMSE() {
  isLoading.value = true
  error.value = null

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/ws?src=${encodeURIComponent(props.src)}`
    
    ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'

    const mediaSource = new MediaSource()
    if (videoRef.value) {
      videoRef.value.src = URL.createObjectURL(mediaSource)
    }

    mediaSource.addEventListener('sourceopen', () => {
      let sourceBuffer: SourceBuffer | null = null
      const queue: ArrayBuffer[] = []
      let isUpdating = false

      ws!.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data)
          if (msg.type === 'mse') {
            const mimeType = msg.value
            if (MediaSource.isTypeSupported(mimeType)) {
              sourceBuffer = mediaSource.addSourceBuffer(mimeType)
              sourceBuffer.addEventListener('updateend', () => {
                isUpdating = false
                if (queue.length > 0 && sourceBuffer && !sourceBuffer.updating) {
                  sourceBuffer.appendBuffer(queue.shift()!)
                  isUpdating = true
                }
              })
            }
          }
        } else if (event.data instanceof ArrayBuffer && sourceBuffer) {
          if (!isUpdating && !sourceBuffer.updating) {
            sourceBuffer.appendBuffer(event.data)
            isUpdating = true
          } else {
            queue.push(event.data)
          }
          isLoading.value = false
          isPlaying.value = true
        }
      }

      ws!.onopen = () => {
        ws!.send(JSON.stringify({ type: 'mse' }))
      }
    })

    ws.onerror = () => {
      error.value = 'MSE connection failed'
      isLoading.value = false
    }

  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    error.value = err.message
    emit('error', err)
    isLoading.value = false
  }
}

function startHLS() {
  isLoading.value = true
  error.value = null

  const hlsUrl = `${baseUrl.value}/api/stream.m3u8?src=${encodeURIComponent(props.src)}`

  if (Hls.isSupported() && videoRef.value) {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    })

    hls.loadSource(hlsUrl)
    hls.attachMedia(videoRef.value)

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      isLoading.value = false
      isPlaying.value = true
      videoRef.value?.play()
      emit('playing')
    })

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        error.value = `HLS Error: ${data.type}`
        isLoading.value = false
      }
    })
  } else if (videoRef.value?.canPlayType('application/vnd.apple.mpegurl')) {
    videoRef.value.src = hlsUrl
    videoRef.value.addEventListener('loadedmetadata', () => {
      isLoading.value = false
      isPlaying.value = true
      videoRef.value?.play()
    })
  } else {
    error.value = 'HLS is not supported in this browser'
    isLoading.value = false
  }
}

function startMJPEG() {
  isLoading.value = true
  error.value = null

  if (videoRef.value) {
    videoRef.value.style.display = 'none'
  }

  const img = document.createElement('img')
  img.src = `${baseUrl.value}/api/stream.mjpeg?src=${encodeURIComponent(props.src)}`
  img.style.width = '100%'
  img.style.height = '100%'
  img.style.objectFit = 'contain'
  
  img.onload = () => {
    isLoading.value = false
    isPlaying.value = true
    emit('playing')
  }
  
  img.onerror = () => {
    error.value = 'Failed to load MJPEG stream'
    isLoading.value = false
  }

  containerRef.value?.appendChild(img)
}

function stop() {
  if (pc) {
    pc.close()
    pc = null
  }

  if (ws) {
    ws.close()
    ws = null
  }

  if (hls) {
    hls.destroy()
    hls = null
  }

  if (videoRef.value) {
    videoRef.value.srcObject = null
    videoRef.value.src = ''
    videoRef.value.style.display = ''
  }

  const img = containerRef.value?.querySelector('img')
  if (img) {
    img.remove()
  }

  isPlaying.value = false
  isLoading.value = false
}

function play() {
  stop()
  
  switch (currentMode.value) {
    case 'webrtc':
      startWebRTC()
      break
    case 'mse':
      startMSE()
      break
    case 'hls':
      startHLS()
      break
    case 'mjpeg':
      startMJPEG()
      break
  }
}

function switchMode(mode: string) {
  currentMode.value = mode
  emit('modeChange', mode)
  play()
}

function toggleFullscreen() {
  if (!containerRef.value) return
  
  if (!document.fullscreenElement) {
    containerRef.value.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

function toggleMute() {
  if (videoRef.value) {
    isMuted.value = !isMuted.value
    videoRef.value.muted = isMuted.value
  }
}

function setVolume(val: number) {
  volume.value = val
  if (videoRef.value) {
    videoRef.value.volume = val
  }
}

let hideTimeout: number | null = null
function showControlsHandler() {
  showControls.value = true
  if (hideTimeout) clearTimeout(hideTimeout)
  hideTimeout = window.setTimeout(() => {
    if (isPlaying.value) showControls.value = false
  }, 3000)
}

watch(() => props.src, () => {
  if (props.autoplay) {
    play()
  }
})

onMounted(() => {
  if (props.autoplay !== false) {
    play()
  }
  
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})

onUnmounted(() => {
  stop()
  stopPtz()
})

defineExpose({ play, stop, switchMode })
</script>

<template>
  <div 
    ref="containerRef"
    class="video-container"
    @mousemove="showControlsHandler"
    @mouseleave="showControls = true"
  >
    <!-- Video Element -->
    <video
      ref="videoRef"
      class="video-element"
      autoplay
      playsinline
      :muted="isMuted"
    />

    <!-- Loading Overlay -->
    <transition name="fade">
      <div v-if="isLoading" class="video-overlay">
        <div class="loading-spinner"></div>
        <p class="overlay-text">Connecting via {{ currentMode.toUpperCase() }}...</p>
        <p v-if="connectionState" class="overlay-subtext">{{ connectionState }}</p>
      </div>
    </transition>

    <!-- Error Overlay -->
    <transition name="fade">
      <div v-if="error && !isLoading" class="video-overlay error">
        <Icon icon="mdi:alert-circle-outline" class="error-icon" />
        <p class="overlay-title">Stream Error</p>
        <p class="overlay-text">{{ error }}</p>
        <button @click="play" class="btn btn-primary">
          <Icon icon="mdi:refresh" />
          Retry
        </button>
      </div>
    </transition>

    <!-- PTZ Control Panel -->
    <transition name="fade">
      <div v-if="showPtzPanel && isPlaying" class="ptz-overlay">
        <div class="ptz-panel">
          <div class="ptz-grid">
            <div></div>
            <button 
              @mousedown="startPtz('up')" @mouseup="stopPtz" @mouseleave="stopPtz"
              @touchstart.prevent="startPtz('up')" @touchend="stopPtz"
              class="ptz-btn" title="Tilt Up"
            >
              <Icon icon="mdi:chevron-up" />
            </button>
            <div></div>
            
            <button 
              @mousedown="startPtz('left')" @mouseup="stopPtz" @mouseleave="stopPtz"
              @touchstart.prevent="startPtz('left')" @touchend="stopPtz"
              class="ptz-btn" title="Pan Left"
            >
              <Icon icon="mdi:chevron-left" />
            </button>
            <button @click="sendPtzCommand('home')" class="ptz-btn ptz-home" title="Home">
              <Icon icon="mdi:home" />
            </button>
            <button 
              @mousedown="startPtz('right')" @mouseup="stopPtz" @mouseleave="stopPtz"
              @touchstart.prevent="startPtz('right')" @touchend="stopPtz"
              class="ptz-btn" title="Pan Right"
            >
              <Icon icon="mdi:chevron-right" />
            </button>
            
            <div></div>
            <button 
              @mousedown="startPtz('down')" @mouseup="stopPtz" @mouseleave="stopPtz"
              @touchstart.prevent="startPtz('down')" @touchend="stopPtz"
              class="ptz-btn" title="Tilt Down"
            >
              <Icon icon="mdi:chevron-down" />
            </button>
            <div></div>
          </div>
          
          <div class="ptz-zoom">
            <button 
              @mousedown="startPtz('zoom_out')" @mouseup="stopPtz" @mouseleave="stopPtz"
              @touchstart.prevent="startPtz('zoom_out')" @touchend="stopPtz"
              class="ptz-btn" title="Zoom Out"
            >
              <Icon icon="mdi:magnify-minus" />
            </button>
            <button 
              @mousedown="startPtz('zoom_in')" @mouseup="stopPtz" @mouseleave="stopPtz"
              @touchstart.prevent="startPtz('zoom_in')" @touchend="stopPtz"
              class="ptz-btn" title="Zoom In"
            >
              <Icon icon="mdi:magnify-plus" />
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Top Bar -->
    <div class="video-top-bar">
      <div class="top-left">
        <span class="mode-badge" :class="{ playing: isPlaying }">
          {{ currentMode.toUpperCase() }}
        </span>
        <span v-if="isPlaying" class="live-badge">
          <span class="live-dot"></span>
          LIVE
        </span>
      </div>
      <div class="stream-name">{{ src }}</div>
    </div>

    <!-- Bottom Controls -->
    <div class="video-controls">
      <div class="controls-left">
        <button @click="isPlaying ? stop() : play()" class="control-btn play-btn">
          <Icon :icon="isPlaying ? 'mdi:stop' : 'mdi:play'" />
        </button>
        
        <button @click="toggleMute" class="control-btn">
          <Icon :icon="isMuted ? 'mdi:volume-off' : 'mdi:volume-high'" />
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          :value="volume"
          @input="setVolume(Number(($event.target as HTMLInputElement).value))"
          class="volume-slider"
        />
      </div>

      <!-- Mode Switcher -->
      <div class="mode-switcher">
        <button
          v-for="mode in modes"
          :key="mode"
          @click="switchMode(mode)"
          class="mode-btn"
          :class="{ active: currentMode === mode }"
        >
          {{ mode.toUpperCase() }}
        </button>
      </div>

      <div class="controls-right">
        <button 
          @click="showPtzPanel = !showPtzPanel"
          class="control-btn"
          :class="{ active: showPtzPanel }"
          title="PTZ Controls"
        >
          <Icon icon="mdi:gamepad-variant-outline" />
        </button>
        
        <button @click="toggleFullscreen" class="control-btn">
          <Icon :icon="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-container {
  position: relative;
  background: #000;
  border-radius: var(--radius-xl);
  overflow: hidden;
  aspect-ratio: 16/9;
  min-height: 300px;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Overlays */
.video-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.video-overlay.error {
  background: rgba(0, 0, 0, 0.85);
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.overlay-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  margin-bottom: 0.5rem;
}

.overlay-text {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
}

.overlay-subtext {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.25rem;
}

.error-icon {
  font-size: 3rem;
  color: var(--danger);
  margin-bottom: 1rem;
}

/* Top Bar */
.video-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mode-badge {
  padding: 0.375rem 0.75rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mode-badge.playing {
  background: var(--success-muted);
  color: var(--success);
  border-color: rgba(34, 197, 94, 0.2);
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  border-radius: var(--radius-md);
  background: var(--danger-muted);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--danger);
  animation: pulse 2s ease-in-out infinite;
}

.stream-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  padding: 0.375rem 0.75rem;
  background: rgba(0, 0, 0, 0.4);
  border-radius: var(--radius-md);
}

/* Bottom Controls */
.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  z-index: 10;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-md);
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.control-btn.active {
  background: var(--accent-primary);
}

.play-btn {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font-size: 1.5rem;
}

.volume-slider {
  width: 5rem;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

/* Mode Switcher */
.mode-switcher {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: rgba(0, 0, 0, 0.4);
  border-radius: var(--radius-lg);
}

.mode-btn {
  padding: 0.5rem 0.875rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-btn:hover {
  color: rgba(255, 255, 255, 0.8);
}

.mode-btn.active {
  background: var(--accent-primary);
  color: white;
}

/* PTZ Panel */
.ptz-overlay {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
}

.ptz-panel {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 1rem;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.ptz-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.ptz-btn {
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  color: white;
  font-size: 1.375rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.ptz-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.ptz-btn:active {
  background: var(--accent-primary);
  transform: scale(0.95);
}

.ptz-home {
  background: var(--accent-primary-muted);
  font-size: 1.125rem;
}

.ptz-zoom {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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
