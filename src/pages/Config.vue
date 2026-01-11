<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { configApi } from '@/services/api'

const config = ref('')
const originalConfig = ref('')
const isLoading = ref(true)
const isSaving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const hasChanges = ref(false)

async function loadConfig() {
  isLoading.value = true
  error.value = null

  try {
    config.value = await configApi.get()
    originalConfig.value = config.value
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load configuration'
  } finally {
    isLoading.value = false
  }
}

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  config.value = target.value
  hasChanges.value = config.value !== originalConfig.value
}

async function saveConfig() {
  isSaving.value = true
  error.value = null
  success.value = null

  try {
    await configApi.save(config.value)
    originalConfig.value = config.value
    hasChanges.value = false
    success.value = 'Configuration saved successfully!'
    setTimeout(() => success.value = null, 3000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save configuration'
  } finally {
    isSaving.value = false
  }
}

async function saveAndRestart() {
  isSaving.value = true
  error.value = null
  success.value = null

  try {
    await configApi.save(config.value)
    await configApi.restart()
    originalConfig.value = config.value
    hasChanges.value = false
    success.value = 'Configuration saved and server restarting...'
    setTimeout(() => {
      window.location.reload()
    }, 2000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save and restart'
  } finally {
    isSaving.value = false
  }
}

function resetConfig() {
  config.value = originalConfig.value
  hasChanges.value = false
}

onMounted(loadConfig)
</script>

<template>
  <div class="animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold gradient-text">Configuration</h1>
        <p class="mt-1" style="color: var(--text-secondary)">
          Edit go2rtc.yaml configuration
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button 
          v-if="hasChanges"
          @click="resetConfig"
          class="btn btn-ghost"
        >
          <Icon icon="mdi:undo" />
          Reset
        </button>
        <button 
          @click="saveConfig"
          class="btn btn-secondary"
          :disabled="isSaving || !hasChanges"
        >
          <Icon v-if="isSaving" icon="mdi:loading" class="animate-spin" />
          <Icon v-else icon="mdi:content-save" />
          Save
        </button>
        <button 
          @click="saveAndRestart"
          class="btn btn-primary"
          :disabled="isSaving"
        >
          <Icon v-if="isSaving" icon="mdi:loading" class="animate-spin" />
          <Icon v-else icon="mdi:restart" />
          Save & Restart
        </button>
      </div>
    </div>

    <!-- Status Messages -->
    <div v-if="error" class="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
      <Icon icon="mdi:alert-circle" class="text-red-400 text-xl" />
      <p class="text-red-400">{{ error }}</p>
    </div>

    <div v-if="success" class="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
      <Icon icon="mdi:check-circle" class="text-green-400 text-xl" />
      <p class="text-green-400">{{ success }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
      <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p style="color: var(--text-secondary)">Loading configuration...</p>
    </div>

    <!-- Editor -->
    <div v-else class="card p-0 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: var(--border-color); background: var(--bg-secondary)">
        <div class="flex items-center gap-2">
          <Icon icon="mdi:file-code" style="color: var(--text-muted)" />
          <span class="text-sm font-medium" style="color: var(--text-secondary)">go2rtc.yaml</span>
        </div>
        <div class="flex items-center gap-2">
          <span 
            v-if="hasChanges" 
            class="badge badge-warning"
          >
            <Icon icon="mdi:circle-small" />
            Unsaved changes
          </span>
          <span class="text-xs" style="color: var(--text-muted)">YAML</span>
        </div>
      </div>

      <div class="relative">
        <textarea
          :value="config"
          @input="handleInput"
          class="w-full min-h-[600px] p-4 font-mono text-sm resize-y focus:outline-none"
          style="background: var(--bg-primary); color: var(--text-primary); border: none;"
          spellcheck="false"
        />
        
        <!-- Line numbers (decorative) -->
        <div 
          class="absolute top-0 left-0 p-4 pointer-events-none select-none font-mono text-sm"
          style="color: var(--text-muted)"
        >
          <div v-for="i in config.split('\n').length" :key="i" class="h-6">
            {{ i }}
          </div>
        </div>
      </div>
    </div>

    <!-- Help Section -->
    <div class="mt-6 grid md:grid-cols-2 gap-4">
      <div class="card">
        <h3 class="font-semibold mb-2 flex items-center gap-2" style="color: var(--text-primary)">
          <Icon icon="mdi:lightbulb" class="text-yellow-400" />
          Tips
        </h3>
        <ul class="text-sm space-y-2" style="color: var(--text-secondary)">
          <li>• Changes require a restart to take effect</li>
          <li>• Use YAML syntax for configuration</li>
          <li>• Backup your config before major changes</li>
        </ul>
      </div>

      <div class="card">
        <h3 class="font-semibold mb-2 flex items-center gap-2" style="color: var(--text-primary)">
          <Icon icon="mdi:book-open-variant" class="text-blue-400" />
          Documentation
        </h3>
        <a 
          href="https://github.com/AlexxIT/go2rtc/wiki" 
          target="_blank"
          class="text-sm text-blue-400 hover:underline flex items-center gap-1"
        >
          View go2rtc Wiki
          <Icon icon="mdi:open-in-new" />
        </a>
      </div>
    </div>
  </div>
</template>
