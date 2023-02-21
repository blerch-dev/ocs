import { OCServer, OCRoute } from "ocs-type";
import WSS from "./chat";

const rootURL = process.env?.rootURL ?? 'ocs.local';

const Whitelist = [
    'http://app.local',
    'client.local'
];

// Chat Route
const ChatRoute = new OCRoute({
    domain: `chat.${rootURL}`,
    callback: (router, options, setOption) => {
        router.get('/session', (req, res) => {
            res.send(JSON.stringify(req.session, null, 2));
        });

        return router;
    }
});

const server = new OCServer({
    routes: [ChatRoute],
    port: 8081,
    appFunctions: [WSS],
    session: {
        domain: `.${rootURL}`
    },
    cors: {
        creds: true,
        preflightContinue: true
    },
    debug: true
});

export default server;