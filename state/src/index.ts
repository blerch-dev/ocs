import { OCServer, OCRoute, OCAuth } from 'ocs-type';

const rootURL = process.env?.rootURL ?? 'ocs.local';

const Whitelist = [
    'app.local',
    'client.local'
];

// Here for testing, load from db
const Channels = [

];

const DefaultRoute = new OCRoute({
    domain: `state.${rootURL}`,
    callback: (router, server, session) => {
        // User OCAuth for Twitch App Access

        return router;
    }
});

const server = new OCServer({
    routes: [DefaultRoute],
    port: 8084,
    cors: {
        creds: true
    },
    session: {
        domain: `*.${rootURL}`
    }
});

export default server;