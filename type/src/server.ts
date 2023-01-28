import express = require('express');
import http = require('http');

export interface OCRequest { (req: express.Request, res: express.Response, next?: express.NextFunction): void }

export interface OCServerProps {
    routes: [OCRoute],

    port?: number,
    static?: string[]
}

export class OCServer {
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
        this.app.listen(port);
        console.log(`Listening on Port: ${port}`);
    }
}

export interface OCRouteProps {
    domain: string,
    callback: (router: express.Router, opt?: object, sOpt?: Function) => express.Router
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
        this.getHandler = (opt?: object, sOpt?: Function) => { return props.callback(express.Router(), opt, sOpt); }
    }
}