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

const DefaultRoute = new OCRoute({
    domain: 'data.local',
    callback: (router, option, setOption, setSesh, redis, passport) => {
        return router;
    }
});

const server = new OCServer({
    routes: [DefaultRoute],
    port: 8083
});

export default server;