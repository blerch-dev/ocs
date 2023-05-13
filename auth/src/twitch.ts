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

                return passToApp(req, res, server, site, ssi);
            });

            router.post('/user/twitch/sync', (req, res) => {
                // load subscriptions, match for existing channels
            });

            return router;
        }
    });
}