import path from 'path';
import { OCServer } from 'ocs-type';

// Custom Express Based JS Renderer/Session Management
// Routes will define layout, import components (add component type to oc-type)
    // Returns html string from domain + path

import DevRoute from './routes/dev';
import DefaultRoute from './routes/default';

const server = new OCServer({
    routes: [DevRoute, DefaultRoute],
    port: 8080,
    static: [path.resolve(__dirname, './public/')],
    session: {}
});

export default server;