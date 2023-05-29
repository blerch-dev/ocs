import path from 'path';
import { OCServer, OCRoute, OCServices } from "ocs-type";
import WSS from "./chat";

// Chat Route
const ChatRoute = new OCRoute({
    domain: `${OCServices.Chat}`,
    callback: (router, server, session) => {
        router.get('/chat', (req, res, next) => {
            // returns chat html, needs to be served from here so that headers are included on connection
            let target_channel = req?.query?.channel as string ?? OCServices.Production ? undefined : 'global';
            let target_title = req?.query?.channel as string ?? OCServices.Production ? undefined : 'Global Chat';
            // get channel info
            res.send(chatWindow('Chat Window', target_title, target_channel, { flex: true, controls: true }));
        });

        router.get('/chat/embed', (req, res) => {
            let target_channel = req?.query?.channel as string ?? undefined;
            // get channel info
            res.send(chatWindow('Chat Window', target_channel, target_channel, { transparent: true, flex: true, controls: false }));
        });

        router.get('/session', (req, res) => {
            res.send(`<pre>${JSON.stringify(req.session, null, 2)}</pre>`);
        });

        return router;
    }
});

const server = new OCServer({
    routes: [ChatRoute],
    port: 8081,
    static: [path.resolve(__dirname, './public/')],
    appFunctions: [WSS],
    session: {
        secure: OCServices.Production ?? true,
        domain: `.${OCServices.RootURL}`,
        sameSite: 'none',
        rolling: true
    },
    cors: {
        creds: true,
        preflightContinue: true
    },
    debug: false
});

export default server;

interface chatOptions {
    embed?: string,
    directLink?: string,
    transparent?: boolean,
    flex?: boolean,
    controls?: boolean
}

const chatWindow = (title: string, chatTitle: string | undefined, channel: string | undefined, options?: chatOptions) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
        <script> var exports = {}; </script>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${title}</title>
            <link rel="stylesheet" href="/css/style.css">
            <script> const CHANNEL_NAME = "${channel}"; </script>
        </head>
        <body ${options?.transparent ?? false ? 'style="background-color: transparent;"' : ''}>
            ${chatComponent(chatTitle, options)}
        </body>
    </html>
    `;
}

const chatComponent = (title: string | undefined, options?: chatOptions) => {
    let cv = 0;
    const getNV = (sv?: number) => { if(sv != undefined) { cv = sv; } return ('0' + cv++).slice(-2) }
    return `
    <div id="OCS-Chat" 
        class="${options?.transparent ?? false ? 'embed-chat' : ''} ${options?.flex ?? false ? 'fill-space' : ''}" 
        data-embed="${options?.embed ?? ''}" 
        data-link="${options?.directLink ?? ''}"
    >
        <header>
            <h4>${title ?? "Chat"}</h4>
            <div class="chat-controls">
                <span tabindex="2${getNV(0)}" id="Chat-Settings"><img style="width: 16px;" src="/assets/settings.svg"></span>
                ${options?.controls === false ? '' : `
                    <span tabindex="2${getNV()}" id="Chat-Popout"><img src="/assets/popout.svg"></span>
                    <span tabindex="2${getNV()}" id="Chat-Close"><img src="/assets/exit.svg"></span>
                `}
            </div>
        </header>
        <span id="InteractList" data-tab="3"></span>
        <main class="no-scrollbar" style="padding: 0px;">
            <div id="OCS-Chat-List" data-tab="4"></div>
            <form id="OCS-Settings" class="hide">
                <h4>Settings Page</h4>
            </form>
        </main>
        <span id="FillList" class="no-scrollbar" data-tab="5"></span>
        <footer style="${options?.controls === false ? 'display: none;' : ''}">
            <input tabindex="6${getNV(0)}" id="OCS-Chat-Input" type="text" placeholder="Message..."/>
            <button tabindex="6${getNV()}" id="OCS-Chat-Send" type="button">Send</button>
        </footer>
        <script type="module" src="/js/chat.js"></script>
    </div>
`};