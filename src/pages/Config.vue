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
    <div class="page-header">
      <div>
        <h1 class="page-title">Configuration</h1>
        <p class="page-subtitle">Edit go2rtc.yaml configuration</p>
      </div>

      <div class="header-actions">
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
          <Icon v-else icon="mdi:content-save-outline" />
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
    <div v-if="error" class="alert alert-error">
      <Icon icon="mdi:alert-circle-outline" />
      <span>{{ error }}</span>
    </div>

    <div v-if="success" class="alert alert-success">
      <Icon icon="mdi:check-circle-outline" />
      <span>{{ success }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading configuration...</p>
    </div>

    <!-- Editor -->
    <div v-else class="editor-container">
      <div class="editor-header">
        <div class="editor-file">
          <Icon icon="mdi:file-code-outline" />
          <span>go2rtc.yaml</span>
        </div>
        <div class="editor-status">
          <span v-if="hasChanges" class="unsaved-badge">
            <span class="unsaved-dot"></span>
            Unsaved changes
          </span>
          <span class="file-type">YAML</span>
        </div>
      </div>

      <div class="editor-body">
        <textarea
          :value="config"
          @input="handleInput"
          class="editor-textarea"
          spellcheck="false"
        />
      </div>
    </div>

    <!-- Help Section -->
    <div class="help-grid">
      <div class="help-card">
        <h3 class="help-title">
          <Icon icon="mdi:lightbulb-outline" class="text-warning" />
          Tips
        </h3>
        <ul class="help-list">
          <li>Changes require a restart to take effect</li>
          <li>Use YAML syntax for configuration</li>
          <li>Backup your config before major changes</li>
        </ul>
      </div>

      <div class="help-card">
        <h3 class="help-title">
          <Icon icon="mdi:book-open-outline" class="text-info" />
          Documentation
        </h3>
        <a 
          href="https://github.com/AlexxIT/go2rtc/wiki" 
          target="_blank"
          class="help-link"
        >
          View go2rtc Wiki
          <Icon icon="mdi:open-in-new" />
        </a>
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
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Alerts */
.alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-lg);
  margin-bottom: 1.5rem;
  font-size: 0.9375rem;
}

.alert-error {
  background: var(--danger-muted);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.alert-success {
  background: var(--success-muted);
  color: var(--success);
  border: 1px solid rgba(34, 197, 94, 0.2);
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

/* Editor */
.editor-container {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
}

.editor-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.editor-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.unsaved-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--warning);
}

.unsaved-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning);
  animation: pulse 2s ease-in-out infinite;
}

.file-type {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.editor-body {
  position: relative;
}

.editor-textarea {
  width: 100%;
  min-height: 500px;
  padding: 1.25rem;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  background: var(--bg-surface);
  border: none;
  color: var(--text-primary);
  resize: vertical;
}

.editor-textarea:focus {
  outline: none;
}

/* Help Section */
.help-grid {
  display: grid;
  gap: 1rem;
}

@media (min-width: 768px) {
  .help-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.help-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
}

.help-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.875rem;
}

.text-warning {
  color: var(--warning);
}

.text-info {
  color: var(--info);
}

.help-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.help-list li {
  font-size: 0.875rem;
  color: var(--text-secondary);
  padding-left: 1rem;
  position: relative;
}

.help-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--text-dim);
}

.help-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--accent-primary);
  text-decoration: none;
  transition: opacity var(--transition-fast);
}

.help-link:hover {
  opacity: 0.8;
}
</style>
