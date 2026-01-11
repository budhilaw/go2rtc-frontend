// Stream types
export interface Stream {
    name: string
    url?: string
    producers?: Producer[]
    consumers?: Consumer[]
}

export interface Producer {
    url: string
    medias?: Media[]
    receivers?: number
    recv?: number
    send?: number
}

export interface Consumer {
    url: string
    medias?: Media[]
    receivers?: number
    recv?: number
    send?: number
    user_agent?: string
    remote_addr?: string
}

export interface Media {
    kind: 'video' | 'audio'
    codec: Codec
    direction?: string
}

export interface Codec {
    name: string
    clock_rate?: number
    channels?: number
    fmtp?: string
}

// Stream info response
export interface StreamInfo {
    producers: Producer[]
    consumers: Consumer[]
}

// API response types
export interface StreamsResponse {
    [key: string]: StreamInfo | null
}

// Playback mode
export type PlaybackMode = 'webrtc' | 'mse' | 'hls' | 'mjpeg'

// WebRTC offer/answer
export interface RTCOffer {
    type: 'offer'
    sdp: string
    ice_servers?: RTCIceServer[]
}

export interface RTCAnswer {
    type: 'answer'
    sdp: string
}

// Config
export interface Go2RTCConfig {
    api?: {
        listen?: string
        origin?: string
    }
    ffmpeg?: Record<string, string>
    log?: {
        level?: string
    }
    rtsp?: {
        listen?: string
        default_query?: string
    }
    streams?: Record<string, string | string[]>
    webrtc?: {
        listen?: string
        ice_servers?: RTCIceServer[]
    }
}

// Log entry
export interface LogEntry {
    level: string
    time: string
    message: string
    caller?: string
}

// Network info
export interface NetworkInfo {
    name: string
    hardware_addr?: string
    addresses?: string[]
    flags?: string[]
}

// Source types for add stream
export interface StreamSource {
    id: string
    name: string
    icon: string
    color: string
    description: string
}

// Theme
export type Theme = 'dark' | 'light'
