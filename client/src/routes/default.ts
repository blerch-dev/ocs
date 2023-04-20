// Default Layout/Route for ocs.gg
import { OCRoute, OCServices } from "ocs-type";
import { defaultLayout, defaultHead, embedComponent, chatComponent, headerComponent } from "../components";

const DefaultRoute = new OCRoute({
    domain: '[\\s\\S]*',
    callback: (router, server, session) => {
        const isAuthed = (req: any, res: any, next: any) => {
            if(req?.session?.user == undefined) 
                return res.redirect(`${OCServices.IMP}://${OCServices.Auth}/sso?site=${req.hostname}`);

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

        router.get('/chat/embed', (req, res) => {
            let head = defaultHead('OCS | Embed Chat');
            let chat = chatComponent('Global Chat', { transparent: true, flex: true });
            let body = `<main class="live">${chat}</main>`;

            res.send(defaultLayout(head, body, { transparent: true }));
        });

        router.get('/chat', (req, res, next) => {
            let head = defaultHead('OCS | Chat');
            let chat = chatComponent('Global Chat', { flex: true });
            let body = `
                ${headerComponent('OCS Live', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main class="live">${chat}</main>
            `;

            res.send(defaultLayout(head, body));
        });

        router.get('/login', isAuthed, (req, res, next) => {
            return res.redirect('/profile');
        });

        router.get('/profile', isAuthed, (req, res, next) => {
            let head = defaultHead('OCS | Profile');
            let body = `
                ${headerComponent('OCS Live', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main>
                    <h3>Profile Page</h3>
                    <div>
                        <a href="${OCServices.IMP}://${req.hostname}/logout">Logout</a>
                    </div>
                    <h3>Dev/Session Data</h3>
                    <p>Session</p>
                    <pre>${JSON.stringify(session.getOptions()?.session ?? req.session ?? { error: 'No Session' }, null, 2)}</pre>
                    <p>Cookies:</p>
                    <pre>${JSON.stringify(session.getOptions()?.cookies ?? req.cookies ?? { error: 'No Cookies' }, null, 2)}</pre>
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
