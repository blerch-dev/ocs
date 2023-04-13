// Default Layout/Route for ocs.gg
import { OCRoute, OCServices } from "ocs-type";
import { defaultLayout, defaultHead, embedComponent, chatComponent, headerComponent } from "../components";

const DevRoute = new OCRoute({
    domain: '[\\s\\S]*',
    callback: (router, server, session) => {
        // NEEDS USER ROLE / PASSWORD FILTER HERE
        router.get('/env', (req, res) => {
            let head = defaultHead('OCS | Dev');
            let body = `
                ${headerComponent('OCS Dev', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main class="dev"><pre>${JSON.stringify(process.env, null, 2)}</pre></main>
            `;

            res.send(defaultLayout(head, body));
        });

        router.get('/users', async (req, res) => {
            try {
                let json = await (await fetch(OCServices.Data)).json();
                console.log(json);
                res.json(json);
            } catch(err) {
                res.send(err);
            }
        });

        router.get('/services', (req, res) => {
            res.json({ ...OCServices });
        });

        router.get('/test', (req, res) => {
            res.json({ test: true });
        });

        return router;
    }
});

export default DevRoute;