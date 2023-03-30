import Redis from 'ioredis';
import connectRedis = require('connect-redis');
import { OCServer } from './server';

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