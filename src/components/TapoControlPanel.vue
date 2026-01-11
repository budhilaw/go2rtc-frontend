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
const tapoApiUrl = ref(localStorage.getItem('tapoApiUrl') || process.env.TAPO_API_URL || 'http://localhost:3000')
const tapoUsername = ref(localStorage.getItem('tapoUsername') || process.env.TAPO_USERNAME || '')
const tapoPassword = ref(localStorage.getItem('tapoPassword') || process.env.TAPO_PASSWORD || '')

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
  <div class="tapo-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="panel-info">
        <div class="panel-icon">
          <Icon icon="mdi:cctv" />
        </div>
        <div>
          <h3 class="panel-title">{{ deviceInfo?.device_alias || props.streamName || 'Tapo Camera' }}</h3>
          <p class="panel-ip">{{ props.cameraIp }}</p>
        </div>
      </div>
      <button @click="emit('close')" class="btn-icon">
        <Icon icon="mdi:close" />
      </button>
    </div>

    <!-- Config Required -->
    <div v-if="!isConfigured" class="config-required">
      <p>Please configure Tapo API credentials to control this camera.</p>
      <button @click="activeTab = 'config'" class="btn btn-primary w-full">
        <Icon icon="mdi:cog" />
        Configure
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-alert">
      <Icon icon="mdi:alert-circle-outline" />
      <span>{{ error }}</span>
    </div>

    <!-- Tabs -->
    <div v-if="isConfigured" class="panel-tabs">
      <button 
        v-for="tab in ['ptz', 'presets', 'settings', 'config'] as const"
        :key="tab"
        @click="activeTab = tab"
        class="tab-btn"
        :class="{ active: activeTab === tab }"
      >
        {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
      </button>
    </div>

    <!-- PTZ Tab -->
    <div v-if="activeTab === 'ptz' && isConfigured" class="tab-content">
      <div class="ptz-controls">
        <div class="ptz-grid">
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
          <button @click="calibrate" class="ptz-btn home">
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

      <button 
        @click="toggleCruise"
        class="btn w-full"
        :class="isCruising ? 'btn-primary' : 'btn-secondary'"
      >
        <Icon :icon="isCruising ? 'mdi:stop' : 'mdi:rotate-360'" />
        {{ isCruising ? 'Stop Cruise' : 'Start Cruise' }}
      </button>
    </div>

    <!-- Presets Tab -->
    <div v-if="activeTab === 'presets' && isConfigured" class="tab-content">
      <div class="preset-form">
        <input 
          v-model="newPresetName"
          type="text"
          placeholder="New preset name"
          class="input"
        />
        <button @click="createPreset" class="btn btn-primary" :disabled="!newPresetName">
          <Icon icon="mdi:plus" />
        </button>
      </div>

      <div class="preset-list">
        <div 
          v-for="preset in presets" 
          :key="preset.id"
          class="preset-item"
        >
          <span class="preset-name">{{ preset.name }}</span>
          <div class="preset-actions">
            <button @click="gotoPreset(preset.id)" class="btn-icon" title="Go to">
              <Icon icon="mdi:target" />
            </button>
            <button 
              v-if="!preset.read_only"
              @click="deletePreset(preset.id)" 
              class="btn-icon delete"
              title="Delete"
            >
              <Icon icon="mdi:delete-outline" />
            </button>
          </div>
        </div>
        <p v-if="presets.length === 0" class="empty-text">No presets saved</p>
      </div>
    </div>

    <!-- Settings Tab -->
    <div v-if="activeTab === 'settings' && isConfigured" class="tab-content">
      <div class="setting-item">
        <div class="setting-label">
          <Icon icon="mdi:eye-off-outline" />
          <span>Privacy Mode</span>
        </div>
        <button 
          @click="togglePrivacy"
          class="toggle"
          :class="{ active: settings.privacyMode }"
        ></button>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <Icon icon="mdi:led-on" />
          <span>Status LED</span>
        </div>
        <button 
          @click="toggleLed"
          class="toggle"
          :class="{ active: settings.ledEnabled }"
        ></button>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <Icon icon="mdi:motion-sensor" />
          <span>Motion Detection</span>
        </div>
        <button 
          @click="toggleMotionDetection"
          class="toggle"
          :class="{ active: settings.motionDetection }"
        ></button>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <Icon icon="mdi:human" />
          <span>Person Detection</span>
        </div>
        <button 
          @click="togglePersonDetection"
          class="toggle"
          :class="{ active: settings.personDetection }"
        ></button>
      </div>

      <div class="setting-group">
        <p class="setting-group-label">Image Flip</p>
        <div class="option-buttons">
          <button 
            v-for="flip in ['off', 'vertical', 'horizontal', 'both']"
            :key="flip"
            @click="setFlip(flip)"
            class="option-btn"
            :class="{ active: settings.flipType === flip }"
          >
            {{ flip }}
          </button>
        </div>
      </div>

      <div class="setting-group">
        <p class="setting-group-label">Night Mode</p>
        <div class="option-buttons">
          <button 
            v-for="mode in ['auto', 'on', 'off']"
            :key="mode"
            @click="setNightMode(mode)"
            class="option-btn"
            :class="{ active: settings.nightMode === mode }"
          >
            {{ mode }}
          </button>
        </div>
      </div>

      <button @click="rebootCamera" class="btn btn-danger w-full">
        <Icon icon="mdi:restart" />
        Reboot Camera
      </button>
    </div>

    <!-- Config Tab -->
    <div v-if="activeTab === 'config'" class="tab-content">
      <div class="form-group">
        <label class="form-label">Tapo API URL</label>
        <input v-model="tapoApiUrl" type="text" class="input" placeholder="http://localhost:3000" />
      </div>
      <div class="form-group">
        <label class="form-label">Tapo Username</label>
        <input v-model="tapoUsername" type="text" class="input" placeholder="admin" />
      </div>
      <div class="form-group">
        <label class="form-label">Tapo Password</label>
        <input v-model="tapoPassword" type="password" class="input" />
      </div>
      <button @click="saveConfig" class="btn btn-primary w-full">
        <Icon icon="mdi:content-save-outline" />
        Save Configuration
      </button>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<style scoped>
.tapo-panel {
  position: relative;
  padding: 1.25rem;
}

/* Header */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.panel-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.panel-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-lg);
  background: var(--success-muted);
  color: var(--success);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.panel-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-ip {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Config Required */
.config-required {
  padding: 1rem 0;
}

.config-required p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

/* Error */
.error-alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--danger-muted);
  border-radius: var(--radius-lg);
  color: var(--danger);
  font-size: 0.8125rem;
}

