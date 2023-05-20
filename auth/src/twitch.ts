import path from 'path';
import { OCServer, OCAuth, OCRoute, OCUser, OCServices } from 'ocs-type';

import { DefaultPage, ErrorPage, AuthPage, SessionPage, SignUpPage } from './pages';

export const GetTwitchRoute = (beta: boolean, Auth: OCAuth, passToApp: Function, stayLoggedIn: Function) => {
    return new OCRoute({
        domain: `${OCServices.Auth}`,
        callback: (router, server, session) => {
            router.get('/twitch', Auth.twitch.authenticate);
            router.get('/auth/twitch', Auth.twitch.verify, async (req, res, next) => {
                let site = req.session.state?.authing_site;
                let ssi = req.cookies.ssi;

                //console.log("Authing with Twitch:", req.session);
                //console.log("Twitch Data:", res.locals.twitch);


                // New Flow
                if(res.locals.authed instanceof Error) {
                    return res.send(ErrorPage(500, res.locals.twitch.message));
                }

                if(res.locals.authed?.finish) {
                    let user = res.locals.auth.user.toJSON();
                    return res.send(SignUpPage(site, { 
                        username: user.connections.twitch.username,
                        connections: user.connections
                    }));
                }

                // Needed replacment with new flow
                //     session.setUser(req, user.toJSON());
                //     if(ssi) { await stayLoggedIn(user, res); }
                //     session.setSesh(req, 'state', 'twitch', res.locals.twitch);

                return passToApp(req, res, server, site, ssi);
            });

            router.post('/user/twitch/sync', (req, res) => {
                // load subscriptions, match for existing channels
            });

            return router;
        }
    });
}