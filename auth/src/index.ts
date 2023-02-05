// Auth Server
// handles auth for all app domains, renders auth forms
// still figuring out session logic for everything

import path from 'path';
import { OCServer, OCRoute } from 'ocs-type';

const Whitelist = [
    'app.local',
    'client.local',
    'chat.local'
];

const DefaultPage = (title: string, body: string) => `
    <!DOCTYPE html>
    <html lang="en">
        <script> var exports = {}; </script>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="icon" href="/assets/favicon.ico" />
            <title>${title}</title>
            <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>${body}</body>
    </html>
`;

const ErrorPage = (code: number, message?: string) => `
    ${DefaultPage('OCS | SSO', `
        <main>
            <h2>OCS.GG Authentication Error: ${code}</h2>
            <p>${message ?? 'Undefined Error. Please try again later.'}</p>
        </main>
    `)}
`;

const AuthPage = (login: boolean) => `
    ${DefaultPage('OCS | SSO', `
        <main>
            <div class="auth-form">
                <a class="twitch-auth-button" href="">Twitch</a>
            </div>
        </main>
    `)}
`;

const DefaultRoute = new OCRoute({
    domain: 'auth.local',
    callback: (router, option, setOption, setSesh, redis, passport) => {
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
                console.log("Login");
            }
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