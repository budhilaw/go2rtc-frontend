import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StreamsResponse, PlaybackMode, Theme } from '@/types'
import { streamsApi } from '@/services/api'

export const useAppStore = defineStore('app', () => {
    // Theme
    const theme = ref<Theme>('dark')

    // Playback settings
    const playbackMode = ref<PlaybackMode>('webrtc')
    const enabledModes = ref<PlaybackMode[]>(['webrtc', 'mse', 'hls', 'mjpeg'])

    // Streams
    const streams = ref<StreamsResponse>({})
    const streamsLoading = ref(false)
    const streamsError = ref<string | null>(null)

    // Computed
    const streamNames = computed(() => Object.keys(streams.value).sort())
    const streamCount = computed(() => streamNames.value.length)
    const onlineStreams = computed(() =>
        streamNames.value.filter(name => {
            const stream = streams.value[name]
            return stream && (stream.producers?.length > 0 || stream.consumers?.length > 0)
        })
    )

    // Actions
    function toggleTheme() {
        theme.value = theme.value === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-theme', theme.value)
        localStorage.setItem('theme', theme.value)
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('theme') as Theme | null
        if (savedTheme) {
            theme.value = savedTheme
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            theme.value = 'light'
        }
        document.documentElement.setAttribute('data-theme', theme.value)
    }

    function setPlaybackMode(mode: PlaybackMode) {
        playbackMode.value = mode
        localStorage.setItem('playbackMode', mode)
    }

    function togglePlaybackMode(mode: PlaybackMode) {
        const index = enabledModes.value.indexOf(mode)
        if (index >= 0) {
            enabledModes.value.splice(index, 1)
        } else {
            enabledModes.value.push(mode)
        }
        localStorage.setItem('enabledModes', JSON.stringify(enabledModes.value))
    }

    function initPlaybackSettings() {
        const savedMode = localStorage.getItem('playbackMode') as PlaybackMode | null
        if (savedMode) {
            playbackMode.value = savedMode
        }

        const savedModes = localStorage.getItem('enabledModes')
        if (savedModes) {
            try {
                enabledModes.value = JSON.parse(savedModes)
            } catch (e) {
                // Keep defaults
            }
        }
    }

    async function fetchStreams() {
        streamsLoading.value = true
        streamsError.value = null

        try {
            streams.value = await streamsApi.getAll()
        } catch (error) {
            streamsError.value = error instanceof Error ? error.message : 'Failed to fetch streams'
        } finally {
            streamsLoading.value = false
        }
    }

    async function deleteStream(name: string) {
        try {
            await streamsApi.delete(name)
            await fetchStreams()
        } catch (error) {
            throw error
        }
    }

    return {
        // State
        theme,
        playbackMode,
        enabledModes,
        streams,
        streamsLoading,
        streamsError,
        // Computed
        streamNames,
        streamCount,
        onlineStreams,
        // Actions
        toggleTheme,
        initTheme,
        setPlaybackMode,
        togglePlaybackMode,
        initPlaybackSettings,
        fetchStreams,
        deleteStream,
    }
})
