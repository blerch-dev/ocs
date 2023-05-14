import path from 'path';
import { OCServer, OCAuth, OCRoute, OCUser, OCServices } from 'ocs-type';

import { DefaultPage, ErrorPage, AuthPage, SessionPage, SignUpPage } from './pages';

export const GetYoutubeRoute = (beta: boolean, Auth: OCAuth, passToApp: Function, stayLoggedIn: Function) => {
    return new OCRoute({
        domain: `${OCServices.Auth}`,
        callback: (router, server, session) => {
            router.get('*', (req, res, next) => {
                if(req.hostname.includes('localhost'))
                    return res.redirect(`${OCServices.IMP}://${OCServices.Auth}${req.originalUrl}`);

                return next();
            });

            router.get('/youtube', Auth.youtube.authenticate);
            router.get('/auth/youtube', Auth.youtube.verify, async (req, res, next) => {
                let site = req.session.state?.authing_site;
                let ssi = req.cookies.ssi;

                //console.log("Authing with Youtube:", req.session);
                //console.log("Youtube Data:", res.locals.youtube);

                // Find User
                if(res.locals.youtube?.id == undefined) {
                    if(res.locals.youtube.error === 1)
                        return res.send(ErrorPage(401, res.locals.youtube.message));

                    return res.send(ErrorPage(500, "Issue authenticating with Youtube. Try again later."));
                }

                // leaf cert thing https://stackoverflow.com/questions/20082893/unable-to-verify-leaf-signature for https
                let output = await (
                    // await fetch(`${OCServices.IMP}://${OCServices.Data}/user/youtube/${res.locals.youtube.id}`)
                    await OCServices.Fetch('Data', `/user/youtube/${res.locals.youtube.id}`)
                ).json();

                if(output.data instanceof Error) {
                    return res.send(ErrorPage(500, "Issue reading from database. Try again later."));
                }

                //console.log("Output Data:", output.data);
                let user = new OCUser(output.data, { noError: true });
                // Add ways to select stay signed in here
                if(user instanceof OCUser && user.validUserObject()) {
                    session.setUser(req, user.toJSON());
                    if(ssi) { await stayLoggedIn(user, res); }
                } else {
                    // Create User - remember to normalize usernames on creation
                    let yt = res.locals.youtube;
                    let name = yt?.snippet?.customUrl?.substring(1) ?? yt?.snippet?.title ?? "no_username";
                    session.setSesh(req, 'state', 'youtube', res.locals.youtube);
                    return res.send(SignUpPage(site, { 
                        username: name,
                        connections: {
                            youtube: {
                                id: yt.id,
                                username: name
                            }
                        }
                    }));
                }

                //console.log("YT User:", user.validUserObject(), user.toJSON());
                return passToApp(req, res, server, site, ssi);
            });

            router.post('/user/youtube/sync', (req, res) => {
                // load subscriptions, match for existing channels
            });

            return router;
        }
    });
}