import express = require('express');
import http = require('http');

export class OCServer {

    private app?: express.Application;

    constructor(props: OCProps) {
        this.app = express();
        if(props.static !== undefined)
            props.static.forEach((uri: string) => { this.app?.use(express.static(uri)); });

        // Find matching domain/regex to route, fallback to default route

        // http server / chat server, express for debug till reimp
        this.app.listen(props.port ?? 3000)
    }
}

export interface OCRequest { (req: express.Request, res: express.Response, next?: express.NextFunction): void }

export interface OCProps {
    routes: [OCRoute],

    port?: number,
    static?: [string]
}

export class OCRoute {
    constructor() { }
}