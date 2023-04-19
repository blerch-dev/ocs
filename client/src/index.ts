import path from 'path';
import { OCServer, OCRoute, OCServices } from 'ocs-type';

// Custom Express Based JS Renderer/Session Management
// Routes will define layout, import components (add component type to oc-type)
    // Returns html string from domain + path

import DevRoute from './routes/dev';
import DefaultRoute from './routes/default';

const SSIRoute = new OCRoute({
    domain: '*',
    callback: (router, server, session) => {
        router.all('*', (req, res) => {
            if(req.session.user === undefined && req.cookies?.ssi === true) {
                session.setSesh('state', 'ssi_forward', req.protocol + '://' + req.hostname + req.originalUrl);
                res.redirect(`${OCServices.IMP}://${OCServices.Auth}/sso?site=${req.hostname}`);
            }
        });

        return router;
    }
})

const server = new OCServer({
    routes: [DevRoute, DefaultRoute],
    port: 8080,
    static: [path.resolve(__dirname, './public/')],
    session: {}
});

export default server;