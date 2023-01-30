// Default Layout/Route for ocs.gg
import { OCRoute } from "ocs-type";
import { defaultLayout, defaultHead, embedComponent, chatComponent, headerComponent } from "../components";

const DefaultRoute = new OCRoute({
    domain: '[\\s\\S]*',
    callback: (router, options, setOption) => {
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
