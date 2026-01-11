<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { RouterLink } from 'vue-router'
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
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Manage your camera streams</p>
      </div>
      
      <div class="header-actions">
        <!-- Search -->
        <div class="search-wrapper">
          <Icon icon="mdi:magnify" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search streams..."
            class="search-input"
          />
        </div>

        <!-- View Toggle -->
        <div class="view-toggle">
          <button
            @click="viewMode = 'grid'"
            class="view-btn"
            :class="{ active: viewMode === 'grid' }"
          >
            <Icon icon="mdi:view-grid-outline" />
          </button>
          <button
            @click="viewMode = 'list'"
            class="view-btn"
            :class="{ active: viewMode === 'list' }"
          >
            <Icon icon="mdi:view-list-outline" />
          </button>
        </div>

        <!-- Refresh -->
        <button 
          @click="store.fetchStreams"
          :disabled="store.streamsLoading"
          class="btn-icon"
        >
          <Icon icon="mdi:refresh" :class="{ 'animate-spin': store.streamsLoading }" />
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">
          <Icon icon="mdi:video-outline" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ store.streamCount }}</span>
          <span class="stat-label">Total Streams</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <Icon icon="mdi:check-circle-outline" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ store.onlineStreams.length }}</span>
          <span class="stat-label">Online</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon purple">
          <Icon icon="mdi:cast" />
        </div>
        <div class="stat-content">
          <span class="stat-value uppercase">{{ store.playbackMode }}</span>
          <span class="stat-label">Default Mode</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon orange">
          <Icon icon="mdi:server-outline" />
        </div>
        <div class="stat-content">
          <span class="stat-value">Active</span>
          <span class="stat-label">Server Status</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="store.streamsLoading && store.streamCount === 0" class="empty-state">
      <div class="loading-spinner"></div>
      <p class="empty-text">Loading streams...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="store.streamsError" class="empty-state">
      <Icon icon="mdi:alert-circle-outline" class="empty-icon error" />
      <p class="empty-title">Failed to load streams</p>
      <p class="empty-text">{{ store.streamsError }}</p>
      <button @click="store.fetchStreams" class="btn btn-primary">
        <Icon icon="mdi:refresh" />
        Retry
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredStreams.length === 0" class="empty-state">
      <Icon icon="mdi:video-off-outline" class="empty-icon" />
      <p class="empty-title">No streams found</p>
      <p class="empty-text">
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
      class="streams-grid"
      :class="viewMode"
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

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (min-width: 640px) {
  .page-header {
    flex-direction: row;
    align-items: center;
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
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

/* Search */
.search-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-dim);
  font-size: 1.125rem;
}

.search-input {
  width: 100%;
  min-width: 200px;
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
  background: var(--bg-elevated);
}

@media (min-width: 640px) {
  .search-input {
    width: 16rem;
  }
}

/* View Toggle */
.view-toggle {
  display: flex;
  padding: 0.25rem;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.view-btn {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--text-dim);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 1.125rem;
}

.view-btn:hover {
  color: var(--text-secondary);
}

.view-btn.active {
  background: var(--accent-primary);
  color: white;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  transition: border-color var(--transition-fast);
}

.stat-card:hover {
  border-color: var(--border-hover);
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-icon.blue {
  background: var(--info-muted);
  color: var(--info);
}

.stat-icon.green {
  background: var(--success-muted);
  color: var(--success);
}

.stat-icon.purple {
  background: var(--accent-primary-muted);
  color: var(--accent-primary);
}

.stat-icon.orange {
  background: var(--warning-muted);
  color: var(--warning);
}

.stat-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-value {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--text-muted);
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

.loading-spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid var(--border);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

/* Stream Grid */
.streams-grid {
  display: grid;
  gap: 1rem;
}

.streams-grid.grid {
  grid-template-columns: repeat(1, 1fr);
}

@media (min-width: 640px) {
  .streams-grid.grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .streams-grid.grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.streams-grid.list {
  grid-template-columns: 1fr;
}

.uppercase {
  text-transform: uppercase;
}
</style>
