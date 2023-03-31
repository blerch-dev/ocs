import { OCServer, OCRoute, OCUser, OCServices } from 'ocs-type';
import { getFullUser, getFullUserFromTwitch, createUser } from './user';
import { pg, queryDB } from './data';

const DefaultRoute = new OCRoute({
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

            res.json({ code: 200, data: { ...output.toJSON() } });
        });

        router.get('/user/twitch/:id', async (req, res) => {
            let user = await getFullUserFromTwitch(req.params.id);
            if(user instanceof Error) { 
                return res.json({ code: 500, message: 'User Error', error: user });
            }

            res.json({ code: 200, data: user });
        });

        router.get('/users', async (req, res) => {
            let result = await pg.query('SELECT * FROM users');
            res.json({ code: 200, data: result.rows });
        });

        router.get('/ping', (req, res) => {
            res.send('pong');
        });

        router.all('*', (req, res) => {
            res.json({ code: 404, message: 'data catch all' });
        });

        return router;
    }
});

const server = new OCServer({
    routes: [DefaultRoute],
    port: 8083,
    cors: {
        creds: true
    }
});

export default server;