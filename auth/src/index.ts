// Auth Server
// handles auth for all app domains, renders auth forms
// still figuring out session logic for everything

import path from 'path';
import { OCServer, OCAuth, OCRoute } from 'ocs-type';

import { AuthPage, ErrorPage, SessionPage } from './pages';

const Whitelist = [
    'app.local',
    'client.local',
    'chat.local',
    'data.local'
];

const DefaultRoute = new OCRoute({
    domain: 'auth.local',
    callback: (router, option, setOption, setSesh, redis) => {
        // routes for authentication (login, signup, auth)
        router.get('/sso', async (req, res, next) => {
            let site = req.query.site as string;

            if(site == undefined)
                return res.send(ErrorPage(404, "Did not specify an app domain."));

            if(Whitelist.indexOf(site) < 0)
                return res.send(ErrorPage(403, "This domain is not authorized to use OCS.GG SSO."));

            if(req.session?.user) {
                // Session
                console.log("Current Session");
            } else if(req.cookies?.ssi) {
                // Stay Signed In
                console.log("Creating Session from SSI");
            } else {
                // Login/Auth
                setSesh('state', 'authing_site', site);
                res.send(AuthPage());
            }
        });

        router.get('/session', (req, res) => {
            return res.send(SessionPage(req.session));
        });

        /*
        router.get('/twitch', passport.authenticate('twitch'));
        router.get('/auth/twitch', passport.authenticate('twitch', { failureRedirect: '/sso', successRedirect: '/session' }), (req, res, next) => {
            let site = req.session.state?.authing_site ?? 'no site';
            console.log("Auth Server: (/auth/twitch/)");
            return res.redirect('/session');
            // res.redirect(`https://${site}`);
        });
        */

        router.get('*', (req, res) => {
            res.send("Auth Catch All");
        });

        return router;
    }
});

const server = new OCServer({
    routes: [DefaultRoute],
    port: 8082,
    static: [path.resolve(__dirname, './public/')]
});

export default server;