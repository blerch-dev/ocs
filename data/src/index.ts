import { OCServer, OCRoute, OCServices } from 'ocs-type';

import UserRoute from './routes/user';

const DefaultRoute = new OCRoute({
    domain: `${OCServices.Data}`,
    callback: (router, server, session) => {
        router.get('/ping', (req, res) => {
            res.send('pong');
        });

        router.all('*', (req, res) => {
            res.json({ code: 404, message: 'data catch all' });
        });

        return router;
    }
});

const server = new OCServer({
    routes: [UserRoute, DefaultRoute],
    port: 8083,
    cors: {
        creds: true
    }
});

export default server;