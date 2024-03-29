import { OCServer, OCRoute, OCServices, OCServerType, OCPlatform } from 'ocs-type';
import { PlatformManager, StreamManager } from './streams';
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
            res.json(await StreamManager.isLive(req.params.channel_id));
        });

        // same broad check above might be wanted
        router.get('/channel/subscriber/:platform/:id', async (req, res) => {
            // check if certain id on certain platform is subbed (paid version per platform)
            // platforms: ocs, twitch, youtube
        });

        // Twitch Event Listener - Needs Public SSl Server
        router.get('/ingress/twitch/event', StreamManager.getTwitchEventCallback);

        return router;
    }
});

const server = new OCServer({
    routes: [DefaultRoute],
    type: OCServerType.State,
    port: 8084,
    cors: {
        creds: true
    }
});

export default server;