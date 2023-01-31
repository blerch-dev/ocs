// Default Layout/Route for ocs.gg
import { OCRoute } from "ocs-type";
import { defaultLayout, defaultHead, embedComponent, chatComponent, headerComponent } from "../components";

const DefaultRoute = new OCRoute({
    domain: '[\\s\\S]*',
    callback: (router, options, setOption, setSesh) => {
        const setSessionData = (obj: string, key: string, value: any) => {
            if(setSesh != undefined) setSesh(obj, key, value);
        }

        router.get('/chat', (req, res, next) => {
            let head = defaultHead('OCS - Chat');
            let embed = embedComponent();
            let chat = chatComponent('Global Chat');
            let body = `
                ${headerComponent('OCS Live', undefined, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main class="live">${embed}${chat}</main>
            `;

            res.send(defaultLayout(head, body));
        });

        router.post('/username', (req, res, next) => {
            //console.log(req.body);
            setSessionData('user', 'username', req.body.username);
            res.status(200).end();
        });

        router.get('/username', (req, res, next) => {
            let head = defaultHead('OCS');
            let body = `
                ${headerComponent('OCS Live', undefined, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main>
                    <form action="/username" method="post">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username">
                        <input type="submit" value="Submit">
                    </form>
                </main>
            `;
            res.send(defaultLayout(head, body));
        });

        router.get('/', (req, res, next) => {
            let head = defaultHead('OCS');
            let body = `
                ${headerComponent('OCS Live', undefined, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main>
                    <h3>Home Page</h3>
                    <p>Session</p>
                    <pre>${JSON.stringify(options?.session ?? { error: 'No Session' }, null, 2)}</pre>
                    <p>Cookies:</p>
                    <pre>${options?.cookies ?? 'No Cookies'}</pre>
                    <style>
                        pre {
                            margin-bottom: 10px;
                        }
                    </style>
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
