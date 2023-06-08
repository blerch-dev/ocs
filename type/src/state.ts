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
    public codes: { [key: string]: string };
    public getCodes: () => Promise<{ [key: string]: unknown }>;
    //public connectSocket: () => {};

    constructor(platform: OCPlatform, codeFetch: () => Promise<{ [key: string]: unknown }>) {
        this.platform = platform;

        // generate codes
        this.codes = {};
        this.getCodes = codeFetch;
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

    public connectWebSocketEventSub = async (...platforms: OCPlatform[]) => {
        for(let i = 0; i < platforms.length; i++) {
            // check if codes are already here and not expired
            let access = this.accessors.get(platforms[i]);
            if(!access) { continue; }

            let pls = `${OCPlatform[platforms[i]]}`;
            let codes = await access.getCodes();
            console.log(`${pls} Codes:`, codes);

            // might move this to access
            let socket = new WebSocket(OCPlatformAccess.socketURLS[platforms[i]]);
            //socket.addEventListener('open', () => { console.log(`${pls} Socket Opened`); });
            socket.addEventListener('close', () => { 
                //console.log(`${pls} Socket Closed`, Date.now());
                this.sockets.delete(platforms[i]);
            });
            //socket.addEventListener('error', (err) => { console.log(`${pls} Socket Error:`, err); });
            socket.addEventListener('message', (ev) => { 
                //console.log(`${pls} Socket Message:`, JSON.parse(ev.data.toString()), Date.now());
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