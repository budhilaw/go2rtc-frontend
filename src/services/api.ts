import axios from 'axios'
import type { StreamsResponse, NetworkInfo } from '@/types'

const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
})

// Streams API
export const streamsApi = {
    // Get all streams
    async getAll(): Promise<StreamsResponse> {
        const { data } = await api.get('/streams')
        return data
    },

    // Get single stream info
    async getInfo(src: string): Promise<StreamsResponse> {
        const { data } = await api.get('/streams', { params: { src } })
        return data
    },

    // Add/create stream
    async add(name: string, source: string): Promise<void> {
        await api.put('/streams', null, {
            params: {
                name,
                src: source
            }
        })
    },

    // Delete stream
    async delete(name: string): Promise<void> {
        await api.delete('/streams', { params: { src: name } })
    },

    // Get snapshot frame
    getSnapshotUrl(src: string): string {
        return `/api/frame.jpeg?src=${encodeURIComponent(src)}`
    },

    // Get stream URL for different formats
    getRtspUrl(src: string): string {
        return `rtsp://${window.location.hostname}:8554/${encodeURIComponent(src)}`
    },

    getMp4Url(src: string): string {
        return `/api/stream.mp4?src=${encodeURIComponent(src)}`
    },

    getHlsUrl(src: string): string {
        return `/api/hls/live/index/${encodeURIComponent(src)}/stream.m3u8`
    },

    getMjpegUrl(src: string): string {
        return `/api/stream.mjpeg?src=${encodeURIComponent(src)}`
    },
}

// WebRTC API
export const webrtcApi = {
    async getOffer(src: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        const { data } = await api.post('/webrtc', offer, {
            params: { src },
            headers: { 'Content-Type': 'application/json' }
        })
        return data
    },
}

// Config API
export const configApi = {
    async get(): Promise<string> {
        const { data } = await api.get('/config', {
            responseType: 'text'
        })
        return data
    },

    async save(config: string): Promise<void> {
        await api.post('/config', config, {
            headers: { 'Content-Type': 'text/plain' }
        })
    },

    async restart(): Promise<void> {
        await api.post('/restart')
    },
}

// Network API
export const networkApi = {
    async getInfo(): Promise<NetworkInfo[]> {
        const { data } = await api.get('/net')
        return data
    },
}

// Log WebSocket URL
export const getLogWebSocketUrl = (): string => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/api/ws`
}

// WebRTC WebSocket URL
export const getWebRTCWebSocketUrl = (src: string): string => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/api/ws?src=${encodeURIComponent(src)}`
}

export default api
