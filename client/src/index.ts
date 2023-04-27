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
        router.get('/auth', async (req, res) => {
            let code = req.query.authcode as string;
            server.getRedisClient().getClient().get(code, (err, result) => {
                if(err || typeof(result) !== 'string') {
                    return res.redirect('/error');
                }

                let json = JSON.parse(result);
                // get session id from cookie, get session, extract info for ssi cookie here
                //console.log("client auth side:", json);
                res.cookie('connect.sid', json.cookie);
                if(json.ssi) {
                    res.cookie('ssi', json.ssi, { 
                        expires: new Date(365 * 24 * 60 * 60 * 1000 + Date.now()),
                        httpOnly: true 
                    }) 
                }

                if(req.session.state?.ssi_forward) {
                    return res.redirect(req.session.state.ssi_forward);
                }

                return res.redirect('/profile');
            });
        });

        router.get('/logout', (req, res) => {
            res.clearCookie('connect.sid');
            res.clearCookie('ssi');
            res.redirect(`${OCServices.IMP}://${OCServices.Auth}/logout?site=${req.hostname}`);
        });

        // cant set headers after sent issue here
        router.all('*', (req, res, next) => {
            if(req.session?.user == undefined && req.cookies.ssi == 'true') {
                res.cookie('ssi_forward', req.protocol + '://' + req.hostname + req.originalUrl);
                res.redirect(`${OCServices.IMP}://${OCServices.Auth}/sso?site=${req.hostname}`);
            } else if(req.cookies.ssi_forward) {
                res.clearCookie('ssi_forward');
                return res.redirect(req.cookies.ssi_forward);
            }

            return next();
        });

        // Needs to pipe full response to state server (not exposed, needs forwarding)
        router.all('/ingress/twitch/event', (req, res) => {
            //const url = ``;
            //req.pipe(fetch(url)).pipe(res);
        });

        return router;
    }
})

const server = new OCServer({
    routes: [SSIRoute, DevRoute, DefaultRoute],
    port: 8080,
    static: [path.resolve(__dirname, './public/')],
    session: {}
});

export default server;