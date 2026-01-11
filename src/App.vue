<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAppStore } from '@/stores/app'
import AppHeader from '@/components/layout/AppHeader.vue'

const store = useAppStore()

onMounted(() => {
  store.initTheme()
  store.initPlaybackSettings()
})
</script>

<template>
  <div class="app-layout">
    <!-- Background gradient -->
    <div class="app-bg"></div>
    
    <AppHeader />
    
    <main class="app-main">
      <div class="app-container">
        <RouterView v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </div>
    </main>
    
    <footer class="app-footer">
      <span class="footer-brand">go2rtc</span>
      <span class="footer-divider"></span>
      <span class="footer-text">Modern Interface</span>
    </footer>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.app-bg {
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.08), transparent),
    radial-gradient(ellipse 60% 40% at 80% 60%, rgba(6, 182, 212, 0.05), transparent);
  pointer-events: none;
  z-index: 0;
}

.app-main {
  flex: 1;
  padding: 2rem 1.5rem;
  position: relative;
  z-index: 1;
}

.app-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .app-main {
    padding: 1.25rem 1rem;
  }
}

.app-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  position: relative;
  z-index: 1;
}

.footer-brand {
  font-size: 0.875rem;
  font-weight: 600;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.footer-divider {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--border-active);
}

.footer-text {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* Page transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
