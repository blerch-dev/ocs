import { OCServer, OCRoute, OCAuth } from 'ocs-type';
import { Streams } from './streams';
// Some form of user oauth access for syncing subs is required

const rootURL = process.env?.rootURL ?? 'ocs.local';

const Whitelist = [
    'app.local',
    'client.local'
];

const DefaultRoute = new OCRoute({
    domain: `state.${rootURL}`,
    callback: (router, server, session) => {
        // User OCAuth for Twitch App Access

        router.get('/status/live/:channel_id', async (req, res) => {
            res.json(await Streams.isLive(req.params.channel_id));
        });

        return router;
    }
});

const server = new OCServer({
    routes: [DefaultRoute],
    port: 8084,
    cors: {
        creds: true
    },
    session: {
        domain: `*.${rootURL}`
    }
});

export default server;