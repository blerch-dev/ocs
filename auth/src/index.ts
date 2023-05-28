// Auth Server
// todo - user tokens (only placed on root domain at auth)

import path from 'path';
import { OCServer, OCAuth, OCRoute, OCUser, OCServices } from 'ocs-type';

import { DefaultPage, ErrorPage, AuthPage, SessionPage, SignUpPage } from './pages';
import { GetTwitchRoute } from './twitch';
import { GetYoutubeRoute } from './youtube';


const beta = !OCServices.Production;
const Auth = new OCAuth({ callbackURL: `${OCServices.Auth}`, twitch: true, youtube: true });

// on additional auth, site is undefined
let passToApp = (req: any, res: any, server: OCServer, site: string, ssi?: boolean) => {
    let code = require('crypto').randomBytes(16).toString('hex');
    let json = { cookie: req.cookies['connect.sid'], ssi: ssi ?? false, site: site }

    if(json.cookie == undefined) {
        //console.log("No Cookie Value:", json.cookie, req.session);
        return res.redirect(`/pta?site=${site}`);
    }

    server.getRedisClient().getClient().set(code, JSON.stringify(json));
    Auth.clearCode(() => { server.getRedisClient().getClient().del(code); }, 10);
    
    let redirect = `${OCServices.IMP}://${site ?? req.session.state?.authing_site}/auth?authcode=${code}`;
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

const TwitchRoute = GetTwitchRoute(beta, Auth, passToApp, stayLoggedIn);
const YoutubeRoute = GetYoutubeRoute(beta, Auth, passToApp, stayLoggedIn);

// Client session remains but chat/auth session is not being renewed, should do some sanity checks after 18 hours
const DefaultRoute = new OCRoute({
    domain: `${OCServices.Auth}`,
    callback: (router, server, session) => {

        router.get('*', (req, res, next) => {
            if(req.query.site)
                session.setSesh(req, 'state', 'authing_site', req.query.site);

            return next();
        });

        router.get('/pta', async (req, res) => {
            //console.log("Sent to PTA:", req.query.site, req.cookies);
            return passToApp(req, res, server, req.query.site ?? req.session?.state?.authing_site, req.cookies?.ssi)
        });

        // routes for authentication (login, signup, auth)
        router.get('/sso', async (req, res, next) => {
            let site = req.query.site as string;

            if(site == undefined)
                return res.send(ErrorPage(404, "Did not specify an app domain."));

            if(OCServices.WhitelistedSites.indexOf(site) < 0)
                return res.send(ErrorPage(403, "This domain is not authorized to use OCS.GG SSO."));

            const auth_fallback = async () => {
                res.send(AuthPage(site));
            }

            if(req.session?.user) {
                // Current Session
                return passToApp(req, res, server, site, req.cookies.ssi);
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
                    return passToApp(req, res, server, site, req.cookies?.ssi)
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
            if(result.Okay === false) { console.log("Logout DB Result:", result); }

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
            let code = req.body.code ?? '';
            if(beta) {
                if(code !== '--dev-mode' && code !== 'beta-tester') {
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
                roles: code === '--dev-mode' ? 1 << 0 : code === 'beta-tester' ? 1 << 4 : 0,
                connections: data.connections ?? {},
                channels: data.channels ?? {}
            });

            if(!user.validUserObject()) {
                return res.json({ Error: { Code: 500, Message: "Failed to create user data." } });
            }

            //console.log("User Data:", user.toJSON());
            let output = await OCAuth.createUser(user, { site: req.session.state?.authing_site });

            // Output is Error | OCUser
            if(output instanceof Error)
                return res.json({ Error: { Message: output.message } });

            user = output as OCUser;
            if(user.validUserObject()) {
                session.setUser(req, user.toJSON());
                if(req.cookies.ssi) { await stayLoggedIn(user, res); }
            } else {
                return res.json({ Error: { Message: "Failed creating user object." } });
            }

            // Loading mixed content error, needs https on original url
            return passToApp(req, res, server, req.session.state?.authing_site, req.cookies.ssi);
        });

        router.get('*', (req, res) => {
            res.send(ErrorPage(404, "Resources missing at this location."));
        });

        return router;
    }
    
});

// Secure/SameSite with nginx requires this in rp: proxy_set_header X-Forwarded-Proto $scheme;
// https://www.digitalocean.com/community/questions/secure-cookies-not-working-despite-successful-https-connection

const server = new OCServer({
    routes: [TwitchRoute, YoutubeRoute, DefaultRoute],
    port: 8082,
    static: [path.resolve(__dirname, './public/')],
    cors: {},
    session: {
        secure: OCServices.Production ?? true,
        domain: `.${OCServices.RootURL}`,
        // sameSite: 'none',
        rolling: true
    },
    debug: true
});

export default server;