import { OCServer, OCRoute, OCUser } from 'ocs-type';
import { getFullUser, getFullUserFromTwitch, createUser } from './user';
import { pg, queryDB } from './data';

const rootURL = process.env?.rootURL ?? 'ocs.local';

const Whitelist = [
    'app.local',
    'client.local'
];

const DefaultRoute = new OCRoute({
    domain: `data.${rootURL}`,
    callback: (router, server, session) => {
        router.post('/user/create', async (req, res) => {
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

            let output = await createUser(user);
            res.json({ Error: { Code: 404, Message: "TODO" } });
        });

        router.get('/user/twitch/:id', async (req, res) => {
            let user = await getFullUserFromTwitch(req.params.id);
            if(user instanceof Error) { 
                return res.json({ code: 500, message: 'User Error', error: user });
            }

            res.send(JSON.stringify({ code: 200, data: user }));
        });

        router.get('/users', async (req, res) => {
            let result = await pg.query('SELECT * FROM users');
            res.send(JSON.stringify({ code: 200, data: result.rows }));
        });

        router.get('/ping', (req, res) => {
            res.send('pong');
        });

        router.all('*', (req, res) => {
            res.json({ code: 404, message: 'data.ocs.gg catch all' })
        });

        return router;
    }
});

const server = new OCServer({
    routes: [DefaultRoute],
    port: 8083,
    cors: {
        creds: true
    },
    session: {
        domain: `*.${rootURL}`
    }
});

export default server;