import Crypto from 'crypto';
import { OCPlatformManager, OCPlatformAccess, OCPlatform } from 'ocs-type';

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

// WebSocket EventSub - Might Have Both Options Available
const TwitchAccess = new OCPlatformAccess(OCPlatform.Twitch, async () => {
    let url = `https://id.twitch.tv/oauth2/token`;
    let details = {
        'client_id': process.env.TWITCH_ID,
        'client_secret': process.env.TWITCH_SECRET,
        'grant_type': 'client_credentials'
    } as any;

    let response = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(details).toString()
    });

    let value = await response.json();
    console.log("Value:", value);

    return {};
});

const PlatformManager = new OCPlatformManager(TwitchAccess);
const StreamManager = new OCStreamManager();

export {
    PlatformManager,
    StreamManager
}