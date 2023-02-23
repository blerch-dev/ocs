import { OCServer, OCRoute } from "ocs-type";
import WSS from "./chat";

const rootURL = process.env?.rootURL ?? 'ocs.local';

// Chat Route
const ChatRoute = new OCRoute({
    domain: `chat.${rootURL}`,
    callback: (router, options, setOption) => {
        router.get('/session', (req, res) => {
            res.send(`<pre>${JSON.stringify(req.session, null, 2)}</pre>`);
        });

        return router;
    }
});

const server = new OCServer({
    routes: [ChatRoute],
    port: 8081,
    appFunctions: [WSS],
    session: {
        secure: true,
        domain: `.${rootURL}`,
        sameSite: 'none'
    },
    cors: {
        creds: true,
        preflightContinue: true
    }
});

export default server;