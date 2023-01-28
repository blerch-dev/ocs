// Default Layout/Route for ocs.gg
import { OCRoute, OCRequest } from "ocs-type";
import { defaultLayout, defaultHead, embedComponent, chatComponent } from "../components/layout";

const DefaultRoute = new OCRoute({
    domain: '[\\s\\S]*',
    callback: (router, options, setOption) => {
        router.get('/chat', (req, res, next) => {
            let head = defaultHead('OCS - Chat');
            let embed = embedComponent();
            let chat = chatComponent('Global Chat');
            let body = `
                <header>
                    <h2>Test Header</h2>
                </header>
                <main class="live">${embed}${chat}</main>
            `;

            res.send(defaultLayout(head, body)).end();
        });

        router.get('/', (req, res, next) => {
            let head = defaultHead('OCS');
            let body = `
                <header>
                    <h2>Test Header</h2>
                </header>
                <main>
                    <h3>Test Page</h3>
                </main>
            `;

            res.send(defaultLayout(head, body)).end();
        });

        return router;
    }
});

export default DefaultRoute;
