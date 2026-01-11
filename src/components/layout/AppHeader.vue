<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const route = useRoute()
const mobileMenuOpen = ref(false)

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'mdi:view-dashboard-outline' },
  { path: '/add', label: 'Add Stream', icon: 'mdi:plus-circle-outline' },
  { path: '/config', label: 'Config', icon: 'mdi:cog-outline' },
  { path: '/logs', label: 'Logs', icon: 'mdi:text-box-outline' },
  { path: '/network', label: 'Network', icon: 'mdi:lan' },
]
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <!-- Logo -->
      <RouterLink to="/" class="logo-link">
        <div class="logo-icon">
          <Icon icon="mdi:video-wireless" />
        </div>
        <span class="logo-text">go2rtc</span>
      </RouterLink>

      <!-- Desktop Navigation -->
      <nav class="nav-desktop">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path }"
        >
          <Icon :icon="item.icon" class="nav-icon" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- Right Actions -->
      <div class="header-actions">
        <!-- Playback Mode Badges -->
        <div class="mode-toggles">
          <button
            v-for="mode in ['webrtc', 'mse', 'hls', 'mjpeg']"
            :key="mode"
            @click="store.togglePlaybackMode(mode as any)"
            class="mode-btn"
            :class="{ active: store.enabledModes.includes(mode as any) }"
          >
            {{ mode.toUpperCase() }}
          </button>
        </div>

        <!-- Theme Toggle -->
        <button
          @click="store.toggleTheme"
          class="btn-icon"
          title="Toggle theme"
        >
          <Icon
            :icon="store.theme === 'dark' ? 'mdi:weather-sunny' : 'mdi:weather-night'"
          />
        </button>

        <!-- Mobile Menu Button -->
        <button 
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="btn-icon mobile-menu-btn"
        >
          <Icon :icon="mobileMenuOpen ? 'mdi:close' : 'mdi:menu'" />
        </button>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <transition name="slide-down">
      <div v-if="mobileMenuOpen" class="nav-mobile">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          @click="mobileMenuOpen = false"
          class="nav-item-mobile"
          :class="{ active: route.path === item.path }"
        >
          <Icon :icon="item.icon" class="nav-icon" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </div>
    </transition>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(15, 15, 20, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

/* Logo */
.logo-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  transition: opacity var(--transition-fast);
}

.logo-link:hover {
  opacity: 0.9;
}

.logo-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Desktop Navigation */
.nav-desktop {
  display: none;
  align-items: center;
  gap: 0.25rem;
}

@media (min-width: 768px) {
  .nav-desktop {
    display: flex;
  }
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.nav-item:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.nav-item.active {
  color: var(--accent-primary);
  background: var(--accent-primary-muted);
}

.nav-icon {
  font-size: 1.125rem;
}

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mode-toggles {
  display: none;
  align-items: center;
  gap: 0.125rem;
  padding: 0.25rem;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

@media (min-width: 1024px) {
  .mode-toggles {
    display: flex;
  }
}

.mode-btn {
  padding: 0.375rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-btn:hover {
  color: var(--text-secondary);
}

.mode-btn.active {
  background: var(--accent-primary-muted);
  color: var(--accent-primary);
}

.mobile-menu-btn {
  display: flex;
}

@media (min-width: 768px) {
  .mobile-menu-btn {
    display: none;
  }
}

/* Mobile Navigation */
.nav-mobile {
  padding: 0.75rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-top: 1px solid var(--border);
}

.nav-item-mobile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-lg);
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.nav-item-mobile:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.nav-item-mobile.active {
  color: var(--accent-primary);
  background: var(--accent-primary-muted);
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
