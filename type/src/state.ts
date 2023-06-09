import { WebSocket } from 'ws';
import Redis from 'ioredis';
import connectRedis = require('connect-redis');
import { OCServer } from './server';
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

// per platform info, management for interactions
export class OCPlatformAccess {
    static socketURLS = [
        'wss://eventsub.wss.twitch.tv/ws'
    ];

    public platform: OCPlatform;
    public codes: { [key: string]: unknown };
    public getCodes: () => Promise<{ [key: string]: unknown }>;
    public createSubscription: (session_id: string, stream_id: string) => Promise<unknown>;
    public targetURL: string;
    //public connectSocket: () => {};

    constructor(
        platform: OCPlatform, 
        codeFetch: () => Promise<{ [key: string]: unknown }>,
        createSubscription: (access_token: string, session_id: string, stream_id: string) => Promise<unknown>
    ) {
        this.platform = platform;

        // generate codes
        this.codes = {};
        this.getCodes = async () => { 
            if(this.codes?.access_token) {
                return this.codes;
            }        

            this.codes = await codeFetch(); 
            return this.codes; 
        };
        this.createSubscription = async (session_id: string, stream_id: string) => {
            await createSubscription(this?.codes?.access_token as string, session_id, stream_id);
        }
        this.targetURL = OCPlatformAccess.socketURLS[platform];
        //this.connectSocket = connectSocket;
    }
}

// app access token attempt, says it needs user but docs so that both can work
// can do user, need to set up a default account to check with
// websocket/webhook for live updates, possible sync checks
export class OCPlatformManager {

    public setPlatformAccess = (access: OCPlatformAccess) => {
        this.accessors.set(access.platform, access);
    }

    public createLiveEventSubcription = async (platform: OCPlatform, createSub: Function) => {
        let access = this.accessors.get(platform);
        let codes = access?.getCodes();
        if(!access || !access?.codes?.access_token) { return; }
        let accessor = access as OCPlatformAccess;


    }

    public connectWebSocketEventSub = async (...platforms: OCPlatform[]) => {
        for(let i = 0; i < platforms.length; i++) {
            // check if codes are already here and not expired
            let access = this.accessors.get(platforms[i]);
            if(!access) { continue; }
            let accessor = access as OCPlatformAccess;

            let pls = `${OCPlatform[platforms[i]]}`;
            let codes = await accessor.getCodes();
            //console.log(`${pls} Codes:`, codes);

            // might move this to access
            let socket = new WebSocket(accessor.targetURL);
            //socket.addEventListener('open', () => { console.log(`${pls} Socket Opened`); });
            socket.addEventListener('close', () => { 
                //console.log(`${pls} Socket Closed`, Date.now());
                this.sockets.delete(platforms[i]);
            });
            //socket.addEventListener('error', (err) => { console.log(`${pls} Socket Error:`, err); });
            socket.addEventListener('message', (ev) => { 
                //console.log(`${pls} Socket Message:`, JSON.parse(ev.data.toString()), Date.now());
                const { payload } = JSON.parse(ev.data.toString());
                let session_id = undefined;
                if(payload?.session?.id && session_id != payload.session.id) {
                    session_id = payload.session.id;
                }

                if(payload?.websocket?.url) {
                    accessor.targetURL = payload.websocket.url;
                    this.connectWebSocketEventSub(platforms[i]);
                    let socket = this.sockets.get(platforms[i]);
                    setTimeout(() => { socket?.close(); }, 15000);
                }
            });

            this.sockets.set(platforms[i], socket);
        }
    }

    // webhook setup

    private accessors: Map<OCPlatform, OCPlatformAccess> = new Map();
    private sockets: Map<OCPlatform, WebSocket> = new Map();

    private accessCodes: { [key: string]: unknown };
    private saveAccessCodes = (access: OCPlatformAccess) => {
        this.accessCodes[OCPlatform[access.platform]] = access.codes;
        // save to local file
    }
    private loadAccessCodes = () => {
        return {};
    }

    constructor(...accessors: OCPlatformAccess[]) {
        let map: Map<OCPlatform, OCPlatformAccess> = new Map();
        accessors.forEach((acc) => { map.set(acc.platform, acc); });
        this.accessors = map;

        this.accessCodes = this.loadAccessCodes();
    }
}

// has to be implemented individual per platform, twitch needs a seperate subscription/socket
// might be able to make calls for every channel with same session id
// might still need to do manually created platform eventsubs
/*
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

    return value;
}, (access_token: string, session_id: string, stream_id: string) => {
    let response = await fetch(`https://api.twitch.tv/helix/eventsub/subscriptions`, {
        method: 'POST',
        headers: {
            'Client-ID': `${process.env.TWITCH_ID}`,
            'Authorization': `${access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: "stream.online",
            version: "1",
            condition: {

            }
        })
    });
});
*/