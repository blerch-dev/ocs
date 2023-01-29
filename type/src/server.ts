import express = require('express');
import http from "http";

export interface OCRequest { (req: express.Request, res: express.Response, next?: express.NextFunction): void }

export interface OCServerProps {
    routes: [OCRoute],

    port?: number,
    static?: string[],
    appFunctions?: Function[]
}

export class OCServer {
    public getServer: () => http.Server;

    private app = express();

    constructor(props: OCServerProps) {
        if(props.static !== undefined)
            props.static.forEach((uri: string) => { this.app.use(express.static(uri)); });

        // Find matching domain/regex to route, fallback to default route
        this.app.use((req, res, next) => {
            props.routes.forEach((route) => {
                if(route.matchesDomain(req.hostname))
                    route.getHandler()(req, res, next);
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

export interface OCOptions {
    [key: string]: any;
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