<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const route = useRoute()

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'mdi:view-dashboard' },
  { path: '/add', label: 'Add Stream', icon: 'mdi:plus-circle' },
  { path: '/config', label: 'Config', icon: 'mdi:cog' },
  { path: '/logs', label: 'Logs', icon: 'mdi:text-box-outline' },
  { path: '/network', label: 'Network', icon: 'mdi:lan' },
]
</script>

<template>
  <header class="glass sticky top-0 z-50">
    <div class="container mx-auto max-w-7xl px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center gap-3 group">
          <div class="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Icon icon="mdi:video-wireless" class="text-white text-xl" />
          </div>
          <span class="text-xl font-bold gradient-text">go2rtc</span>
        </RouterLink>

        <!-- Navigation -->
        <nav class="hidden md:flex items-center gap-1">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            :class="[
              route.path === item.path
                ? 'text-white bg-gradient-to-r from-blue-500/20 to-purple-500/20'
                : 'hover:bg-white/5'
            ]"
            :style="{ color: route.path === item.path ? 'var(--accent-primary)' : 'var(--text-secondary)' }"
          >
            <Icon :icon="item.icon" class="text-lg" />
            <span class="text-sm font-medium">{{ item.label }}</span>
          </RouterLink>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <!-- Playback mode indicators -->
          <div class="hidden sm:flex items-center gap-1 mr-2">
            <button
              v-for="mode in ['webrtc', 'mse', 'hls', 'mjpeg']"
              :key="mode"
              @click="store.togglePlaybackMode(mode as any)"
              class="px-2 py-1 text-xs rounded-md transition-all"
              :class="[
                store.enabledModes.includes(mode as any)
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-500/10 text-gray-500'
              ]"
            >
              {{ mode.toUpperCase() }}
            </button>
          </div>

          <!-- Theme toggle -->
          <button
            @click="store.toggleTheme"
            class="btn-icon btn-ghost"
            title="Toggle theme"
          >
            <Icon
              :icon="store.theme === 'dark' ? 'mdi:weather-sunny' : 'mdi:weather-night'"
              class="text-xl"
            />
          </button>

          <!-- Mobile menu button -->
          <button class="btn-icon btn-ghost md:hidden">
            <Icon icon="mdi:menu" class="text-xl" />
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
