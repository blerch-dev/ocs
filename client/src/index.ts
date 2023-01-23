import { OCServer, OCRequest, OCProps } from 'ocs-type';

// Custom Express Based JS Renderer/Session Management

const server = new OCServer({
    handle: () => {},
    port: 8080,
    static: ['../public/']
});