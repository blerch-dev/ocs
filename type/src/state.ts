import redis = require('redis');
import connectRedis = require('connect-redis');

export class OCRedisStore {
    public getStore;

    private handler;
    private store;

    constructor(session: any, client: any) {
        this.handler = connectRedis(session);
        this.store = new this.handler({ client });

        this.getStore = () => { return this.store; }
    }
}

export class OCRedisClient {
    public getClient;

    private client;

    constructor(host: string, port = 6379) {
        let url = `redis://${host}:${port}`;
        this.client = redis.createClient({ url });

        this.client.on('error', (err) => {
            console.log("Redis Client Error:", err);
        });

        this.client.on('connect', (err) => {
            if(err)
                return console.log("Redis Client Connect Error:", err);

            console.log("Connected to Redis Server.");
        });

        this.getClient = () => { return this.client; }
    }
}