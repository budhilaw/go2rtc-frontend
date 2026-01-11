<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { createTapoApi, type TapoPreset, type TapoDeviceInfo } from '@/services/tapo'

const props = defineProps<{
  cameraIp: string
  streamName?: string
}>()

const emit = defineEmits<{
  close: []
}>()

// Tapo API config from env or defaults
const tapoApiUrl = ref(localStorage.getItem('tapoApiUrl') || 'http://localhost:3000')
const tapoUsername = ref(localStorage.getItem('tapoUsername') || '')
const tapoPassword = ref(localStorage.getItem('tapoPassword') || '')

const isConfigured = computed(() => tapoUsername.value && tapoPassword.value)

// Create API instance
const api = computed(() => {
  if (!isConfigured.value) return null
  return createTapoApi(tapoApiUrl.value, {
    username: tapoUsername.value,
    password: tapoPassword.value,
  })
})

// State
const activeTab = ref<'ptz' | 'presets' | 'settings' | 'config'>('ptz')
const loading = ref(false)
const error = ref<string | null>(null)

// Device info
const deviceInfo = ref<TapoDeviceInfo | null>(null)

// Presets
const presets = ref<TapoPreset[]>([])
const newPresetName = ref('')

// Settings
const settings = reactive({
  privacyMode: false,
  ledEnabled: true,
  motionDetection: true,
  personDetection: true,
  flipType: 'off',
  nightMode: 'auto',
})

// PTZ
let ptzInterval: number | null = null
const isCruising = ref(false)

// PTZ direction mapping (degrees: 0=up, 90=right, 180=down, 270=left)
const ptzDirections = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
  upLeft: 315,
  upRight: 45,
  downLeft: 225,
  downRight: 135,
}

async function sendPtzStep(direction: keyof typeof ptzDirections) {
  if (!api.value) return
  try {
    await api.value.ptzStep(props.cameraIp, ptzDirections[direction])
  } catch (e) {
    console.error('PTZ error:', e)
  }
}

function startPtz(direction: keyof typeof ptzDirections) {
  sendPtzStep(direction)
  ptzInterval = window.setInterval(() => sendPtzStep(direction), 150)
}

function stopPtz() {
  if (ptzInterval) {
    clearInterval(ptzInterval)
    ptzInterval = null
  }
}

