// Default Layout/Route for ocs.gg
import { OCRoute } from "ocs-type";
import { defaultLayout, defaultHead, embedComponent, chatComponent, headerComponent } from "../components";

const DefaultRoute = new OCRoute({
    domain: '[\\s\\S]*',
    callback: (router, options, setOption, setSesh, redis) => {
        const setSessionData = (obj: string, key: string, value: any) => {
            if(setSesh != undefined) setSesh(obj, key, value);
        }

        const isAuthed = (req: any, res: any, next: any) => {
            if(req?.session?.user == undefined) return res.redirect(`https://auth.local/sso?site=${req.hostname}`); next();
        }

        router.get('/chat', (req, res, next) => {
            let head = defaultHead('OCS | Chat');
            let embed = embedComponent();
            let chat = chatComponent('Global Chat');
            let body = `
                ${headerComponent('OCS Live', undefined, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main class="live">${embed}${chat}</main>
            `;

            res.send(defaultLayout(head, body));
        });

        router.get('/login', (req, res, next) => {
            return res.redirect(`https://auth.local/sso?site=${req.hostname}`);
        });

        router.get('/auth', async (req, res) => {
            let code = req.query.authcode as string;
            redis.getClient().get(code, (err, result) => {
                if(err) {
                    return res.redirect('/error');
                }

                res.cookie('connect.sid', result);
                return res.redirect('/profile');
            });
        });

        router.get('/profile', isAuthed, (req, res, next) => {
            let head = defaultHead('OCS | Profile');
            let body = `
                ${headerComponent('OCS Live', undefined, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main>
                    <h3>Profile Page (Dev/Session Data)</h3>
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
                ${headerComponent('OCS Live', undefined, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
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
