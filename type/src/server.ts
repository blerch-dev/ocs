import express = require('express');
import session from 'express-session';
import http from "http";
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import winston from 'winston';
import monitor from 'express-status-monitor';

import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { OCRedisStore, OCRedisClient } from './state';

export interface OCServerProps {
    routes: OCRoute[],

    id?: string | number, // Always exists, undefined will be generated
    node?: string, // Kubernetes/Docker Info
    env?: string, // Always exists, set from process.env.NODE_ENV

    debug?: boolean,
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
    },
    monitor?: { [key: string]: any }
}

declare module "express-session" {
    interface SessionData {
        // state: { [key: string]: any }
        // user: { [key: string]: any }
        [key: string]: { [key: string]: any }
    }
}

export class OCServer {
    public logger;

    public getServer: () => http.Server;
    public getRedisClient: () => OCRedisClient;
    public getSessionParser: () => express.RequestHandler | undefined;

    private app = express();
    private routes: OCRoute[];

    private generateServerID = (size: number) => [
        ...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();

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
        
        let format = winston.format.combine(
            winston.format.timestamp(), 
            winston.format.splat(), 
            winston.format.json(), 
            formatter
        );

        this.logger = winston.createLogger({
            level: process.env.NODE_ENV !== 'prod' && props.debug === true ? 'debug' : 'info',
            levels: { error: 0, warn: 1, info: 2, debug: 3, verbose: 4 },
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
        // Decent Status Page - Custom would be better, integrated into dev page
        if(props.monitor) { this.app.use(monitor(props.monitor)); }

        if(props.static !== undefined)
            props.static.forEach((uri: string) => { this.app.use(express.static(uri)); });

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        this.app.enable('trust proxy');

        const RedisClient = new OCRedisClient(OCServices.Redis, undefined, this);
        
        // Session
        if(props.session) {
            const RedisStore = new OCRedisStore(session, RedisClient.getClient());

            let ttl = 1000 * 60 * 60 * 18; // 18 Hour Timeout Sessions
            let sessionParser = session({
                store: RedisStore.getStore(props.session?.ttl ?? ttl),
                secret: process.env.REDIS_HASH ?? 'redis-hash',
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
                rolling: props.session?.rolling ?? false
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
        this.routes = props.routes;

        let sesh = new OCSession((req, obj, key, value) => {
            if(req.session?.[obj]) {
                req.session[obj] = { ...req.session[obj], [key]: value };
            } else if(req.session) {
                req.session[obj] = { [key]: value };
            } else {
                this.logger.debug(`No Session Field on Request: ${obj}`, req.session, obj, key, value);
            }
        }, (req, user) => {
            req.session.user = user;
        });

        this.app.use(async (req, res, next) => {
            this.logger.verbose(`Router Flow: ${req.hostname} | ${req.headers.origin}`);

            // Goes through each route, if domain matches add to list of available routes, order kept
            for(let i = 0; i < this.routes.length; i++) {
                let route = this.routes[i];
                let matches = route.matchesDomain(req.hostname);

                //this.logger.verbose("Router Domain:", matches, req.hostname);
                
                if(matches) {
                    this.app.use(route.getHandler(this, sesh))
                    //route.getHandler(this, sesh)(req, res, next);
                }
            }
            
            // Ordering routes finished, run matched routes
            return next();
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

    AddRoutes(...routes: OCRoute[]) {
        return this.routes.unshift(...routes);
    }
}

export interface OCRouteProps {
    domain: string,
    callback: (
        router: express.Router, 
        server: OCServer,
        session: OCSession
    ) => express.Router
}

export class OCRoute {
    public matchesDomain;
    public getHandler;
    public getDomain;

    constructor(props: OCRouteProps) {
        this.matchesDomain = (domain: string) => { 
            if(props.domain === '*' || props.domain === domain) return true; 
            if(domain.match(props.domain)) return true;
            return false; 
        }
        this.getHandler = (server: OCServer, session: OCSession) => {
            return props.callback(express.Router(), server, session);
        }
        this.getDomain = () => { return props.domain };
    }
}

export class OCSession {
    public setSesh;
    public setUser;
    public setOption;
    public getOptions;

    private option: {[key: string]: any} = {};

    constructor(cb: (req: any, obj: string, key: string, value: any) => void, su: (req: any, user: any) => void) {
        this.setSesh = cb;
        this.setUser = su;

        this.setOption = (name: string, data: any) => { this.option[name] = data; }
        this.getOptions = () => { return this.option; }
    }
}

// Express Session requires root url, need to rework that for local/minikube/prod
// cant rely on ips for session
export class OCServices {
    static Production: boolean = process.env.NODE_ENV === 'prod';
    static IMP: string = OCServices.Production ? 'https' : 'http';

    static RootURL: string = OCServices.Production ? 'ocs.gg' : 
        process.env.KUBERNETES_SERVICE_HOST != undefined ? 'ocs.cluster' : 'ocs.local';

    static WhitelistedSites: string[] = OCServices.Production ? [
        'client.ocs.gg',
        'kidnotkin.tv'
    ] : [
        'client.ocs.local',
        'client.ocs.cluster'
    ]

    static Auth: string = `auth.${OCServices.RootURL}`;
    static Chat: string = `chat.${OCServices.RootURL}`;
    static Client: string = `client.${OCServices.RootURL}`;

    static Data: string = `${
        process.env.OCS_DATA_SERVICE_HOST ?? `data.${OCServices.RootURL}`
    }`;
    // ${process.env.OCS_DATA_SERVICE_PORT ? ':' + process.env.OCS_DATA_SERVICE_PORT : ''}

    static State: string = `${
        process.env.OCS_STATE_SERVICE_HOST ?? `state.${OCServices.RootURL}`
    }`;
    //${process.env.OCS_STATE_SERVICE_PORT ? ':' + process.env.OCS_STATE_SERVICE_PORT : ''}

    static Redis: string = `${
        process.env.REDIS_SERVICE_HOST ? process.env.REDIS_SERVICE_HOST : 'localhost'
    }`;

    static Fetch = async (srvc: string, resource: string, headers?: {[key: string]: any}) => {
        let func = (url: string) => `${OCServices.IMP}://${url}`
        switch(srvc) {
            case 'Data':
                return await fetch(func(OCServices.Data + resource), headers);
            case 'State':
                return await fetch(func(OCServices.State + resource), headers);
            default:
                return await fetch(func(OCServices.Data + resource), headers);
        }
    }
}