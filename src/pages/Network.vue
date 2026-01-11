<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { networkApi } from '@/services/api'
import type { NetworkInfo } from '@/types'

const interfaces = ref<NetworkInfo[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

async function loadNetwork() {
  isLoading.value = true
  error.value = null

  try {
    interfaces.value = await networkApi.getInfo()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load network info'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadNetwork)
</script>

<template>
  <div class="animate-fade-in">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Network</h1>
        <p class="page-subtitle">Network interfaces and connectivity</p>
      </div>

      <button 
        @click="loadNetwork"
        class="btn btn-secondary"
        :disabled="isLoading"
      >
        <Icon icon="mdi:refresh" :class="{ 'animate-spin': isLoading }" />
        Refresh
      </button>
    </div>

    <!-- Error State -->
    <div v-if="error" class="empty-state">
      <Icon icon="mdi:alert-circle-outline" class="empty-icon error" />
      <p class="empty-title">Failed to load network info</p>
      <p class="empty-text">{{ error }}</p>
      <button @click="loadNetwork" class="btn btn-primary">
        <Icon icon="mdi:refresh" />
        Retry
      </button>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading network info...</p>
    </div>

    <!-- Network Interfaces Grid -->
    <div v-else-if="interfaces.length > 0" class="network-grid">
      <div 
        v-for="iface in interfaces"
        :key="iface.name"
        class="network-card"
      >
        <div class="card-header">
          <div class="interface-icon">
            <Icon :icon="iface.name.startsWith('wl') ? 'mdi:wifi' : 'mdi:ethernet'" />
          </div>
          
          <div class="interface-info">
            <h3 class="interface-name">{{ iface.name }}</h3>
            <p v-if="iface.hardware_addr" class="interface-mac">{{ iface.hardware_addr }}</p>
          </div>
        </div>
        
        <!-- Addresses -->
        <div v-if="iface.addresses?.length" class="address-list">
          <div 
            v-for="addr in iface.addresses" 
            :key="addr"
            class="address-item"
          >
            <Icon 
              :icon="addr.includes(':') ? 'mdi:ip-network' : 'mdi:ip'" 
              class="address-icon"
            />
            <span class="address-text">{{ addr }}</span>
          </div>
        </div>

        <!-- Flags -->
        <div v-if="iface.flags?.length" class="flag-list">
          <span 
            v-for="flag in iface.flags"
            :key="flag"
            class="flag-badge"
          >
            {{ flag }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <Icon icon="mdi:lan-disconnect" class="empty-icon" />
      <p class="empty-title">No network interfaces found</p>
    </div>
  </div>
</template>

<style scoped>
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

.page-subtitle {
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 2rem;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid var(--border);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-state p {
  color: var(--text-secondary);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  color: var(--text-dim);
  margin-bottom: 1rem;
}

.empty-icon.error {
  color: var(--danger);
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-text {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

/* Network Grid */
.network-grid {
  display: grid;
  gap: 1rem;
}

@media (min-width: 768px) {
  .network-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.network-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
  transition: border-color var(--transition-fast);
}

.network-card:hover {
  border-color: var(--border-hover);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.interface-icon {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-lg);
  background: var(--info-muted);
  color: var(--info);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.interface-info {
  min-width: 0;
}

.interface-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.interface-mac {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.address-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.address-icon {
  color: var(--text-dim);
  flex-shrink: 0;
}

.address-text {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  word-break: break-all;
}

.flag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.flag-badge {
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  border-radius: var(--radius-full);
  background: var(--accent-secondary-muted);
  color: var(--accent-secondary);
}
</style>
