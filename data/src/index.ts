import { OCServer, OCRoute, OCServices, OCServerType } from 'ocs-type';

import UserRoute from './routes/user';
import ChannelRoute from './routes/channel';

const DefaultRoute = new OCRoute({
    domain: `${OCServices.Data}`,
    callback: (router, server, session) => {
        router.get('/ping', (req, res) => {
            res.send('pong');
        });

        // router.post('/test/post', (req, res) => {
        //     const { body, method, headers } = req;
        //     console.log(method, headers, body);
        //     res.end();
        // });

        router.all('*', (req, res) => {
            res.json({ code: 404, message: 'data catch all' });
        });

        return router;
    }
});

const server = new OCServer({
    routes: [UserRoute, ChannelRoute, DefaultRoute],
    type: OCServerType.Data,
    port: 8083,
    cors: {
        creds: true
    }
});

export default server;