import Crypto from 'crypto';
import { OCPlatformManager, OCPlatformAccess, OCPlatform, TwitchAccess } from 'ocs-type';

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

class OCStreamManager {
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

const Twitch = new TwitchAccess((data: unknown) => { console.log("CB Data:", data); });
const PlatformManager = new OCPlatformManager(Twitch);
const StreamManager = new OCStreamManager();

export {
    PlatformManager,
    StreamManager
}