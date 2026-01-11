import { ref, computed } from 'vue'
import { createTapoApi, type TapoApi } from '@/services/tapo'

export function useTapo() {
    // Vite uses import.meta.env for environment variables
    const envUrl = (import.meta as any).env?.VITE_TAPO_API_URL || ''
    const envCameraIp = (import.meta as any).env?.VITE_TAPO_CAMERA_IP || ''
    const envUsername = (import.meta as any).env?.VITE_TAPO_USERNAME || ''
    const envPassword = (import.meta as any).env?.VITE_TAPO_PASSWORD || ''

    const storedUrl = localStorage.getItem('tapoApiUrl')
    const storedCameraIp = localStorage.getItem('tapoCameraIp')
    const defaultUrl = 'http://localhost:3000'

    // Use stored URL only if it exists and is NOT the generic default (unless env is missing)
    const initialUrl = (storedUrl && storedUrl !== defaultUrl) ? storedUrl : (envUrl || defaultUrl)
    const initialCameraIp = storedCameraIp || envCameraIp || ''

    const tapoApiUrl = ref(initialUrl)
    const tapoCameraIp = ref(initialCameraIp)
    const tapoUsername = ref(localStorage.getItem('tapoUsername') || envUsername || '')
    const tapoPassword = ref(localStorage.getItem('tapoPassword') || envPassword || '')

    const isConfigured = computed(() => !!(tapoUsername.value && tapoPassword.value))

    const api = computed<TapoApi | null>(() => {
        if (!isConfigured.value) return null
        return createTapoApi(tapoApiUrl.value, {
            username: tapoUsername.value,
            password: tapoPassword.value,
        })
    })

    function saveConfig(url: string, user: string, pass: string, cameraIp?: string) {
        tapoApiUrl.value = url
        tapoUsername.value = user
        tapoPassword.value = pass
        if (cameraIp) {
            tapoCameraIp.value = cameraIp
            localStorage.setItem('tapoCameraIp', cameraIp)
        }

        localStorage.setItem('tapoApiUrl', url)
        localStorage.setItem('tapoUsername', user)
        localStorage.setItem('tapoPassword', pass)
    }

    function resetConfig() {
        tapoApiUrl.value = envUrl || 'http://localhost:3000'
        tapoCameraIp.value = envCameraIp || ''
        tapoUsername.value = envUsername || ''
        tapoPassword.value = envPassword || ''

        localStorage.removeItem('tapoApiUrl')
        localStorage.removeItem('tapoCameraIp')
        localStorage.removeItem('tapoUsername')
        localStorage.removeItem('tapoPassword')
    }

    return {
        tapoApiUrl,
        tapoCameraIp,
        tapoUsername,
        tapoPassword,
        isConfigured,
        api,
        saveConfig,
        resetConfig
    }
}
