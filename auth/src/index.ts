// Auth Server
// handles auth for all app domains, renders auth forms
// still figuring out session logic for everything

import path from 'path';
import { OCServer, OCAuth, OCRoute, OCUser } from 'ocs-type';

import { DefaultPage, AuthPage, ErrorPage, SessionPage, SignUpPage } from './pages';

const rootURL = process.env?.rootURL ?? 'ocs.local';

const Whitelist = [
    'app.local',
    'client.local'
];

const Auth = new OCAuth({ callbackURL: `auth.${rootURL}`, twitch: true });

const DefaultRoute = new OCRoute({
    domain: `auth.${rootURL}`,
    callback: (router, option, setOption, setSesh, redis) => {
        let passToApp = (res: any, value: string, site: string) => {
            let code = require('crypto').randomBytes(16).toString('hex');
            let json = JSON.stringify({ cookie: value, ssi: false, uuid: undefined }); // add toggle to ssi, encrypt todo

            redis.getClient().set(code, json);
            Auth.clearCode(() => { redis.getClient().del(code); }, 10);
            
            res.redirect(`http://${site}/auth?authcode=${code}`);
        }

        // routes for authentication (login, signup, auth)
        router.get('/sso', async (req, res, next) => {
            let site = req.query.site as string;

            if(site == undefined)
                return res.send(ErrorPage(404, "Did not specify an app domain."));

            if(Whitelist.indexOf(site) < 0)
                return res.send(ErrorPage(403, "This domain is not authorized to use OCS.GG SSO."));

            if(req.session?.user) {
                return passToApp(res, req.cookies['connect.sid'] ?? req.sessionID, site);
                //res.redirect('/session');
            } else if(req.cookies?.ssi) {
                // Stay Signed In
                console.log("Creating Session from SSI:", req.cookies.ssi);
            } else {
                // Login/Auth
                setSesh('state', 'authing_site', site);
                res.send(AuthPage());
            }
        });

        router.get('/logout', (req, res) => {
            req.session.destroy((err) => {
                let site = req.query.site as string;
                if(err)
                    return res.send(ErrorPage(500, "Error logging out from OCS."));

                res.clearCookie('connect.sid');
                if(site)
                    return res.redirect(`http://${site}/`);
                
                res.send(`${DefaultPage('OCS | Logout', '<main><h3>Logged Out</h3></main>')}`)
            });
        });

        router.get('/session', (req, res) => {
            return res.send(SessionPage(req.session));
        });

        router.get('/twitch', Auth.twitch.authenticate);
        router.get('/auth/twitch', Auth.twitch.verify, async (req, res, next) => {
            let site = req.session.state?.authing_site ?? 'no site';
            let cookie = req.cookies['connect.sid'];

            console.log("Auth/Twitch", site, cookie);

            // Find User
            if(res.locals.twitch.id == undefined)
                return res.send(ErrorPage(500, "Issue authenticating with Twitch. Try again later."));

            let output = await (await fetch(`http://data.${rootURL}/user/twitch/${res.locals.twitch.id}`)).json();
            if(output.data instanceof Error) {
                return res.send(ErrorPage(500, "Issue reading from database. Try again later."));
            }

            let user = new OCUser(output.data);
            // Add ways to select stay signed in here
            if(user instanceof OCUser) {
                setSesh('user', null, user.toJSON());
            } else {
                // Create User
                return res.send(SignUpPage(res.locals));
            }

            if(req.sessionID == undefined) {
                return res.redirect('/session');
            }

            return passToApp(res, cookie ?? req.sessionID, site);
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
    static: [path.resolve(__dirname, './public/')],
    cors: {},
    session: {
        domain: `.${rootURL}`
    }
});

export default server;