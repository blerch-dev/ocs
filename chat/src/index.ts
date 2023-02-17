import { OCServer, OCRoute } from "ocs-type";
import WSS from "./chat";

// Chat Route
const ChatRoute = new OCRoute({
    domain: '[\\s\\S]*',
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