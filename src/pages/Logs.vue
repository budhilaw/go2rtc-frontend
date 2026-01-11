<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Icon } from '@iconify/vue'

interface LogEntry {
  id: number
  time: string
  level: string
  message: string
}

const logs = ref<LogEntry[]>([])
const isConnected = ref(false)
const isPaused = ref(false)
const isReversed = ref(false)
const filter = ref('')
const levelFilter = ref<string | null>(null)

let ws: WebSocket | null = null
let logId = 0

const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR']

const filteredLogs = computed(() => {
  let result = [...logs.value]
  
  if (levelFilter.value) {
    result = result.filter(log => log.level === levelFilter.value)
  }
  
  if (filter.value) {
    const search = filter.value.toLowerCase()
    result = result.filter(log => 
      log.message.toLowerCase().includes(search)
    )
  }
  
  if (isReversed.value) {
    result.reverse()
  }
  
  return result
})

const levelColors: Record<string, string> = {
  DEBUG: 'text-gray-400',
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
}

function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  ws = new WebSocket(`${protocol}//${window.location.host}/api/ws?src=log`)
  
  ws.onopen = () => {
    isConnected.value = true
    ws?.send(JSON.stringify({ type: 'log' }))
  }
  
  ws.onmessage = (event) => {
    if (isPaused.value) return
    
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'log' && data.value) {
        logs.value.push({
          id: logId++,
          time: new Date().toLocaleTimeString(),
          level: data.value.level || 'INFO',
          message: data.value.message || data.value
        })
        
        // Keep only last 1000 logs
        if (logs.value.length > 1000) {
          logs.value = logs.value.slice(-1000)
        }
      }
    } catch {
      // Handle plain text logs
      logs.value.push({
        id: logId++,
        time: new Date().toLocaleTimeString(),
        level: 'INFO',
        message: event.data
      })
    }
  }
  
  ws.onclose = () => {
    isConnected.value = false
  }
  
  ws.onerror = () => {
    isConnected.value = false
  }
}

function disconnect() {
  if (ws) {
    ws.close()
    ws = null
  }
}

function clearLogs() {
  logs.value = []
}

function togglePause() {
  isPaused.value = !isPaused.value
}

function toggleReverse() {
  isReversed.value = !isReversed.value
}

function setLevelFilter(level: string | null) {
  levelFilter.value = levelFilter.value === level ? null : level
}

onMounted(connect)
onUnmounted(disconnect)
</script>

<template>
  <div class="animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold gradient-text">Logs</h1>
        <p class="mt-1" style="color: var(--text-secondary)">
          Real-time log viewer
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Connection Status -->
        <span 
          class="badge"
          :class="isConnected ? 'badge-success' : 'badge-danger'"
        >
          <span 
            class="w-2 h-2 rounded-full"
            :class="isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'"
          ></span>
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>

        <!-- Controls -->
        <button 
          @click="togglePause"
          class="btn btn-secondary"
          :class="{ 'ring-2 ring-yellow-500': isPaused }"
        >
          <Icon :icon="isPaused ? 'mdi:play' : 'mdi:pause'" />
          {{ isPaused ? 'Resume' : 'Pause' }}
        </button>
        
        <button @click="toggleReverse" class="btn btn-secondary">
          <Icon :icon="isReversed ? 'mdi:sort-ascending' : 'mdi:sort-descending'" />
        </button>
        
        <button @click="clearLogs" class="btn btn-secondary">
          <Icon icon="mdi:delete-outline" />
          Clear
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <!-- Search -->
      <div class="relative flex-1 min-w-64">
        <Icon 
          icon="mdi:magnify" 
          class="absolute left-3 top-1/2 -translate-y-1/2" 
          style="color: var(--text-muted)"
        />
        <input
          v-model="filter"
          type="text"
          placeholder="Search logs..."
          class="input pl-10"
        />
      </div>

      <!-- Level Filters -->
      <div class="flex items-center gap-1">
        <button
          v-for="level in levels"
          :key="level"
          @click="setLevelFilter(level)"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          :class="levelFilter === level 
            ? 'bg-blue-500/20 text-blue-400' 
            : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'"
        >
          {{ level }}
        </button>
      </div>

      <!-- Count -->
      <span class="text-sm" style="color: var(--text-muted)">
        {{ filteredLogs.length }} logs
      </span>
    </div>

    <!-- Log Container -->
    <div 
      class="card p-0 overflow-hidden"
      style="max-height: calc(100vh - 300px)"
    >
      <div 
        class="overflow-auto font-mono text-sm"
        style="max-height: calc(100vh - 300px)"
      >
        <div v-if="filteredLogs.length === 0" class="p-8 text-center" style="color: var(--text-muted)">
          <Icon icon="mdi:text-box-outline" class="text-4xl mb-2" />
          <p>No logs to display</p>
        </div>

        <div 
          v-for="log in filteredLogs"
          :key="log.id"
          class="flex gap-4 px-4 py-2 border-b hover:bg-white/5 transition-colors"
          style="border-color: var(--border-color)"
        >
          <span class="shrink-0" style="color: var(--text-muted)">{{ log.time }}</span>
          <span 
            class="shrink-0 w-14 font-medium"
            :class="levelColors[log.level] || 'text-gray-400'"
          >
            {{ log.level }}
          </span>
          <span class="break-all" style="color: var(--text-primary)">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
