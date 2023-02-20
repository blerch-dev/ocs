// Default Layout/Route for ocs.gg
import { OCRoute } from "ocs-type";
import { defaultLayout, defaultHead, embedComponent, chatComponent, headerComponent } from "../components";

const rootURL = process.env?.rootURL ?? 'ocs.local';

const DefaultRoute = new OCRoute({
    domain: '[\\s\\S]*',
    callback: (router, options, setOption, setSesh, redis) => {
        const isAuthed = (req: any, res: any, next: any) => {
            if(req?.session?.user == undefined) 
                return res.redirect(`https://auth.${rootURL}/sso?site=${req.hostname}`);

            next();
        }

        router.get('/live', (req, res, next) => {
            let head = defaultHead('OCS | Live');
            let embed = embedComponent();
            let chat = chatComponent('Global Chat');
            let body = `
                ${headerComponent('OCS Live', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main class="live">${embed}${chat}</main>
            `;

            res.send(defaultLayout(head, body));
        });

        router.get('/chat', (req, res, next) => {
            let head = defaultHead('OCS | Chat');
            let embed = embedComponent();
            let chat = chatComponent('Global Chat');
            let body = `
                ${headerComponent('OCS Live', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main class="live">${embed}${chat}</main>
            `;

            res.send(defaultLayout(head, body));
        });

        router.get('/login', isAuthed, (req, res, next) => {
            return res.redirect('/profile');
        });

        router.get('/logout', (req, res) => {
            res.clearCookie('connect.sid');
            res.redirect(`https://auth.${rootURL}/logout?site=${req.hostname}`);
        });

        router.get('/auth', async (req, res) => {
            let code = req.query.authcode as string;
            redis.getClient().get(code, (err, result) => {
                if(err || typeof(result) !== 'string') {
                    return res.redirect('/error');
                }

                let json = JSON.parse(result);
                // get session id from cookie, get session, extract info for ssi cookie here
                res.cookie('connect.sid', json.cookie);
                return res.redirect('/profile');
            });
        });

        router.get('/profile', isAuthed, (req, res, next) => {
            let head = defaultHead('OCS | Profile');
            let body = `
                ${headerComponent('OCS Live', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main>
                    <h3>Profile Page</h3>
                    <div>
                        <a href="http://${req.hostname}/logout">Logout</a>
                    </div>
                    <h3>Dev/Session Data</h3>
                    <p>Session</p>
                    <pre>${JSON.stringify(options?.session ?? req.session ?? { error: 'No Session' }, null, 2)}</pre>
                    <p>Cookies:</p>
                    <pre>${JSON.stringify(options?.cookies ?? req.cookies ?? { error: 'No Cookies' }, null, 2)}</pre>
                    <style>
                        pre {
                            margin-bottom: 10px;
                        }
                    </style>
                </main>
            `;

            res.send(defaultLayout(head, body));
        })

        router.get('/', (req, res, next) => {
            let head = defaultHead('OCS');
            let body = `
                ${headerComponent('OCS Live', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main>
                    <h3>Home Page</h3>
                </main>
            `;

            res.send(defaultLayout(head, body));
        });

        // 404 Page
        // JSON Catch All

        return router;
    }
});

export default DefaultRoute;
