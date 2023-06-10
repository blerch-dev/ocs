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

const UserRoute = new OCRoute({
    domain: `${OCServices.Data}`,
    callback: (router, server, session) => {
        router.post('/user/create', async (req, res) => {
            const { user_data, extras } = req.body;
            let user = new OCUser(user_data, { noError: true });
            if(user instanceof Error) {
                return res.json({
                    Error: {
                        Code: 401,
                        Message: "Invalid user object"
                    }
                });
            }
        
            let output = await createUser(user, extras);
            if(output instanceof Error)
                return res.json({ Error: output.message });
        
            res.json({ code: 200, data: output.toJSON() });
        });

        router.post('/user/update', async (req, res) => {
            const { user_data, connections, created_for = undefined } = req.body;
            // Update Base User Table Info
            // Update Channel Connections Table Info
            // Update User Connections Table Info
            let output = await addUserConnection({
                user_id: user_data.uuid,
                created_for: created_for ?? user_data.created_for,
                twitch: connections.twitch,
                youtube: connections.youtube,
                discord: connections.discord
            });

            if(output instanceof Error)
                return res.json({ Error: output });

            res.json({ code: 200, data: output.toJSON() });
        });
        
        router.get('/user/twitch/:id', async (req, res) => {
            let user = await getFullUserFromTwitch(req.params.id);
            if(user instanceof Error) { 
                return res.json({ Error: user.message });
            }
        
            res.json({ code: 200, data: user.toJSON() });
        });

        router.get('/user/youtube/:id', async (req, res) => {
            let user = await getFullUserFromYoutube(req.params.id);
            if(user instanceof Error) {
                return res.json({ Error: user.message });
            }

            res.json({ code: 200, data: user.toJSON() });
        });
        
        router.get('/users', async (req, res) => {
            let result = await pg.query('SELECT * FROM users');
            res.json({ code: 200, data: result.rows });
        });

        // Channel Roles
        router.post('/user/:id/channel/:channel_id/role/:role', async (req, res) => {
            // const { user_data } = req.body;
            return res.json({ msg: 'todo' });
        });

        router.post('/user/:idchannel/:id/status/:status', async (req, res) => {
            const { user_data } = req.body;
            return res.json({ msg: 'todo' });
        });

        // User Connections
        router.get('/user/:id/connections/:platform/:id', async (req, res) => {
            let result = await getUserConnection(req.params.platform, req.params.id);
            res.json({ code: 200, data: (result as QueryResult).rows });
        });

        // Tokens
        router.post('/token/create', async (req, res) => {
            // sends user, returns cookie assignable value
            const { user_data } = req.body;
            let user = new OCUser(user_data, { noError: true });
            if(user instanceof Error) {
                return res.json({
                    Error: {
                        Code: 401,
                        Message: "Invalid user object"
                    }
                });
            }

            let token = await createUserToken(user);
            if(token instanceof Error) {
                return res.json({
                    Error: {
                        Code: 500,
                        Message: "Failed to create token."
                    }
                })
            }

            return res.json({
                token: token
            });
        });

        router.post('/token/auth', async (req, res) => {
            const { token } = req.body;
            console.log("Authing Token:", token);
            let token_data = await getUUIDFromSelector(token);
            if(token_data instanceof Error) {
                // Could be invalid token or server error
                console.log(token_data);
                return res.json({
                    Error: {
                        Code: 500,
                        Message: "Failed to auth token."
                    }
                });
            }

            let json: { token?: string, user?: any } = {};
            let renew = (new Date(token_data.expires)).getTime() - Date.now();
            let two_weeks = 1000 * 60 * 60 * 24 * 7 * 2;
            if(renew < two_weeks) {
                console.log("Refreshing:", renew, '<', two_weeks);
                let str = await refreshTokenForUser(token_data.user_id);
                json.token = typeof(str) === 'string' ? str : undefined;
            }

            let user = await getFullUser(token_data.user_id);
            if(user instanceof Error) {
                return res.json({
                    Error: {
                        Code: 500,
                        Message: "Failed to find user for token."
                    }
                });
            } else {
                json.user = user.toJSON();
            }

            return res.json(json);
        });

        router.get(['/token/delete/user/:id', '/token/delete/uuid/:id'], async (req, res) => {
            if(req.params.id === 'ignore_request')
                return res.json({ Okay: true, Deleted: false });

            let result = await deleteTokenForUser(req.params.id);
            if(result instanceof Error)
                return res.json({ Error: { Code: 500, Message: "Failed to delete token from database." } });

            return res.json({ Okay: true, Deleted: true });
        });

        return router;
    }
});

export default UserRoute;