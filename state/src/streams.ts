


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


class StreamManager {
    constructor() {

    }

    async isLive(channel_id: string, options?: {
        twitch?: boolean,
        youtube?: boolean
    }) {
        // if channel id is missing from channels list, return false for all
        // defaults to all platforms, check if channel is live

        return {
            twitch: false,
            youtube: false
        }
    }
}

export const Streams = new StreamManager();