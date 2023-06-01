import { OCServer, OCRoute, OCServices, OCServerType } from "ocs-type";
import WSS from "./chat";

// Chat Route
const ChatRoute = new OCRoute({
    domain: `${OCServices.Chat}`,
    callback: (router, server, session) => {
        router.get(['/chat', '/chat/:channel'], (req, res, next) => {
            // returns chat html, needs to be served from here so that headers are included on connection
            let target_channel = req?.params?.channel ?? req?.query?.site ?? undefined; // target channel id/slug/name
        });

        router.get('/session', (req, res) => {
            res.send(`<pre>${JSON.stringify(req.session, null, 2)}</pre>`);
        });

        return router;
    }
});

const server = new OCServer({
    routes: [ChatRoute],
    type: OCServerType.Chat,
    port: 8081,
    appFunctions: [WSS],
    session: {
        secure: OCServices.Production ?? true,
        domain: `.${OCServices.RootURL}`,
        // sameSite: 'none',
        rolling: true
    },
    cors: {
        creds: true,
        preflightContinue: true
    },
    debug: false
});

export default server;