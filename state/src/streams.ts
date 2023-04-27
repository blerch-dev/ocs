import Crypto from 'crypto';

// Here for testing, load from db
const Channels = [
    { // Example Object (from db)
        id: '',
        name: '',
        display: '',
        youtube: { id: '' },
        twitch: { id: '' }
    }
];

interface StreamSource {
    twitch?: boolean,
    youtube?: boolean
}

class StreamManager {
    constructor() {
        // needs api creds configured on creation, auto renew
    }

    async isLive(channel_id: string, options?: StreamSource) {
        // if channel id is missing from channels list, return false for all
        // defaults to all platforms, check if channel is live

        return {
            twitch: false,
            youtube: false
        }
    }

    async getViewers(channel_id: string, options?: StreamSource) {

        return {
            twitch: 0,
            youtube: 0,

            total: 0
        }
    }

    getTwitchEventCallback(req: any, res: any, next: any) {

    }

    async verifyTwitchEventMessage() {

    }
}

export const Streams = new StreamManager();