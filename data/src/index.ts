import { OCServer, OCRoute } from 'ocs-type';
import { Pool } from 'pg';
const supabase = require('../secrets/supabase.json');

const pg = new Pool({
    host: supabase.host,
    user: supabase.user,
    database: supabase.database,
    password: supabase.password,
    port: supabase.port,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});
pg.connect();

const Whitelist = [
    'app.local',
    'client.local',
    'chat.local',
    'auth.local'
];

const DefaultRoute = new OCRoute({
    domain: 'data.local',
    callback: (router, option, setOption, setSesh, redis, passport) => {

        router.get('/users', async (req, res) => {
            let result = await pg.query('SELECT * FROM users');
            res.send(JSON.stringify({ code: 200, data: result.rows }));
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
        creds: true,
        origin: (origin, callback) => {
            if(!origin || Whitelist.indexOf(origin) !== -1) callback(null, true);
            else callback(new Error('Not allowed by CORS'));
        }
    },
    debug: true,
    noSession: true,
    noPassport: true
});

export default server;