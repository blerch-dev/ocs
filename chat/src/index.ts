import { OCServer, OCRoute, OCServices } from "ocs-type";
import WSS from "./chat";

// Chat Route
const ChatRoute = new OCRoute({
    domain: `${OCServices.Chat}`,
    callback: (router, server, session) => {
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
        secure: OCServices.Production ?? true,
        domain: `.${OCServices.RootURL}`,
        sameSite: 'none',
        rolling: true
    },
    cors: {
        creds: true,
        preflightContinue: true
    },
    debug: true
});

export default server;