async function calibrate() {
  if (!api.value) return
  loading.value = true
  try {
    await api.value.ptzCalibrate(props.cameraIp)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function toggleCruise() {
  if (!api.value) return
  loading.value = true
  try {
    if (isCruising.value) {
      await api.value.stopCruise(props.cameraIp)
    } else {
      await api.value.startCruise(props.cameraIp)
    }
    isCruising.value = !isCruising.value
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Presets
async function loadPresets() {
  if (!api.value) return
  loading.value = true
  try {
    presets.value = await api.value.getPresets(props.cameraIp)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function createPreset() {
  if (!api.value || !newPresetName.value) return
  loading.value = true
  try {
    await api.value.createPreset(props.cameraIp, newPresetName.value)
    newPresetName.value = ''
    await loadPresets()
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function gotoPreset(presetId: string) {
  if (!api.value) return
  try {
    await api.value.gotoPreset(props.cameraIp, presetId)
  } catch (e: any) {
    error.value = e.message
  }
}

async function deletePreset(presetId: string) {
  if (!api.value) return
  if (!confirm('Delete this preset?')) return
  loading.value = true
  try {
    await api.value.deletePreset(props.cameraIp, presetId)
    await loadPresets()
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Settings
async function loadSettings() {
  if (!api.value) return
  loading.value = true
  try {
    const [privacy, led, motion, person, image] = await Promise.all([
      api.value.getPrivacy(props.cameraIp),
      api.value.getLed(props.cameraIp),
      api.value.getMotionDetection(props.cameraIp),
      api.value.getPersonDetection(props.cameraIp),
      api.value.getImageSettings(props.cameraIp),
    ])
    settings.privacyMode = privacy.enabled
    settings.ledEnabled = led.enabled
    settings.motionDetection = motion.enabled
    settings.personDetection = person.enabled
    settings.flipType = image.flip_type || 'off'
    settings.nightMode = image.switch_mode || 'auto'
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function togglePrivacy() {
  if (!api.value) return
  try {
    await api.value.setPrivacy(props.cameraIp, !settings.privacyMode)
    settings.privacyMode = !settings.privacyMode
  } catch (e: any) {
    error.value = e.message
  }
}

async function toggleLed() {
  if (!api.value) return
  try {
    await api.value.setLed(props.cameraIp, !settings.ledEnabled)
    settings.ledEnabled = !settings.ledEnabled
  } catch (e: any) {
    error.value = e.message
  }
}

async function toggleMotionDetection() {
  if (!api.value) return
  try {
    await api.value.setMotionDetection(props.cameraIp, !settings.motionDetection)
    settings.motionDetection = !settings.motionDetection
  } catch (e: any) {
    error.value = e.message
  }
}

async function togglePersonDetection() {
  if (!api.value) return
  try {
    await api.value.setPersonDetection(props.cameraIp, !settings.personDetection)
    settings.personDetection = !settings.personDetection
  } catch (e: any) {
    error.value = e.message
  }
}

async function setFlip(flipType: string) {
  if (!api.value) return
  try {
    await api.value.setFlip(props.cameraIp, flipType)
    settings.flipType = flipType
  } catch (e: any) {
    error.value = e.message
  }
}

async function setNightMode(mode: string) {
  if (!api.value) return
  try {
    await api.value.setNightMode(props.cameraIp, mode)
    settings.nightMode = mode
  } catch (e: any) {
    error.value = e.message
  }
}

async function rebootCamera() {
  if (!api.value) return
  if (!confirm('Are you sure you want to reboot the camera?')) return
  loading.value = true
  try {
    await api.value.reboot(props.cameraIp)
    error.value = null
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Config
function saveConfig() {
  localStorage.setItem('tapoApiUrl', tapoApiUrl.value)
  localStorage.setItem('tapoUsername', tapoUsername.value)
  localStorage.setItem('tapoPassword', tapoPassword.value)
  loadDeviceInfo()
}

async function loadDeviceInfo() {
  if (!api.value) return
  try {
    deviceInfo.value = await api.value.getInfo(props.cameraIp)
    error.value = null
  } catch (e: any) {
    error.value = e.message
    deviceInfo.value = null
  }
}

onMounted(() => {
  if (isConfigured.value) {
    loadDeviceInfo()
    loadPresets()
    loadSettings()
  }
})
</script>

<template>
  <div class="tapo-control-panel">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 pb-3 border-b" style="border-color: var(--border-color)">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
          <Icon icon="mdi:cctv" class="text-green-400 text-xl" />
        </div>
        <div>
          <h3 class="font-semibold" style="color: var(--text-primary)">
            {{ deviceInfo?.device_alias || props.streamName || 'Tapo Camera' }}
          </h3>
          <p class="text-xs" style="color: var(--text-muted)">{{ props.cameraIp }}</p>
        </div>
      </div>
      <button @click="emit('close')" class="btn-icon btn-ghost">
        <Icon icon="mdi:close" class="text-xl" />
      </button>
    </div>

    <!-- Config Required -->
    <div v-if="!isConfigured" class="py-4">
      <p class="text-sm mb-4" style="color: var(--text-secondary)">
        Please configure Tapo API credentials to control this camera.
      </p>
      <button @click="activeTab = 'config'" class="btn btn-primary w-full">
        <Icon icon="mdi:cog" />
        Configure
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Tabs -->
    <div v-if="isConfigured" class="flex gap-1 mb-4">
      <button 
        v-for="tab in ['ptz', 'presets', 'settings', 'config'] as const"
        :key="tab"
        @click="activeTab = tab"
        class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="activeTab === tab 
          ? 'bg-blue-500/20 text-blue-400' 
          : 'hover:bg-white/5'"
        :style="{ color: activeTab !== tab ? 'var(--text-secondary)' : undefined }"
      >
        {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
      </button>
    </div>

    <!-- PTZ Tab -->
    <div v-if="activeTab === 'ptz' && isConfigured">
      <!-- D-Pad -->
      <div class="flex flex-col items-center gap-2 mb-4">
        <div class="grid grid-cols-3 gap-1">
          <button 
            @mousedown="startPtz('upLeft')" @mouseup="stopPtz" @mouseleave="stopPtz"
            @touchstart.prevent="startPtz('upLeft')" @touchend="stopPtz"
            class="ptz-btn">
            <Icon icon="mdi:arrow-top-left" />
          </button>
          <button 
            @mousedown="startPtz('up')" @mouseup="stopPtz" @mouseleave="stopPtz"
            @touchstart.prevent="startPtz('up')" @touchend="stopPtz"
            class="ptz-btn">
            <Icon icon="mdi:arrow-up" />
          </button>
          <button 
            @mousedown="startPtz('upRight')" @mouseup="stopPtz" @mouseleave="stopPtz"
            @touchstart.prevent="startPtz('upRight')" @touchend="stopPtz"
            class="ptz-btn">
            <Icon icon="mdi:arrow-top-right" />
          </button>
          
          <button 
            @mousedown="startPtz('left')" @mouseup="stopPtz" @mouseleave="stopPtz"
            @touchstart.prevent="startPtz('left')" @touchend="stopPtz"
            class="ptz-btn">
            <Icon icon="mdi:arrow-left" />
          </button>
          <button @click="calibrate" class="ptz-btn" title="Calibrate">
            <Icon icon="mdi:home" />
          </button>
          <button 
            @mousedown="startPtz('right')" @mouseup="stopPtz" @mouseleave="stopPtz"
            @touchstart.prevent="startPtz('right')" @touchend="stopPtz"
            class="ptz-btn">
            <Icon icon="mdi:arrow-right" />
          </button>
          
          <button 
            @mousedown="startPtz('downLeft')" @mouseup="stopPtz" @mouseleave="stopPtz"
            @touchstart.prevent="startPtz('downLeft')" @touchend="stopPtz"
            class="ptz-btn">
            <Icon icon="mdi:arrow-bottom-left" />
          </button>
          <button 
            @mousedown="startPtz('down')" @mouseup="stopPtz" @mouseleave="stopPtz"
            @touchstart.prevent="startPtz('down')" @touchend="stopPtz"
            class="ptz-btn">
            <Icon icon="mdi:arrow-down" />
          </button>
          <button 
            @mousedown="startPtz('downRight')" @mouseup="stopPtz" @mouseleave="stopPtz"
            @touchstart.prevent="startPtz('downRight')" @touchend="stopPtz"
            class="ptz-btn">
            <Icon icon="mdi:arrow-bottom-right" />
          </button>
        </div>
      </div>

      <!-- Cruise Control -->
      <button 
        @click="toggleCruise"
        class="btn w-full mb-2"
        :class="isCruising ? 'btn-primary' : 'btn-secondary'"
      >
        <Icon :icon="isCruising ? 'mdi:stop' : 'mdi:rotate-360'" />
        {{ isCruising ? 'Stop Cruise' : 'Start Cruise' }}
      </button>
    </div>

    <!-- Presets Tab -->
    <div v-if="activeTab === 'presets' && isConfigured">
      <!-- Add Preset -->
      <div class="flex gap-2 mb-4">
        <input 
          v-model="newPresetName"
          type="text"
          placeholder="New preset name"
          class="input flex-1"
        />
        <button @click="createPreset" class="btn btn-primary" :disabled="!newPresetName">
          <Icon icon="mdi:plus" />
        </button>
      </div>

      <!-- Preset List -->
      <div class="space-y-2 max-h-48 overflow-y-auto">
        <div 
          v-for="preset in presets" 
          :key="preset.id"
          class="flex items-center justify-between p-3 rounded-lg"
          style="background: var(--bg-secondary)"
        >
          <span class="text-sm" style="color: var(--text-primary)">{{ preset.name }}</span>
          <div class="flex gap-1">
            <button @click="gotoPreset(preset.id)" class="btn-icon btn-ghost" title="Go to">
              <Icon icon="mdi:target" />
            </button>
            <button 
              v-if="!preset.read_only"
              @click="deletePreset(preset.id)" 
              class="btn-icon btn-ghost text-red-400" 
              title="Delete"
            >
              <Icon icon="mdi:delete" />
            </button>
          </div>
        </div>
        <p v-if="presets.length === 0" class="text-center py-4" style="color: var(--text-muted)">
          No presets saved
        </p>
      </div>
    </div>

    <!-- Settings Tab -->
    <div v-if="activeTab === 'settings' && isConfigured" class="space-y-3">
      <!-- Toggle Settings -->
      <div class="flex items-center justify-between p-3 rounded-lg" style="background: var(--bg-secondary)">
        <div class="flex items-center gap-3">
          <Icon icon="mdi:eye-off" class="text-lg" style="color: var(--text-muted)" />
          <span class="text-sm" style="color: var(--text-primary)">Privacy Mode</span>
        </div>
        <button 
          @click="togglePrivacy"
          class="w-12 h-6 rounded-full transition-colors relative"
          :class="settings.privacyMode ? 'bg-blue-500' : 'bg-gray-600'"
        >
          <span 
            class="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
            :class="settings.privacyMode ? 'left-7' : 'left-1'"
          />
        </button>
      </div>

      <div class="flex items-center justify-between p-3 rounded-lg" style="background: var(--bg-secondary)">
        <div class="flex items-center gap-3">
          <Icon icon="mdi:led-on" class="text-lg" style="color: var(--text-muted)" />
          <span class="text-sm" style="color: var(--text-primary)">Status LED</span>
        </div>
        <button 
          @click="toggleLed"
          class="w-12 h-6 rounded-full transition-colors relative"
          :class="settings.ledEnabled ? 'bg-blue-500' : 'bg-gray-600'"
        >
          <span 
            class="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
            :class="settings.ledEnabled ? 'left-7' : 'left-1'"
          />
        </button>
      </div>

      <div class="flex items-center justify-between p-3 rounded-lg" style="background: var(--bg-secondary)">
        <div class="flex items-center gap-3">
          <Icon icon="mdi:motion-sensor" class="text-lg" style="color: var(--text-muted)" />
          <span class="text-sm" style="color: var(--text-primary)">Motion Detection</span>
        </div>
        <button 
          @click="toggleMotionDetection"
          class="w-12 h-6 rounded-full transition-colors relative"
          :class="settings.motionDetection ? 'bg-blue-500' : 'bg-gray-600'"
        >
          <span 
            class="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
            :class="settings.motionDetection ? 'left-7' : 'left-1'"
          />
        </button>
      </div>

      <div class="flex items-center justify-between p-3 rounded-lg" style="background: var(--bg-secondary)">
        <div class="flex items-center gap-3">
          <Icon icon="mdi:human" class="text-lg" style="color: var(--text-muted)" />
          <span class="text-sm" style="color: var(--text-primary)">Person Detection</span>
        </div>
        <button 
          @click="togglePersonDetection"
          class="w-12 h-6 rounded-full transition-colors relative"
          :class="settings.personDetection ? 'bg-blue-500' : 'bg-gray-600'"
        >
          <span 
            class="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
            :class="settings.personDetection ? 'left-7' : 'left-1'"
          />
        </button>
      </div>

      <!-- Flip Type -->
      <div class="p-3 rounded-lg" style="background: var(--bg-secondary)">
        <p class="text-sm mb-2" style="color: var(--text-primary)">Image Flip</p>
        <div class="flex gap-2">
          <button 
            v-for="flip in ['off', 'vertical', 'horizontal', 'both']"
            :key="flip"
            @click="setFlip(flip)"
            class="flex-1 py-1.5 text-xs rounded-lg transition-colors"
            :class="settings.flipType === flip ? 'bg-blue-500 text-white' : 'bg-white/5'"
          >
            {{ flip }}
          </button>
        </div>
      </div>

      <!-- Night Mode -->
      <div class="p-3 rounded-lg" style="background: var(--bg-secondary)">
        <p class="text-sm mb-2" style="color: var(--text-primary)">Night Mode</p>
        <div class="flex gap-2">
          <button 
            v-for="mode in ['auto', 'on', 'off']"
            :key="mode"
            @click="setNightMode(mode)"
            class="flex-1 py-1.5 text-xs rounded-lg transition-colors"
            :class="settings.nightMode === mode ? 'bg-blue-500 text-white' : 'bg-white/5'"
          >
            {{ mode }}
          </button>
        </div>
      </div>

      <!-- Reboot -->
      <button @click="rebootCamera" class="btn btn-secondary w-full text-red-400 hover:text-red-300">
        <Icon icon="mdi:restart" />
        Reboot Camera
      </button>
    </div>

    <!-- Config Tab -->
    <div v-if="activeTab === 'config'" class="space-y-4">
      <div>
        <label class="block text-sm mb-1" style="color: var(--text-secondary)">Tapo API URL</label>
        <input v-model="tapoApiUrl" type="text" class="input" placeholder="http://localhost:3000" />
      </div>
      <div>
        <label class="block text-sm mb-1" style="color: var(--text-secondary)">Tapo Username</label>
        <input v-model="tapoUsername" type="text" class="input" placeholder="admin" />
      </div>
      <div>
        <label class="block text-sm mb-1" style="color: var(--text-secondary)">Tapo Password</label>
        <input v-model="tapoPassword" type="password" class="input" />
      </div>
      <button @click="saveConfig" class="btn btn-primary w-full">
        <Icon icon="mdi:content-save" />
        Save Configuration
      </button>
    </div>

    <!-- Loading overlay -->
    <div v-if="loading" class="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
      <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  </div>
</template>

<style scoped>
.tapo-control-panel {
  position: relative;
  padding: 1rem;
  min-width: 300px;
}

.ptz-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 1.25rem;
  transition: all 0.15s ease;
  cursor: pointer;
  border: none;
}

.ptz-btn:hover {
  background: var(--accent-primary);
  color: white;
}

.ptz-btn:active {
  transform: scale(0.95);
}
</style>
