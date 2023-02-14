// Auth Server
// handles auth for all app domains, renders auth forms
// still figuring out session logic for everything

import path from 'path';
import { OCServer, OCAuth, OCRoute, OCUser } from 'ocs-type';

import { AuthPage, ErrorPage, SessionPage } from './pages';

const Whitelist = [
    'app.local',
    'client.local',
    'chat.local',
    'data.local'
];

const Auth = new OCAuth({ twitch: true });

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
                //console.log("Current Session: ", req.session);
                console.log(req.cookies);
                res.redirect('/session');
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

        router.get('/twitch', Auth.twitch.authenticate);
        router.get('/auth/twitch', Auth.twitch.verify, async (req, res, next) => {
            let site = req.session.state?.authing_site ?? 'no site';
            console.log(`Twitch ID: ${res.locals.twitch_id}\nSite: ${site}`);

            // Find User
            if(res.locals.twitch_id == undefined)
                return res.send(ErrorPage(500, "Issue authenticating with Twitch. Try again later."));

            let output = await (await fetch(`http://data.local/user/twitch/${res.locals.twitch_id}`)).json();
            if(output.data instanceof Error) {
                return res.send(ErrorPage(500, "Issue reading from database. Try again later."));
            }

            let user = new OCUser(output.data);
            if(user instanceof OCUser) {
                console.log("OCUser:", user.toJSON());
                setSesh('user', null, user.toJSON());
                console.log("Session:", req.session);
            } else {
                // Create User
            }

            return res.redirect('/session');
            // res.redirect(`https://${site}`);
        });

        router.get('*', (req, res) => {
            res.send(ErrorPage(404, "Resources missing at this location."));
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