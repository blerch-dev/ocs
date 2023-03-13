// Auth Server
// todo - user tokens (only placed on root domain at auth)

import path from 'path';
import { OCServer, OCAuth, OCRoute, OCUser } from 'ocs-type';

import ErrorPage, { DefaultPage, AuthPage, SessionPage, SignUpPage } from './pages';

const rootURL = process.env?.rootURL ?? 'ocs.local';
const beta = process.env.NODE_ENV === 'beta' ?? true;

const Whitelist = [
    'app.local',
    'client.local'
];

const Auth = new OCAuth({ callbackURL: `auth.${rootURL}`, twitch: true });

const DefaultRoute = new OCRoute({
    domain: `auth.${rootURL}`,
    callback: (router, server, session) => {
        let passToApp = (res: any, value: string, site: string, ssi?: boolean) => {
            let code = require('crypto').randomBytes(16).toString('hex');
            let json = JSON.stringify({ cookie: value, ssi: ssi ?? false });

            server.getRedisClient().getClient().set(code, json);
            Auth.clearCode(() => { server.getRedisClient().getClient().del(code); }, 10);
            
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
            } else if(req.cookies?.ssi && req.cookies?.keep) {
                // Stay Signed In - SSI is boolean, keep is json string
                server.logger.debug(`Creating Session from SSI: ${req.cookies.ssi} - ${req.cookies.keep}`,);
                // Token Flow
            } else {
                // Login/Auth
                session.setSesh('state', 'authing_site', site);
                res.send(AuthPage(site));
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

        router.post('/user/create', async (req, res) => {
            // Validate Data
            // Sync Connections/Subs/Roles
            // Forward to Profile

            if(beta) {
                if(req.body.code !== 'dev-mode') {
                    res.json({
                        Error: {
                            Code: 401,
                            Message: "Beta access requires valid code."
                        }
                    });
                }
            }

            let data = JSON.parse(req.body.data.replace(/'/g, '"'));
            let username: string = req.body.username ?? data.username ?? 'undefined';
            let user = new OCUser({
                uuid: OCUser.generateId(),
                username: username,
                connections: data.connections ?? {},
                channels: data.channels ?? {}
            });

            let output = await (await fetch(`http://data.${rootURL}/user/create`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_data: user.toJSON() })
            })).json();
            
            // Output is Error | OCUser
            // if error, error response
            // if user, forward to original site

            // Here for Debug
            res.json({
                state: req.session.state,
                user: req.session.user,
                body: req.body,
                output: output
            });
        });

        // #region Twitch
        router.get('/twitch', Auth.twitch.authenticate);
        router.get('/auth/twitch', Auth.twitch.verify, async (req, res, next) => {
            let site = req.session.state?.authing_site ?? 'no site';
            let ssi = req.cookies.ssi;

            // Find User
            if(res.locals.twitch.id == undefined)
                return res.send(ErrorPage(500, "Issue authenticating with Twitch. Try again later."));

            // leaf cert thing https://stackoverflow.com/questions/20082893/unable-to-verify-leaf-signature for https
            let output = await (await fetch(`http://data.${rootURL}/user/twitch/${res.locals.twitch.id}`)).json();
            if(output.data instanceof Error) {
                return res.send(ErrorPage(500, "Issue reading from database. Try again later."));
            }

            let user = new OCUser(output.data, { noError: true });
            // Add ways to select stay signed in here
            if(user instanceof OCUser && user.validUserObject()) {
                session.setUser(user.toJSON());
            } else {
                // Create User - remember to normalize usernames on creation
                session.setSesh('state', 'twitch', res.locals.twitch);
                return res.send(SignUpPage(site, { 
                    username: res.locals.twitch.login,
                    connections: {
                        twitch: {
                            id: res.locals.twitch.id,
                            username: res.locals.twitch.login
                        }
                    }
                }));
            }

            if(req.sessionID == undefined) {
                return res.redirect('/session');
            }

            return passToApp(res, req.cookies['connect.sid'] ?? req.sessionID, site);
        });

        router.post('/user/twitch/sync', (req, res) => {
            // load subscriptions, match for existing channels
        });
        // #endregion

        router.get('*', (req, res) => {
            res.send(ErrorPage(404, "Resources missing at this location."));
        });

        return router;
    }
    
});

// Secure/SameSite with nginx requires this in rp: proxy_set_header X-Forwarded-Proto $scheme;
// https://www.digitalocean.com/community/questions/secure-cookies-not-working-despite-successful-https-connection

const server = new OCServer({
    routes: [DefaultRoute],
    port: 8082,
    static: [path.resolve(__dirname, './public/')],
    cors: {},
    session: {
        secure: true,
        domain: `.${rootURL}`,
        sameSite: 'none',
        rolling: true
    },
    monitor: {
        title: 'OCS Status'
    },
    debug: true
});

export default server;