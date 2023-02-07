import { OCServer, OCRoute } from 'ocs-type';

const DefaultRoute = new OCRoute({
    domain: 'data.local',
    callback: (router, option, setOption, setSesh, redis, passport) => {
        return router;
    }
});

const server = new OCServer({
    routes: [DefaultRoute],
    port: 8083
});

export default server;