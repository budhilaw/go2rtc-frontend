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
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-bold gradient-text">Network</h1>
        <p class="mt-1" style="color: var(--text-secondary)">
          Network interfaces and connectivity
        </p>
      </div>

      <button 
        @click="loadNetwork"
        class="btn btn-secondary"
        :disabled="isLoading"
      >
        <Icon 
          icon="mdi:refresh" 
          :class="{ 'animate-spin': isLoading }"
        />
        Refresh
      </button>
    </div>

    <!-- Error State -->
    <div v-if="error" class="flex flex-col items-center justify-center py-20">
      <Icon icon="mdi:alert-circle" class="text-red-500 text-5xl mb-4" />
      <p class="text-lg mb-2" style="color: var(--text-primary)">Failed to load network info</p>
      <p class="mb-4" style="color: var(--text-secondary)">{{ error }}</p>
      <button @click="loadNetwork" class="btn btn-primary">
        <Icon icon="mdi:refresh" />
        Retry
      </button>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="flex flex-col items-center justify-center py-20">
      <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p style="color: var(--text-secondary)">Loading network info...</p>
    </div>

    <!-- Network Interfaces -->
    <div v-else class="grid md:grid-cols-2 gap-4">
      <div 
        v-for="iface in interfaces"
        :key="iface.name"
        class="card"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <Icon 
              :icon="iface.name.startsWith('wl') ? 'mdi:wifi' : 'mdi:ethernet'" 
              class="text-blue-400 text-2xl" 
            />
          </div>
          
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-lg" style="color: var(--text-primary)">
              {{ iface.name }}
            </h3>
            
            <!-- Hardware Address -->
            <p v-if="iface.hardware_addr" class="font-mono text-sm mt-1" style="color: var(--text-muted)">
              {{ iface.hardware_addr }}
            </p>
            
            <!-- Addresses -->
            <div v-if="iface.addresses?.length" class="mt-3 space-y-1">
              <div 
                v-for="addr in iface.addresses" 
                :key="addr"
                class="flex items-center gap-2"
              >
                <Icon 
                  :icon="addr.includes(':') ? 'mdi:ip-network' : 'mdi:ip'" 
                  class="shrink-0"
                  style="color: var(--text-muted)"
                />
                <span class="font-mono text-sm break-all" style="color: var(--text-secondary)">
                  {{ addr }}
                </span>
              </div>
            </div>

            <!-- Flags -->
            <div v-if="iface.flags?.length" class="flex flex-wrap gap-1 mt-3">
              <span 
                v-for="flag in iface.flags"
                :key="flag"
                class="badge badge-info text-xs"
              >
                {{ flag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && !error && interfaces.length === 0" class="flex flex-col items-center justify-center py-20">
      <Icon icon="mdi:lan-disconnect" class="text-5xl mb-4" style="color: var(--text-muted)" />
      <p class="text-lg" style="color: var(--text-primary)">No network interfaces found</p>
    </div>
  </div>
</template>
