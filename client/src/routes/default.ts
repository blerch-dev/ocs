// Default Layout/Route for ocs.gg
import { OCRoute, OCRequest } from "ocs-type";
import { defaultLayout } from "../components/layout";

const DefaultRoute = new OCRoute({
    domain: '[\\s\\S]*',
    callback: (router, options, setOption) => {
        router.get('*', (req, res, next) => {
            let head = `<title>Test Layout</title>`
            let body = `
            <header>
                <h1>Test Header</h1>
            </header>
            <main>
                <h3>Test Page</h3>
            </main>
            <style>
                * {
                    margin: 0px;
                    box-sizing: border-box;
                    position: relative;
                    color: white;
                }

                body {
                    display: flex;
                    flex-direction: column;
                    background-color: #111111;
                    min-height: 100vh;
                }

                header {
                    height: 30px;
                    background-color: #ffffff44;
                }

                main {
                    flex: 1;
                }
            </style>
            `;

            res.send(defaultLayout(head, body)).end();
        });

        return router;
    }
});

export default DefaultRoute;
