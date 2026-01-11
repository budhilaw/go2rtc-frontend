<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useAppStore } from '@/stores/app'
import StreamCard from '@/components/StreamCard.vue'

const store = useAppStore()
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')

const filteredStreams = computed(() => {
  if (!searchQuery.value) return store.streamNames
  return store.streamNames.filter(name => 
    name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

async function handleDelete(name: string) {
  if (confirm(`Are you sure you want to delete stream "${name}"?`)) {
    await store.deleteStream(name)
  }
}

function handleProbe(name: string) {
  window.open(`/api/streams?src=${encodeURIComponent(name)}`, '_blank')
}

onMounted(() => {
  store.fetchStreams()
})
</script>

<template>
  <div class="animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-bold gradient-text">Dashboard</h1>
        <p class="mt-1" style="color: var(--text-secondary)">
          Manage your camera streams
        </p>
      </div>
      
      <div class="flex items-center gap-3">
        <!-- Search -->
        <div class="relative">
          <Icon 
            icon="mdi:magnify" 
            class="absolute left-3 top-1/2 -translate-y-1/2" 
            style="color: var(--text-muted)"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search streams..."
            class="input pl-10 w-64"
          />
        </div>

        <!-- View Toggle -->
        <div class="flex rounded-lg overflow-hidden border" style="border-color: var(--border-color)">
          <button
            @click="viewMode = 'grid'"
            class="p-2 transition-colors"
            :class="viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/5'"
          >
            <Icon icon="mdi:view-grid" class="text-lg" />
          </button>
          <button
            @click="viewMode = 'list'"
            class="p-2 transition-colors"
            :class="viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/5'"
          >
            <Icon icon="mdi:view-list" class="text-lg" />
          </button>
        </div>

        <!-- Refresh -->
        <button 
          @click="store.fetchStreams"
          class="btn btn-secondary"
          :disabled="store.streamsLoading"
        >
          <Icon 
            icon="mdi:refresh" 
            :class="{ 'animate-spin': store.streamsLoading }"
          />
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="glass-card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Icon icon="mdi:video-outline" class="text-blue-400 text-xl" />
          </div>
          <div>
            <p class="text-2xl font-bold" style="color: var(--text-primary)">{{ store.streamCount }}</p>
            <p class="text-sm" style="color: var(--text-muted)">Total Streams</p>
          </div>
        </div>
      </div>

      <div class="glass-card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Icon icon="mdi:check-circle" class="text-green-400 text-xl" />
          </div>
          <div>
            <p class="text-2xl font-bold" style="color: var(--text-primary)">{{ store.onlineStreams.length }}</p>
            <p class="text-sm" style="color: var(--text-muted)">Online</p>
          </div>
        </div>
      </div>

      <div class="glass-card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Icon icon="mdi:cast" class="text-purple-400 text-xl" />
          </div>
          <div>
            <p class="text-2xl font-bold" style="color: var(--text-primary)">{{ store.playbackMode.toUpperCase() }}</p>
            <p class="text-sm" style="color: var(--text-muted)">Default Mode</p>
          </div>
        </div>
      </div>

      <div class="glass-card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Icon icon="mdi:connection" class="text-orange-400 text-xl" />
          </div>
          <div>
            <p class="text-2xl font-bold" style="color: var(--text-primary)">Active</p>
            <p class="text-sm" style="color: var(--text-muted)">Server Status</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="store.streamsLoading && store.streamCount === 0" class="flex flex-col items-center justify-center py-20">
      <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p style="color: var(--text-secondary)">Loading streams...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="store.streamsError" class="flex flex-col items-center justify-center py-20">
      <Icon icon="mdi:alert-circle" class="text-red-500 text-5xl mb-4" />
      <p class="text-lg mb-2" style="color: var(--text-primary)">Failed to load streams</p>
      <p class="mb-4" style="color: var(--text-secondary)">{{ store.streamsError }}</p>
      <button @click="store.fetchStreams" class="btn btn-primary">
        <Icon icon="mdi:refresh" />
        Retry
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredStreams.length === 0" class="flex flex-col items-center justify-center py-20">
      <Icon icon="mdi:video-off-outline" class="text-5xl mb-4" style="color: var(--text-muted)" />
      <p class="text-lg mb-2" style="color: var(--text-primary)">No streams found</p>
      <p class="mb-4" style="color: var(--text-secondary)">
        {{ searchQuery ? 'Try a different search term' : 'Add your first stream to get started' }}
      </p>
      <RouterLink v-if="!searchQuery" to="/add" class="btn btn-primary">
        <Icon icon="mdi:plus" />
        Add Stream
      </RouterLink>
    </div>

    <!-- Stream Grid -->
    <div 
      v-else
      class="grid gap-4"
      :class="viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'"
    >
      <StreamCard
        v-for="name in filteredStreams"
        :key="name"
        :name="name"
        :info="store.streams[name] ?? null"
        @delete="handleDelete"
        @probe="handleProbe"
      />
    </div>
  </div>
</template>
