import express = require('express');
import session from 'express-session';
import http from "http";
import bodyParser from 'body-parser';

import { OCRedisStore, OCRedisClient } from './state';

export interface OCRequest { (req: express.Request, res: express.Response, next?: express.NextFunction): void }

export interface OCServerProps {
    routes: [OCRoute],

    port?: number,
    static?: string[],
    appFunctions?: Function[]
}

export interface OCOptions {
    [key: string]: any;
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
        this.app.set('trust proxy', 1);

        const RedisClient = new OCRedisClient('localhost');
        const RedisStore = new OCRedisStore(session, RedisClient.getClient());

        this.app.use(session({
            store: RedisStore.getStore(),
            secret: 'test',
            resave: false,
            saveUninitialized: false,
            cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 10 }
        }));

        // Find matching domain/regex to route, fallback to default route
        this.app.use((req, res, next) => {
            let options: OCOptions = {
                session: req.session
            };
            let setOption = (key: string, value: any) => { options[key] = value; }

            props.routes.forEach((route) => {
                if(route.matchesDomain(req.hostname))
                    route.getHandler(options, setOption)(req, res, next);
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
    callback: (router: express.Router, opt?: OCOptions, sOpt?: Function) => express.Router
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
        this.getHandler = (opt?: OCOptions, sOpt?: Function) => { return props.callback(express.Router(), opt, sOpt); }
    }
}