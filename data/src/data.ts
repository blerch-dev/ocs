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