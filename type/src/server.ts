import express = require('express');
import session, { Cookie } from 'express-session';
import http from "http";
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createCipheriv, createDecipheriv } from 'crypto';
import winston from 'winston';

import { OCRedisStore, OCRedisClient } from './state';
const config = require('../secrets/server.json');

export interface OCServerProps {
    routes: [OCRoute],

    id?: string | number, // Always exists, undefined will be generated
    node?: string, // Kubernetes/Docker Info
    env?: string, // Always exists, set from process.env.NODE_ENV

    debug?: boolean
    port?: number,
    static?: string[],
    appFunctions?: Function[],
    cors?: {
        creds?: boolean
        domains?: string[]
        origin?: (origin: any, callback: any) => void,
        preflightContinue?: boolean
    },
    session?: {
        domain?: string,
        sameSite?: boolean | "lax" | "strict" | "none",
        ttl?: number,
        secure?: boolean,
        httpOnly?: boolean
        resave?: boolean,
        saveUninitialized?: boolean,
        rolling?: boolean
    }
}

export interface OCOptions {
    [key: string]: any;
}

declare module "express-session" {
    interface SessionData {
        state: { [key: string]: any }
        user: { [key: string]: any }
    }
}

export class OCServer {
    public logger;

    public getServer: () => http.Server;
    public getRedisClient: () => OCRedisClient;
    public getSessionParser: () => express.RequestHandler | undefined;
    // public encrypt = (value: string) => { 
    //     let d = this.cipher.update(value, 'utf-8', 'hex'); d += this.cipher.final('hex'); return d; 
    // }
    // public decrypt = (value: string) => { 
    //     let d = this.decipher.update(value, 'hex', 'utf-8'); d += this.decipher.final('utf-8'); return d; 
    // }

    private app = express();
    // private cipher = createCipheriv('aes-256-cbc', config.redis.secret, 'startmeup');
    // private decipher = createDecipheriv('aes-256-cbc', config.redis.secret, 'startmeup');

    private generateServerID = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();

    constructor(props: OCServerProps) {
        // ENV
        props.env = process.env.NODE_ENV ?? 'dev';

        // Logger
        let formatter = winston.format.printf((info) => {
            let str = `Server ${info?.server ?? 'undefined'} (${info?.level}): ${info?.message}`;
            if(info?.level == 'verbose')
                str += `|${JSON.stringify(info)}`;

            return str;
        });
        
        let format = winston.format.combine(winston.format.timestamp(), winston.format.splat(), winston.format.json(), formatter);

        this.logger = winston.createLogger({
            level: process.env.NODE_ENV !== 'prod' && props.debug === true ? 'debug' : 'info',
            levels: {
                error: 0,
                warn: 0,
                info: 2,
                debug: 3,
                verbose: 4
            },
            format: format,
            defaultMeta: {
                server: props.id ?? this.generateServerID(6),
                node: props.node
            },
            transports: process.env.NODE_ENV !== 'prod' ? [
                new winston.transports.Console({ format: format })
            ] : [
                new winston.transports.File({ filename: 'error.log', level: 'error' })
            ]
        }); 

        // App Middleware
        if(props.static !== undefined)
            props.static.forEach((uri: string) => { this.app.use(express.static(uri)); });

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        this.app.enable('trust proxy');

        const RedisClient = new OCRedisClient('localhost', undefined, this);
        const RedisStore = new OCRedisStore(session, RedisClient.getClient());
        
        // Session
        if(props.session) {
            let ttl = 1000 * 60 * 60 * 12; // 12 Hour Timeout Sessions
            let sessionParser = session({
                store: RedisStore.getStore(props.session?.ttl ?? ttl),
                secret: config.redis.secret,
                resave: props.session?.resave ?? false,
                saveUninitialized: props.session?.saveUninitialized ?? false,
                cookie: {
                    secure: props.session?.secure ?? false,
                    path: '/',
                    domain: props.session?.domain,
                    sameSite: props.session?.sameSite ?? 'lax',
                    httpOnly: props.session?.httpOnly ?? true,
                    maxAge: props.session?.ttl ?? ttl
                },
                rolling: props.session?.rolling ?? true
            });

            this.app.use(sessionParser);
            this.getSessionParser = () => { return sessionParser; }
        } else {
            this.getSessionParser = () => undefined;
        }

        // CORS
        if(props.cors) {
            this.app.use(cors({
                credentials: props.cors.creds ?? true,
                origin: props.cors.origin ?? props.cors.domains ?? '*',
                preflightContinue: props.cors?.preflightContinue
            }));
        }

        // Header Checks
        if(props.debug) {
            this.app.use((req, res, next) => {
                this.logger.verbose(`Req Headers: ${JSON.stringify({
                    host: req.headers.host,
                    origin: req.headers.origin,
                    upgrade: req.headers.upgrade
                }, null, 2)}`);

                return next();
            });
        }

        // Routes
        this.app.use(async (req, res, next) => {
            this.logger.verbose(`Router Flow: ${req.hostname} | ${req.headers.origin}`);

            let options: OCOptions = {};

            let setOption = (key: string, value: any) => { options[key] = value; }

            let setSesh = (obj: string, key: string, value: any) => {
                if(obj === 'state') s_state(key, value);
                else if(obj === 'user') s_user(value);
                else this.logger.debug(`Session Undefined: ${obj}, ${key}, ${value}`);
            }

            let s_state = (key: string, value: any) => {
                if(req.session.state) req.session.state[key] = value;
                else req.session.state = { [key]: value };
            }

            let s_user = (value: any) => { req.session.user = value; }

            props.routes.forEach((route) => {
                let matches = route.matchesDomain(req.hostname);

                this.logger.verbose("Router Domain:", matches, req.hostname);

                if(matches)
                    return route.getHandler(options, setOption, setSesh, RedisClient)(req, res, next);
            });

            this.logger.verbose("End of Route Flow");
        });

        // Host/Clients
        let port = props.port ?? 3000;
        const server = this.app.listen(port);
        this.getServer = () => { return server; }
        this.getRedisClient = () => { return RedisClient }
        this.logger.verbose(`Listening on Port: ${port}`);

        // App Functions (WSS Upgrade) - Require getServer Function
        props.appFunctions?.forEach((func) => { func(this); });
    }
}

export interface OCRouteProps {
    domain: string,
    callback: (
        router: express.Router, 
        opt: OCOptions, 
        sOpt: Function, 
        sSesh: Function, 
        redis: OCRedisClient
    ) => express.Router
}

export class OCRoute {
    public matchesDomain;
    public getHandler;

    constructor(props: OCRouteProps) {
        this.matchesDomain = (domain: string) => { 
            if(props.domain === domain) return true; 
            if(domain.match(props.domain)) return true;
            return false; 
        }
        this.getHandler = (opt: OCOptions, sOpt: Function, sSesh: Function, redis: OCRedisClient) => {
            return props.callback(express.Router(), opt, sOpt, sSesh, redis);
        }
    }
}