import { OCServer, OCRoute } from 'ocs-type';

const rootURL = process.env?.rootURL ?? 'ocs.local';

const Whitelist = [
    'app.local',
    'client.local'
];

const DefaultRoute = new OCRoute({
    domain: `state.${rootURL}`,
    callback: (router, option, setOption, setSesh, redis) => {
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