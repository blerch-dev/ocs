import express = require('express');
import session, { Cookie } from 'express-session';
import http from "http";
import bodyParser from 'body-parser';
import cors from 'cors';
import passport, { PassportStatic } from 'passport';
import OAuth2Strategy from 'passport-oauth2';
const TwitchStrategy = require('passport-twitch-latest');

import { OCRedisStore, OCRedisClient } from './state';

//import * as twitch from '../secrets/twitch.json';
const twitch = require('../secrets/twitch.json');

export interface OCServerProps {
    routes: [OCRoute],

    port?: number,
    static?: string[],
    appFunctions?: Function[],
    cors?: {
        creds?: boolean
        domains?: string[]
        origin?: (origin: any, callback: any) => void
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
    public getServer: () => http.Server;

    private app = express();

    constructor(props: OCServerProps) {
        if(props.static !== undefined)
            props.static.forEach((uri: string) => { this.app.use(express.static(uri)); });

        // App Middleware
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        // this.app.set('trust proxy', 1);
        this.app.enable('trust proxy');

        const RedisClient = new OCRedisClient('localhost');
        const RedisStore = new OCRedisStore(session, RedisClient.getClient());

        // PassportJS - Twitch
        let redirectURL = 'https://auth.local/auth/twitch';
        let authURL = `https://id.twitch.tv/oauth2/authorize?client_id=${twitch.id}` + 
            `&redirect_uri=${redirectURL}&response_type=code` + 
            `&scope=user:read:subscriptions+channel:read:polls+channel:read:subscriptions` +
            `+channel:read:vips+moderation:read+moderator:read:blocked_terms+chat:edit+chat:read` + 
            `&state=twitch`;
        
        passport.use(new TwitchStrategy({
            clientID: twitch.id,
            clientSecret: twitch.secret,
            callbackURL: redirectURL,
            authorization: authURL
        }, (accessToken: any, refreshToken: any, profile: any, done: any) => {
            //console.log(profile); // Twitch Profile
            // Find/Create User
            // return done(err, user);
            done();
        }));

        if(props.cors) {
            this.app.use(cors({
                credentials: props.cors.creds ?? true,
                origin: props.cors.origin ?? props.cors.domains ?? '*'
            }));

            // Example Origin Source
            // cors: {
            //     creds: true,
            //     origin: (origin, callback) => {
            //         if(Whitelist.indexOf(origin) !== -1) callback(null, true);
            //         else callback(new Error('Not allowed by CORS'));
            //     }
            // }
        }

        // This will be set to a custom solution attached to above cors and the central auth domain
        // Here for simple implmentation
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

        // Find matching domain/regex to route, fallback to default route
        this.app.use((req, res, next) => {
            let options: OCOptions = {};

            let setOption = (key: string, value: any) => { options[key] = value; }

            let setSesh = (obj: string, key: string, value: any) => {
                if(obj === 'state') s_state(key, value);
                else if(obj === 'user') s_user(key, value);
                else console.log("Session Undefined:", obj, key, value);
            }

            let s_state = (key: string, value: any) => {
                if(req.session.state) req.session.state[key] = value;
                else req.session.state = { [key]: value };
            }
            let s_user = (key: string, value: any) => {
                if(req.session.user) req.session.user[key] = value;
                else req.session.user = { [key]: value };
            }

            props.routes.forEach((route) => {
                if(route.matchesDomain(req.hostname))
                    route.getHandler(options, setOption, setSesh, RedisClient, passport)(req, res, next);
            });
        });

        // http server / chat server, express for debug till reimp
        let port = props.port ?? 3000;
        const server = this.app.listen(port);
        this.getServer = () => { return server; }
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
        redis: OCRedisClient, 
        passport: PassportStatic
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
        this.getHandler = (opt: OCOptions, sOpt: Function, sSesh: Function, redis: OCRedisClient, passport: PassportStatic) => {
            return props.callback(express.Router(), opt, sOpt, sSesh, redis, passport);
        }
    }
}