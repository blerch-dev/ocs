import { WebSocket } from 'ws';
import Redis from 'ioredis';
import connectRedis = require('connect-redis');
import { OCServer, OCServerType, OCServices } from './server';
import { OCChannel } from './chat';

export class OCRedisStore {
    public getStore;

    constructor(session: any, client: any) {
        let store = connectRedis(session);

        this.getStore = (ttl = (60 * 60 * 24)) => { return new store({ 
            client: client,
            ttl: ttl
        }); }
    }
}

export class OCRedisClient {
    public getClient;
    public getSubscriber;
    public getPublisher;

    private client;

    constructor(host: string, port = 6379, server: OCServer) {
        // let url = `redis://${host}:${port}`;
        this.client = new Redis({
            host: host,
            port: port
        });

        this.client.on('error', (err) => {
            console.log("Redis Client Error:", err);
        });

        this.client.on('connect', (err) => {
            if(err)
                return server.logger.debug("Redis Client Connect Error:", err);

            server.logger.verbose("Connected to Redis Server");
        });

        this.getClient = () => { return this.client; }
        this.getSubscriber = () => { return new Redis({ host: host, port: port }); }
        this.getPublisher = () => { return new Redis({ host: host, port: port }); }
    }
}

export enum OCPlatform {
    Twitch,
    Youtube
}

// app access token attempt, says it needs user but docs so that both can work
// can do user, need to set up a default account to check with
// websocket/webhook for live updates, possible sync checks
export class OCPlatformManager {

    public setPlatformAccess = (access: OCPlatformAccess) => {
        this.accessors.set(access.platform, access);
    }

    private accessors: Map<OCPlatform, OCPlatformAccess> = new Map();

    constructor(...accessors: OCPlatformAccess[]) {
        let map: Map<OCPlatform, OCPlatformAccess> = new Map();
        accessors.forEach((acc) => { map.set(acc.platform, acc); });
        this.accessors = map;
    }
}

// per platform info, management for interactions
export class OCPlatformAccess {
    readonly platform: OCPlatform;

    constructor(platform: OCPlatform) {
        this.platform = platform;
    }
}

// has to be implemented individual per platform, twitch needs a seperate subscription/socket
// might be able to make calls for every channel with same session id
// might still need to do manually created platform eventsubs
export class TwitchAccess extends OCPlatformAccess {
    // Reads all channels from DB, listens to twitch broadcaster ids
    public ListenForLiveChannels = async () => {
        let data = await (await OCServices.Fetch('Data', '/channels')).json();
        let channels = data.data;
        console.log("Channels to Listen For:", channels);
        if(!await this.createWebSocket('wss://eventsub.wss.twitch.tv/ws')) {
            console.log("Failed to create WebSocket Session.");
            return;
        }

        for(let i = 0; i < channels.length; i++) {
            let result = await this.createSubscription(channels[i].twitch_id);
            console.log("Sub Creation Result:", result);
        }
    }

    public ForceIsLiveCheck = (channel: OCChannel) => {}

    constructor(callback: (data: unknown) => void) {
        super(OCPlatform.Twitch);

        // Start Listening on Creation
        OCServices.WaitForService(OCServerType.Data, () => {
            console.log("Listening for Live Channels...");
            this.ListenForLiveChannels();
        });
    }

    private twitchCodes: { [key: string]: unknown } = {};
    private getTwitchCodes = async () => {
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
    
        return value;
    }

    private createSubscription = async (broadcaster_id: string) => {
        this.twitchCodes = !this.twitchCodes?.access_token ? await this.getTwitchCodes() : this.twitchCodes;

        let response = await fetch(`https://api.twitch.tv/helix/eventsub/subscriptions`, {
            method: 'POST',
            headers: {
                'Client-ID': `${process.env.TWITCH_ID}`,
                'Authorization': `${this.twitchCodes.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: "stream.online",
                version: "1",
                condition: {
                    "broadcaster_user_id": `${broadcaster_id}`
                },
                transport: {
                    method: "websocket",
                    id: `${this.session_id}`
                }
            })
        });

        let text = await response.clone().text();
        return await response.json();
    }

    private session_id: string = "";
    private socket: WebSocket | undefined;
    private createWebSocket = async (url: string) => {
        if(this.socket instanceof WebSocket) {
            this.socket?.close();
        }

        return new Promise((res, rej) => {
            this.socket = new WebSocket(url);
            //socket.addEventListener('open', () => { console.log(`${pls} Socket Opened`); });
            this.socket.addEventListener('close', () => { this.socket = undefined; res(false); });
            //socket.addEventListener('error', (err) => { console.log(`${pls} Socket Error:`, err); });
            this.socket.addEventListener('message', (ev) => { 
                //console.log(`${pls} Socket Message:`, JSON.parse(ev.data.toString()), Date.now());
                const { payload } = JSON.parse(ev.data.toString());
                if(payload?.session?.id && this.session_id != payload.session.id) {
                    this.session_id = payload.session.id;
                    res(true);
                }
    
                if(payload?.websocket?.url) {
                    this.createWebSocket(payload.websocket.url);
                }
            });
        });
    }
}