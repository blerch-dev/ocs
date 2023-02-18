import { OCServer, OCRoute } from "ocs-type";
import WSS from "./chat";

const rootURL = process.env?.rootURL ?? 'ocs.local';

// Chat Route
const ChatRoute = new OCRoute({
    domain: `chat.${rootURL}`,
    callback: (router, options, setOption) => {
        return router;
    }
});

const server = new OCServer({
    routes: [ChatRoute],
    port: 8081,
    appFunctions: [WSS],
    session: {}
});

export default server;