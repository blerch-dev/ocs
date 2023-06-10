import { OCRoute, OCUser, OCServices, daysToTimestamp } from 'ocs-type';
import { 
    getFullUser, 
    getFullUserFromTwitch, 
    getFullUserFromYoutube,
    createUser, 
    getUserConnection, 
    addUserConnection,
    fullUserTest, 
    createUserToken, 
    getUUIDFromSelector, 
    refreshTokenForUser, 
    deleteTokenForUser 
} from '../user';
import { pg, queryDB } from '../data';
import { QueryResult } from 'pg';

const ChannelRoute = new OCRoute({
    domain: `${OCServices.Data}`,
    callback: (router, server, session) => {
        router.get('/channels', async (req, res) => {
            console.log("Retrurning Channels...");

            //let result = await pg.query('SELECT * FROM channels');
            //res.json({ code: 200, data: result.rows });
            res.json({
                code: 200,
                data: [
                    { twitch_id: 736270650, name: 'KidNotkin', slug: 'kidnotkin' }
                ]
            })
        });

        return router;
    }
});

export default ChannelRoute;