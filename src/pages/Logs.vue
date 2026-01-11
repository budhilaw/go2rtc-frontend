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

const levelStyles: Record<string, string> = {
  DEBUG: 'text-muted',
  INFO: 'text-info',
  WARN: 'text-warning',
  ERROR: 'text-danger',
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
        
        if (logs.value.length > 1000) {
          logs.value = logs.value.slice(-1000)
        }
      }
    } catch {
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
    <div class="page-header">
      <div>
        <h1 class="page-title">Logs</h1>
        <p class="page-subtitle">Real-time log viewer</p>
      </div>

      <div class="header-actions">
        <span class="status-badge" :class="isConnected ? 'connected' : 'disconnected'">
          <span class="status-dot" :class="{ 'animate-pulse': isConnected }"></span>
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>

        <button 
          @click="togglePause"
          class="btn btn-secondary"
          :class="{ active: isPaused }"
        >
          <Icon :icon="isPaused ? 'mdi:play' : 'mdi:pause'" />
          {{ isPaused ? 'Resume' : 'Pause' }}
        </button>
        
        <button @click="toggleReverse" class="btn-icon" title="Toggle order">
          <Icon :icon="isReversed ? 'mdi:sort-ascending' : 'mdi:sort-descending'" />
        </button>
        
        <button @click="clearLogs" class="btn btn-secondary">
          <Icon icon="mdi:delete-outline" />
          Clear
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-wrapper">
        <Icon icon="mdi:magnify" class="search-icon" />
        <input
          v-model="filter"
          type="text"
          placeholder="Search logs..."
          class="search-input"
        />
      </div>

      <div class="level-filters">
        <button
          v-for="level in levels"
          :key="level"
          @click="setLevelFilter(level)"
          class="level-btn"
          :class="[levelStyles[level], { active: levelFilter === level }]"
        >
          {{ level }}
        </button>
      </div>

      <span class="log-count">{{ filteredLogs.length }} logs</span>
    </div>

    <!-- Log Container -->
    <div class="log-container">
      <div class="log-scroll">
        <div v-if="filteredLogs.length === 0" class="log-empty">
          <Icon icon="mdi:text-box-outline" />
          <p>No logs to display</p>
        </div>

        <div 
          v-for="log in filteredLogs"
          :key="log.id"
          class="log-entry"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-level" :class="levelStyles[log.level]">{{ log.level }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
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

.page-subtitle {
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Status Badge */
.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--radius-full);
}

.status-badge.connected {
  background: var(--success-muted);
  color: var(--success);
}

.status-badge.disconnected {
  background: var(--danger-muted);
  color: var(--danger);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.btn-secondary.active {
  background: var(--warning-muted);
  border-color: rgba(234, 179, 8, 0.2);
  color: var(--warning);
}

/* Filters Bar */
.filters-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-dim);
}

.search-input {
  width: 100%;
  padding: 0.625rem 1rem 0.625rem 2.5rem;
  font-size: 0.875rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  transition: all var(--transition-fast);
}

.search-input::placeholder {
  color: var(--text-dim);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.level-filters {
  display: flex;
  gap: 0.25rem;
}

.level-btn {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  opacity: 0.6;
}

.level-btn:hover {
  opacity: 0.8;
}

.level-btn.active {
  opacity: 1;
  background: var(--bg-elevated);
}

.text-muted { color: var(--text-muted); }
.text-info { color: var(--info); }
.text-warning { color: var(--warning); }
.text-danger { color: var(--danger); }

.log-count {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* Log Container */
.log-container {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.log-scroll {
  max-height: calc(100vh - 320px);
  overflow-y: auto;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.8125rem;
}

.log-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-muted);
}

.log-empty svg {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.log-entry {
  display: flex;
  gap: 1rem;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--border);
  transition: background var(--transition-fast);
}

.log-entry:hover {
  background: var(--bg-hover);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  flex-shrink: 0;
  color: var(--text-muted);
}

.log-level {
  flex-shrink: 0;
  width: 3.5rem;
  font-weight: 600;
}

.log-message {
  flex: 1;
  color: var(--text-primary);
  word-break: break-all;
}
</style>
