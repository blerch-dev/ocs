import { OCServer } from 'ocs-type';

// Custom Express Based JS Renderer/Session Management
// Routes will define layout, import components (add component type to oc-type)
    // Returns html string from domain + path

const server = new OCServer({
    routes: [],
    port: 8080,
    static: ['../public/']
});