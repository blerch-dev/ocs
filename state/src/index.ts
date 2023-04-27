import { OCServer, OCRoute, OCAuth, OCServices } from 'ocs-type';
import { Streams } from './streams';
// Some form of user oauth access for syncing subs is required

const DefaultRoute = new OCRoute({
    domain: `${OCServices.State}`,
    callback: (router, server, session) => {
        // User OCAuth for Twitch App Access
        router.get('/app/status/live', async (req, res) => {
            // get all channels live status
        });

        // Might want broad status path for all pieces of info
        router.get('/channel/status/live/:channel_id', async (req, res) => {
            res.json(await Streams.isLive(req.params.channel_id));
        });

        // same broad check above might be wanted
        router.get('/channel/subscriber/:platform/:id', async (req, res) => {
            // check if certain id on certain platform is subbed (paid version per platform)
            // platforms: ocs, twitch, youtube
        });

        // Twitch Event Listener
        router.get('/ingress/twitch/event', Streams.getTwitchEventCallback);

        return router;
    }
});

const server = new OCServer({
    routes: [DefaultRoute],
    port: 8084,
    cors: {
        creds: true
    }
});

export default server;