// Auth Server
// handles auth for all app domains, renders auth forms
// still figuring out session logic for everything

import path from 'path';
import { OCServer, OCRoute } from 'ocs-type';

const DefaultRoute = new OCRoute({
    domain: 'auth.local',
    callback: (router, option, setOption, setSesh) => {
        // routes for authentication (login, signup, auth)
        return router;
    }
});

const Whitelist = [
    'client.local',
    'chat.local'
];

const server = new OCServer({
    routes: [DefaultRoute],
    port: 8082,
    static: [path.resolve(__dirname, './public/')],
    cors: {
        creds: true,
        origin: (origin, callback) => {
            if(Whitelist.indexOf(origin) !== -1) callback(null, true);
            else callback(new Error('Not allowed by CORS'));
        }
    }
});

export default server;