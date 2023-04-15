import { OCRoute, OCUser, OCServices } from 'ocs-type';
import { getFullUser, getFullUserFromTwitch, createUser, getUserConnection, fullUserTest } from '../user';
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
                return res.json({ Error: output });
        
            res.json({ code: 200, data: output.toJSON() });
        });
        
        router.get('/user/twitch/:id', async (req, res) => {
            let user = await getFullUserFromTwitch(req.params.id);
            if(user instanceof Error) { 
                return res.json({ code: 500, message: 'User Error', error: user });
            }
        
            res.json({ code: 200, data: user.toJSON() });
        });
        
        router.get('/users', async (req, res) => {
            let result = await pg.query('SELECT * FROM users');
            res.json({ code: 200, data: result.rows });
        });
        
        // User Connections
        router.get('/connections/:platform/:id', async (req, res) => {
            let result = await getUserConnection(req.params.platform, req.params.id);
            res.json({ code: 200, data: (result as QueryResult).rows });
        });

        // Tokens
        router.post('/token/create', async (req, res) => {

        });

        router.get('/token/auth', (req, res) => {

        });

        return router;
    }
});

export default UserRoute;