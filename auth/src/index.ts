// Auth Server
// todo - user tokens (only placed on root domain at auth)

import path from 'path';
import { OCServer, OCAuth, OCRoute, OCUser, OCServices } from 'ocs-type';

import ErrorPage, { DefaultPage, AuthPage, SessionPage, SignUpPage } from './pages';

const beta = process.env.NODE_ENV === 'beta' ?? true;

const Auth = new OCAuth({ callbackURL: `${OCServices.Auth}`, twitch: true });

// Client session remains but chat/auth session is not being renewed, should do some sanity checks after 18 hours
const DefaultRoute = new OCRoute({
    domain: `${OCServices.Auth}`,
    callback: (router, server, session) => {
        let passToApp = (req: any, res: any, site: string, ssi?: boolean) => {
            let code = require('crypto').randomBytes(16).toString('hex');
            let json = { cookie: req.cookies['connect.sid'], ssi: ssi ?? false }

            if(json.cookie == undefined) {
                //console.log("No Cookie Value:", json.cookie, req.session);
                return res.redirect(`/pta?site=${site}`);
            }

            server.getRedisClient().getClient().set(code, JSON.stringify(json));
            Auth.clearCode(() => { server.getRedisClient().getClient().del(code); }, 10);
            
            let redirect = `${OCServices.IMP}://${req.session.state?.authing_site ?? site}/auth?authcode=${code}`;
            //console.log("PTA Cookies:", json);
            res.redirect(redirect);
        }

        let stayLoggedIn = async (user: OCUser, res: any) => {
            // create key, set to auth site cookie, month long token, renews every 7 days
            let resp = await OCServices.Fetch('Data', '/token/create', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_data: user.toJSON() })
            });

            let json = await resp.json();
            //console.log("SSI Creation:", json);
            if(json.Error !== undefined || json.token === undefined) {
                console.log("SSI Error:", json.Error);
                return;
            }

            let hour = 3600000;
            res.cookie('ssi_token', json.token, { maxAge: 30 * 24 * hour, httpOnly: true, secure: OCServices.Production });
            return;
        }

        // router.get('/reqack/:site', (req, res) => {
        //     res.send(DefaultPage('OCS | Session Forwarding', `
        //         <script> window.location.href = '/pta?site=${req.params.site}' </script>
        //     `));
        // });

        router.get('/pta', async (req, res) => {
            //console.log("Sent to PTA:", req.query.site, req.cookies);
            return passToApp(req, res, req.query.site ?? req.session?.state?.authing_site, req.cookies?.ssi)
        });

        // routes for authentication (login, signup, auth)
        router.get('/sso', async (req, res, next) => {
            let site = req.query.site as string;

            if(site == undefined)
                return res.send(ErrorPage(404, "Did not specify an app domain."));

            if(OCServices.WhitelistedSites.indexOf(site) < 0)
                return res.send(ErrorPage(403, "This domain is not authorized to use OCS.GG SSO."));

            const auth_fallback = async () => {
                session.setSesh(req, 'state', 'authing_site', site);
                res.send(AuthPage(site));
            }

            if(req.session?.user) {
                // Current Session
                return passToApp(req, res, site, req.cookies.ssi);
            } else if(req.cookies?.ssi && req.cookies?.ssi_token) {
                // Stay Signed In
                //server.logger.debug(`Creating Session from SSI: ${req.cookies.ssi} - ${req.cookies.ssi_token}`,);
                let resp = await OCServices.Fetch('Data', '/token/auth', {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: req.cookies.ssi_token })
                });

                let json = await resp.json();
                if(json.Error !== undefined || json.user === undefined) {
                    console.log("json error - auth fallback", json);
                    return auth_fallback();
                }

                let user = new OCUser(json.user, { noError: true });
                if(user instanceof OCUser && user.validUserObject()) {
                    session.setUser(req, user.toJSON());
                    return passToApp(req, res, site, req.cookies?.ssi)
                } else {
                    console.log("user error - auth fallback", user);
                    auth_fallback();
                }
            } else {
                // Login/Auth
                auth_fallback();
            }
        });

        router.get('/logout', async (req, res) => {
            let user_id = req.session?.user?.uuid ?? 'ignore_request';
            let result = await (await OCServices.Fetch('Data', `/token/delete/uuid/${user_id}`)).json();
            console.log("Logout DB Result:", result);

            // destroy was not getting replaced on next request
            req.session.destroy((err) => {
                let site = req.query.site as string;
                if(err)
                    return res.send(ErrorPage(500, "Error logging out from OCS."));

                //console.log("Deleted Session:", req.session);
                res.clearCookie('connect.sid'); // for destroy
                res.clearCookie('ssi_token');
                if(site)
                    return res.redirect(`https://${site}/`);
                
                res.send(`${DefaultPage('OCS | Logout', '<main><h3>Logged Out</h3></main>')}`)
            });
        });

        router.get('/session', (req, res) => {
            return res.send(SessionPage(req.session));
        });

        router.post('/user/create', async (req, res) => {
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

            if(!user.validUserObject()) {
                return res.json({ Error: { Code: 500, Message: "Failed to create user data." } });
            }

            let output = await (await fetch(`${OCServices.IMP}://${OCServices.Data}/user/create`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_data: user.toJSON(), extras: { site: req.session.state?.authing_site } })
            })).json();

            // Output is Error | OCUser
            if(output.Error)
                return res.json({ Error: output.Error });

            // could user OCUser check here
            session.setUser(req, output.data);
            if(req.cookies.ssi) { await stayLoggedIn(output, res); }

            // Loading mixed content error, needs https on original url
            return passToApp(req, res, req.session.state?.authing_site, req.cookies.ssi);
        });

        // #region Twitch
        router.get('/twitch', Auth.twitch.authenticate);
        router.get('/auth/twitch', Auth.twitch.verify, async (req, res, next) => {
            let site = req.session.state?.authing_site;
            let ssi = req.cookies.ssi;

            //console.log("Authing with Twitch:", req.session);

            // Find User
            if(res.locals.twitch.id == undefined)
                return res.send(ErrorPage(500, "Issue authenticating with Twitch. Try again later."));

            // leaf cert thing https://stackoverflow.com/questions/20082893/unable-to-verify-leaf-signature for https
            let output = await (
                // await fetch(`${OCServices.IMP}://${OCServices.Data}/user/twitch/${res.locals.twitch.id}`)
                await OCServices.Fetch('Data', `/user/twitch/${res.locals.twitch.id}`)
            ).json();

            if(output.data instanceof Error) {
                return res.send(ErrorPage(500, "Issue reading from database. Try again later."));
            }

            let user = new OCUser(output.data, { noError: true });
            // Add ways to select stay signed in here
            if(user instanceof OCUser && user.validUserObject()) {
                session.setUser(req, user.toJSON());
                if(ssi) { await stayLoggedIn(user, res); }
            } else {
                // Create User - remember to normalize usernames on creation
                session.setSesh(req, 'state', 'twitch', res.locals.twitch);
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

            return passToApp(req, res, site, ssi);
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
        secure: OCServices.Production ?? true,
        domain: `.${OCServices.RootURL}`,
        sameSite: 'none',
        rolling: true
    },
    debug: true
});

export default server;