import { Pool, QueryResult } from 'pg';
const supabase = require('../secrets/supabase.json');

export const pg = new Pool({
    host: supabase.host,
    user: supabase.user,
    database: supabase.database,
    password: supabase.password,
    port: supabase.port,
    // max: 20,
    // idleTimeoutMillis: 30000,
    // connectionTimeoutMillis: 2000
});
pg.connect();

export const queryDB = (query: string, values: any[]): Promise<Error | QueryResult> => {
    return new Promise((res, rej) => {
        pg.query(query, values, (err, result) => {
            if(err) { rej(err); } res(result);
        });
    });
}

// Hardcoded
export const formatDB = () => {
    let query = `CREATE TABLE IF NOT EXISTS "users" (
        "uuid"          uuid NOT NULL,
        "username"      varchar(32) NOT NULL,
        "created_at"    timestamp DEFAULT NOW(),
        "roles"         bigint DEFAULT 0,
        "status"        bigint DEFAULT 1,
    );`

    // query query
}