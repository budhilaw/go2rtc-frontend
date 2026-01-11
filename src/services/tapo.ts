import axios from 'axios'

// Tapo API types
export interface TapoDeviceInfo {
    device_alias?: string
    device_model?: string
    device_name?: string
    device_type?: string
    fw_ver?: string
    hw_ver?: string
    mac?: string
    oem_id?: string
    hw_desc?: string
}

export interface TapoPreset {
    id: string
    name: string
    position_pan?: number
    position_tilt?: number
    read_only?: boolean
}

export interface TapoAlarmConfig {
    enabled?: boolean
    alarm_mode?: string[]
    light_type?: string
}

export interface TapoImageSettings {
    flip_type?: string
    rotate_type?: string
    switch_mode?: string
}

export interface TapoAudioConfig {
    speaker?: {
        volume: number
    }
    microphone?: {
        volume: number
        mute: boolean
    }
}

export interface TapoStorageInfo {
    total?: number
    used?: number
    free?: number
    status?: string
}

export interface TapoMotorCapability {
    pan?: { max: number; min: number }
    tilt?: { max: number; min: number }
}

export interface TapoCredentials {
    username: string
    password: string
}

// Create a Tapo API service
export function createTapoApi(baseUrl: string, credentials: TapoCredentials) {
    const api = axios.create({
        baseURL: baseUrl,
        timeout: 10000,
        headers: {
            'X-Tapo-Username': credentials.username,
            'X-Tapo-Password': credentials.password,
        },
    })

    return {
        // Device Info
        async getInfo(ip: string): Promise<TapoDeviceInfo> {
            const { data } = await api.get(`/api/cameras/${ip}/info`)
            return data
        },

        async getTime(ip: string): Promise<any> {
            const { data } = await api.get(`/api/cameras/${ip}/time`)
            return data
        },

        async getSpecs(ip: string): Promise<any> {
            const { data } = await api.get(`/api/cameras/${ip}/specs`)
            return data
        },

        // PTZ
        async ptzMove(ip: string, x: number, y: number): Promise<void> {
            await api.post(`/api/cameras/${ip}/ptz/move`, { x, y })
        },

        async ptzStep(ip: string, direction: number): Promise<void> {
            await api.post(`/api/cameras/${ip}/ptz/step`, { direction })
        },

        async ptzCalibrate(ip: string): Promise<void> {
            await api.post(`/api/cameras/${ip}/ptz/calibrate`)
        },

        async getPtzCapability(ip: string): Promise<TapoMotorCapability> {
            const { data } = await api.get(`/api/cameras/${ip}/ptz/capability`)
            return data
        },

        async startCruise(ip: string): Promise<void> {
            await api.post(`/api/cameras/${ip}/ptz/cruise/start`)
        },

        async stopCruise(ip: string): Promise<void> {
            await api.post(`/api/cameras/${ip}/ptz/cruise/stop`)
        },

        // Presets
        async getPresets(ip: string): Promise<TapoPreset[]> {
            const { data } = await api.get(`/api/cameras/${ip}/presets`)
            return data
        },

        async createPreset(ip: string, name: string): Promise<void> {
            await api.post(`/api/cameras/${ip}/presets`, { name })
        },

        async gotoPreset(ip: string, presetId: string): Promise<void> {
            await api.post(`/api/cameras/${ip}/presets/${presetId}/goto`)
        },

        async deletePreset(ip: string, presetId: string): Promise<void> {
            await api.delete(`/api/cameras/${ip}/presets/${presetId}`)
        },

        // Privacy
        async getPrivacy(ip: string): Promise<{ enabled: boolean }> {
            const { data } = await api.get(`/api/cameras/${ip}/privacy`)
            return data
        },

        async setPrivacy(ip: string, enabled: boolean): Promise<void> {
            await api.put(`/api/cameras/${ip}/privacy`, { enabled })
        },

        // LED
        async getLed(ip: string): Promise<{ enabled: boolean }> {
            const { data } = await api.get(`/api/cameras/${ip}/led`)
            return data
        },

        async setLed(ip: string, enabled: boolean): Promise<void> {
            await api.put(`/api/cameras/${ip}/led`, { enabled })
        },

        // Detection
        async getMotionDetection(ip: string): Promise<{ enabled: boolean; sensitivity?: string }> {
            const { data } = await api.get(`/api/cameras/${ip}/detection/motion`)
            return data
        },

        async setMotionDetection(ip: string, enabled: boolean, sensitivity?: string): Promise<void> {
            await api.put(`/api/cameras/${ip}/detection/motion`, { enabled, sensitivity })
        },

        async getPersonDetection(ip: string): Promise<{ enabled: boolean; sensitivity?: string }> {
            const { data } = await api.get(`/api/cameras/${ip}/detection/person`)
            return data
        },

        async setPersonDetection(ip: string, enabled: boolean, sensitivity?: string): Promise<void> {
            await api.put(`/api/cameras/${ip}/detection/person`, { enabled, sensitivity })
        },

        // Alarm
        async getAlarm(ip: string): Promise<TapoAlarmConfig> {
            const { data } = await api.get(`/api/cameras/${ip}/alarm`)
            return data
        },

        async setAlarm(ip: string, config: TapoAlarmConfig): Promise<void> {
            await api.put(`/api/cameras/${ip}/alarm`, config)
        },

        async triggerAlarm(ip: string): Promise<void> {
            await api.post(`/api/cameras/${ip}/alarm/trigger`)
        },

        async stopAlarm(ip: string): Promise<void> {
            await api.delete(`/api/cameras/${ip}/alarm/trigger`)
        },

        // Image
        async getImageSettings(ip: string): Promise<TapoImageSettings> {
            const { data } = await api.get(`/api/cameras/${ip}/image`)
            return data
        },

        async setFlip(ip: string, flipType: string): Promise<void> {
            await api.put(`/api/cameras/${ip}/image/flip`, { flip_type: flipType })
        },

        async setNightMode(ip: string, mode: string): Promise<void> {
            await api.put(`/api/cameras/${ip}/image/nightmode`, { inf_type: mode })
        },

        // Audio
        async getAudio(ip: string): Promise<TapoAudioConfig> {
            const { data } = await api.get(`/api/cameras/${ip}/audio`)
            return data
        },

        async setSpeakerVolume(ip: string, volume: number): Promise<void> {
            await api.put(`/api/cameras/${ip}/audio/speaker`, { volume })
        },

        async setMicrophone(ip: string, volume: number, mute: boolean): Promise<void> {
            await api.put(`/api/cameras/${ip}/audio/microphone`, { volume, mute })
        },

        // Recording & Storage
        async getRecordPlan(ip: string): Promise<any> {
            const { data } = await api.get(`/api/cameras/${ip}/recording/plan`)
            return data
        },

        async getStorage(ip: string): Promise<TapoStorageInfo> {
            const { data } = await api.get(`/api/cameras/${ip}/storage`)
            return data
        },

        async formatStorage(ip: string): Promise<void> {
            await api.post(`/api/cameras/${ip}/storage/format`)
        },

        // System
        async reboot(ip: string): Promise<void> {
            await api.post(`/api/cameras/${ip}/reboot`)
        },

        async getFirmware(ip: string): Promise<any> {
            const { data } = await api.get(`/api/cameras/${ip}/firmware`)
            return data
        },

        async upgradeFirmware(ip: string): Promise<void> {
            await api.post(`/api/cameras/${ip}/firmware/upgrade`)
        },
    }
}

export type TapoApi = ReturnType<typeof createTapoApi>
