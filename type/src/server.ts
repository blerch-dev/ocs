import express = require('express');
import session, { Cookie } from 'express-session';
import http from "http";
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { OCRedisStore, OCRedisClient } from './state';

export interface OCServerProps {
    routes: [OCRoute],

    debug?: boolean
    port?: number,
    static?: string[],
    appFunctions?: Function[],
    cors?: {
        creds?: boolean
        domains?: string[]
        origin?: (origin: any, callback: any) => void
    },
    noSession?: boolean, // will be replaced with a session config object
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
    public getServer: () => http.Server;

    private app = express();

    constructor(props: OCServerProps) {
        if(props.static !== undefined)
            props.static.forEach((uri: string) => { this.app.use(express.static(uri)); });

        // App Middleware
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        // this.app.set('trust proxy', 1);
        this.app.enable('trust proxy');

        const RedisClient = new OCRedisClient('localhost', undefined, props.debug);
        const RedisStore = new OCRedisStore(session, RedisClient.getClient());
        
        // This will be set to a custom solution attached to above cors and the central auth domain
        // Here for simple implmentation
        if(props.noSession !== true) {
            this.app.use(session({
                store: RedisStore.getStore(),
                secret: 'test',
                resave: false,
                saveUninitialized: false,
                cookie: {
                    secure: false,
                    path: '/',
                    // domain: 'auth.com', // Above comment
                    // sameSite: 'none',
                    httpOnly: true,
                    maxAge: 1000 * 60 * 10
                }
            }));
        }

        if(props.cors) {
            this.app.use(cors({
                credentials: props.cors.creds ?? true,
                origin: props.cors.origin ?? props.cors.domains ?? '*'
            }));
        }

        // Find matching domain/regex to route, fallback to default route
        this.app.use(async (req, res, next) => {
            let options: OCOptions = {};

            let setOption = (key: string, value: any) => { options[key] = value; }

            let setSesh = (obj: string, key: string, value: any) => {
                if(obj === 'state') s_state(key, value);
                else if(obj === 'user') s_user(value);
                else console.log("Session Undefined:", obj, key, value);
            }

            let s_state = (key: string, value: any) => {
                if(req.session.state) req.session.state[key] = value;
                else req.session.state = { [key]: value };
            }
            let s_user = (value: any) => { req.session.user = value; }

            props.routes.forEach((route) => {
                if(route.matchesDomain(req.hostname))
                    route.getHandler(options, setOption, setSesh, RedisClient)(req, res, next);
            });
        });

        // http server / chat server, express for debug till reimp
        let port = props.port ?? 3000;
        const server = this.app.listen(port);
        this.getServer = () => { return server; }
        if(props.debug === true)
            console.log(`Listening on Port: ${port}`);

        // App Functions (WSS Upgrade)
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