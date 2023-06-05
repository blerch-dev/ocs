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

// per platform info, management for interactions
export class OCPlatformInterface {

    private channel: OCChannel;

    constructor(channel: OCChannel) {
        this.channel = channel;
    }
}

// app access token attempt, says it needs user but docs so that both can work
// can do user, need to set up a default account to check with
// websocket/webhook for live updates, possible sync checks
export class OCPlatformManager {

    private interfaces: OCPlatformInterface[];

    constructor(interfaces: OCPlatformInterface[] = []) {
        this.interfaces = interfaces;
    }
}