/* Tabs */
.panel-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.tab-btn {
  flex: 1;
  padding: 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  background: var(--bg-hover);
}

.tab-btn.active {
  background: var(--accent-primary-muted);
  color: var(--accent-primary);
}

/* Tab Content */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* PTZ Controls */
.ptz-controls {
  display: flex;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.ptz-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
}

.ptz-btn {
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-size: 1.25rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.ptz-btn:hover {
  background: var(--bg-hover);
}

.ptz-btn:active {
  background: var(--accent-primary);
  transform: scale(0.95);
}

.ptz-btn.home {
  background: var(--accent-primary-muted);
  color: var(--accent-primary);
}

/* Presets */
.preset-form {
  display: flex;
  gap: 0.5rem;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 12rem;
  overflow-y: auto;
}

.preset-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.preset-name {
  font-size: 0.875rem;
  color: var(--text-primary);
}

.preset-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon.delete:hover {
  background: var(--danger-muted);
  color: var(--danger);
}

.empty-text {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}

/* Settings */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.setting-label svg {
  color: var(--text-muted);
}

.setting-group {
  padding: 0.875rem;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.setting-group-label {
  font-size: 0.875rem;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.option-buttons {
  display: flex;
  gap: 0.375rem;
}

.option-btn {
  flex: 1;
  padding: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border: none;
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-transform: capitalize;
}

.option-btn:hover {
  background: var(--bg-hover);
}

.option-btn.active {
  background: var(--accent-primary);
  color: white;
}

/* Form */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-label {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

/* Loading */
.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 15, 20, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xl);
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--border);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Utilities */
.w-full {
  width: 100%;
}
</style>
