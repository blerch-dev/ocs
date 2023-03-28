import { Pool, QueryResult } from 'pg';
import {} from 'ocs-type';

import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

export const pg = new Pool({
    host: process.env.SUPABASE_HOST,
    user: process.env.SUPABASE_USER,
    database: process.env.SUPABASE_DATA,
    password: process.env.SUPABASE_PASS,
    port: Number(process.env.SUPABASE_PORT),
    // max: 20,
    // idleTimeoutMillis: 30000,
    // connectionTimeoutMillis: 2000
});
pg.connect().catch((reason) => { console.log("DB Connection -", reason); });

export const queryDB = (query: string, values: any[]): Promise<Error | QueryResult> => {
    return new Promise((res, rej) => {
        pg.query(query, values, (err, result) => {
            if(err) { return rej(err); } res(result);
        });
    });
}

// Hardcoded
export const formatDB = () => {
    let query = `
    CREATE TABLE IF NOT EXISTS "users" (
        "uuid"          uuid NOT NULL,
        "username"      varchar(32) NOT NULL,
        "created_at"    timestamp NOT NULL DEFAULT NOW(),
        "last_login"    timestamp NOT NULL DEFAULT NOW(),
        "roles"         bigint NOT NULL DEFAULT 0,
        "status"        smallint NOT NULL DEFAULT 1,
        PRIMARY KEY ("uuid")
    );

    CREATE TABLE IF NOT EXISTS "user_connections" (
        "user_id"       uuid NOT NULL,
        "created_for"   varchar(256),
        "twitch_id"     varchar(64),
        "twitch_name"   varchar(32)
    );

    CREATE TABLE IF NOT EXISTS "user_tokens" (
        "user_id"               uuid NOT NULL,
        "selector"              varchar(12) NOT NULL,
        "hashed_validator"      varchar(64) NOT NULL,
        "expires"               timestamp NOT NULL,
        PRIMARY KEY ("selector")
    );
    
    CREATE TABLE IF NOT EXISTS "channels" (
        "uuid"          uuid NOT NULL,
        "slug"          varchar(32) NOT NULL,
        "name"          varchar(32),
        "domain"        varchar(256),
        "icon"          varchar(256),
        "twitch_id"     varchar(64),
        "youtube_id"    varchar(64),
        PRIMARY KEY ("uuid")
    );

    CREATE TABLE IF NOT EXISTS "channel_connections" (
        "channel_id"    uuid NOT NULL,
        "user_id"       uuid NOT NULL,
        "roles"         bigint DEFAULT 0,
        "status"        smallint DEFAULT 1
    );
    `;

    return new Promise((res, rej) => {
        pg.query(query, (err, results) => {
            if(err) { return rej(err); } res(results);
        });
    });
}

export const alterDB = async () => {
    let query = `ALTER TABLE channels ADD COLUMN twitch_id varchar(64), ADD COLUMN youtube_id varchar(64)`;

    return new Promise((res, rej) => {
        pg.query(query, (err, results) => {
            if(err) { return rej(err); } res(results);
        });
    });
}