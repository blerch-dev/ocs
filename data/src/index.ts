import { OCServer, OCRoute, OCUser } from 'ocs-type';
import { Pool, QueryResult } from 'pg';
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

const queryDB = (query: string, values: any[]): Promise<Error | QueryResult> => {
    return new Promise((res, rej) => {
        pg.query(query, values, (err, result) => {
            if(err) { rej(err); } res(result);
        });
    });
}

const getFullUser = async (uuid: string): Promise<Error | OCUser> => {
    // Gets all user info from multiple tables
    let json_qs = `SELECT users.*,
        to_json(user_connections.*) as user_connections,
        to_json(channel_roles.*) as channel_roles
        FROM users
        INNER JOIN user_connections ON users.uuid = user_connections.uuid
        INNER JOIN channel_roles on users.uuid = channel_roles.uuid
        WHERE users.uuid = $1
    `;

    /* json_build_object(
        'user_connections', user_connections.*,
        'channel_roles', channel_roles.*
    ) as user_data */
    //(SELECT * FROM user_connections WHERE users.uuid = user_connections.uuid),
    //(SELECT * FROM channel_roles WHERE users.uuid = channel_roles.uuid)

    let query_str = 'SELECT * FROM users ur ';
    query_str += 'FULL JOIN user_connections uc ON ur.uuid = uc.uuid ';
    query_str += 'FULL JOIN channel_roles cr ON ur.uuid = cr.uuid ';
    query_str += 'WHERE ur.uuid = $1';

    let query = await queryDB(json_qs, [uuid]);
    if(query instanceof Error) { return query; }
    let user = new OCUser(query.rows[0]);
    return user;
}

const DefaultRoute = new OCRoute({
    domain: 'data.local',
    callback: (router, option, setOption, setSesh, redis, passport) => {

        router.get('/user/twitch/:id', async (req, res) => {
            let result = await queryDB('SELECT uuid FROM user_connections WHERE twitch_id = $1', [req.params.id]);
            if(result instanceof Error) { 
                console.log(result); 
                return res.json({ code: 500, message: 'Server Error', error: result }); 
            } else if(result.rows.length > 1) { 
                console.log(`Multiple Users Detected for Twitch ID: ${req.params.id}`); 
            }

            let user = await getFullUser(result.rows[0].uuid);
            if(user instanceof Error) { 
                return res.json({ code: 500, message: 'User Error', error: user }); 
            }
            console.log("Full User Data:", user.fullUserData());

            res.send(JSON.stringify({ code: 200, data: user.toJSON() }));
        });

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