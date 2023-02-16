import Redis from 'ioredis';
import connectRedis = require('connect-redis');

export class OCRedisStore {
    public getStore;

    constructor(session: any, client: any) {
        let store = connectRedis(session);

        this.getStore = (ttl = (60 * 60 * 24)) => { return new store({ 
            client: client,
            ttl: ttl
        }) }
    }
}

export class OCRedisClient {
    public getClient;

    private client;

    constructor(host: string, port = 6379, debug = false) {
        let url = `redis://${host}:${port}`;
        this.client = new Redis({
            host: host,
            port: port
        });

        this.client.on('error', (err) => {
            console.log("Redis Client Error:", err);
        });

        this.client.on('connect', (err) => {
            if(err)
                return console.log("Redis Client Connect Error:", err);

            if(debug === true)
                console.log("Connected to Redis Server");
        });

        this.getClient = () => { return this.client; }
    }
}