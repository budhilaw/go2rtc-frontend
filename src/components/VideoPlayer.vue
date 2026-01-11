<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { Icon } from '@iconify/vue'
import Hls from 'hls.js'
import type { PlaybackMode } from '@/types'

const props = defineProps<{
  src: string
  mode?: PlaybackMode
  autoplay?: boolean
}>()

const emit = defineEmits<{
  error: [error: Error]
  playing: []
  modeChange: [mode: PlaybackMode]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const currentMode = ref<PlaybackMode>(props.mode || 'webrtc')
const isPlaying = ref(false)
const isLoading = ref(true)
const error = ref<string | null>(null)
const isFullscreen = ref(false)
const showControls = ref(true)
const volume = ref(1)
const isMuted = ref(false)
const connectionState = ref<string>('')

// WebRTC
let pc: RTCPeerConnection | null = null
let ws: WebSocket | null = null

// HLS
let hls: Hls | null = null

const modes: PlaybackMode[] = ['webrtc', 'mse', 'hls', 'mjpeg']

const baseUrl = computed(() => {
  // Use window.location to get the actual host when proxied
  return ''
})

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

    // Add transceivers
    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // Wait for ICE gathering
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

    // Send offer to server
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
          // Handle JSON messages
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

      // Request MSE stream
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
    // Hide video element for MJPEG
    videoRef.value.style.display = 'none'
  }

  // MJPEG uses an img element
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
  // Clean up WebRTC
  if (pc) {
    pc.close()
    pc = null
  }

  // Clean up WebSocket
  if (ws) {
    ws.close()
    ws = null
  }

  // Clean up HLS
  if (hls) {
    hls.destroy()
    hls = null
  }

  // Clean up video
  if (videoRef.value) {
    videoRef.value.srcObject = null
    videoRef.value.src = ''
    videoRef.value.style.display = ''
  }

  // Remove MJPEG image if exists
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

function switchMode(mode: PlaybackMode) {
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

// Handle mouse movement for controls visibility
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
})

defineExpose({ play, stop, switchMode })
</script>

<template>
  <div 
    ref="containerRef"
    class="video-container relative bg-black overflow-hidden rounded-xl"
    @mousemove="showControlsHandler"
    @mouseleave="showControls = false"
  >
    <!-- Video Element -->
    <video
      ref="videoRef"
      class="w-full h-full object-contain"
      autoplay
      playsinline
      :muted="isMuted"
    />

    <!-- Loading Overlay -->
    <transition name="fade">
      <div 
        v-if="isLoading"
        class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-white text-sm">Connecting via {{ currentMode.toUpperCase() }}...</p>
        <p v-if="connectionState" class="text-gray-400 text-xs mt-1">{{ connectionState }}</p>
      </div>
    </transition>

    <!-- Error Overlay -->
    <transition name="fade">
      <div 
        v-if="error && !isLoading"
        class="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <Icon icon="mdi:alert-circle" class="text-red-500 text-5xl mb-4" />
        <p class="text-white text-lg mb-2">Stream Error</p>
        <p class="text-gray-400 text-sm mb-4">{{ error }}</p>
        <button @click="play" class="btn btn-primary">
          <Icon icon="mdi:refresh" />
          Retry
        </button>
      </div>
    </transition>

    <!-- Controls Overlay -->
    <transition name="fade">
      <div 
        v-show="showControls || !isPlaying"
        class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none"
      >
        <!-- Top Bar -->
        <div class="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-auto">
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 rounded-md text-xs font-medium" 
              :class="isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'">
              {{ currentMode.toUpperCase() }}
            </span>
            <span v-if="isPlaying" class="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-red-500/20 text-red-400">
              <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              LIVE
            </span>
          </div>
          <div class="text-white text-sm font-medium">{{ src }}</div>
        </div>

        <!-- Bottom Controls -->
        <div class="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
          <div class="flex items-center justify-between">
            <!-- Left Controls -->
            <div class="flex items-center gap-2">
              <button 
                @click="isPlaying ? stop() : play()" 
                class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <Icon :icon="isPlaying ? 'mdi:stop' : 'mdi:play'" class="text-white text-xl" />
              </button>
              
              <button 
                @click="toggleMute"
                class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <Icon :icon="isMuted ? 'mdi:volume-off' : 'mdi:volume-high'" class="text-white text-lg" />
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                :value="volume"
                @input="setVolume(Number(($event.target as HTMLInputElement).value))"
                class="w-20 h-1 rounded-full appearance-none bg-white/20 cursor-pointer"
              />
            </div>

            <!-- Mode Switcher -->
            <div class="flex items-center gap-1">
              <button
                v-for="mode in modes"
                :key="mode"
                @click="switchMode(mode)"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="currentMode === mode 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'"
              >
                {{ mode.toUpperCase() }}
              </button>
            </div>

            <!-- Right Controls -->
            <div class="flex items-center gap-2">
              <button 
                @click="toggleFullscreen"
                class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <Icon :icon="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" class="text-white text-lg" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
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

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}
</style>
