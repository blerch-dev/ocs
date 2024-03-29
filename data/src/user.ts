import { QueryResult } from 'pg';
import { generateSelectorAndValidator, hashValidator, daysToTimestamp, OCUser } from 'ocs-type';
import { queryDB } from './data';

// #region Users
export const getFullUser = async (uuid: string): Promise<Error | OCUser> => {
    let query = await fullUserSearch('WHERE users.uuid = $1', uuid);
    return getUserFromResults(query);
}

export const fullUserTest = async (qstr: string, ...values: any[]) => {
    return await fullUserSearch(qstr, ...values);
}

// This is returning an empty user list, when it shouldnt
// can combine all full user functions with last line being a parameter
export const getFullUserFromTwitch = async (twitch_id: string): Promise<Error | OCUser> => {
    let query = await fullUserSearch('WHERE user_connections.twitch_id = $1', twitch_id);
    return getUserFromResults(query);
}

export const getFullUserFromYoutube = async (youtube_id: string): Promise<Error | OCUser> => {
    let query = await fullUserSearch('WHERE user_connections.youtube_id = $1', youtube_id);
    return getUserFromResults(query);
}

export const getFullUserFromToken = async (token: string): Promise<Error | OCUser> => {
    let token_data = await getUUIDFromSelector(token);
    if(token_data instanceof Error) {
        // add checks for error type
        return token_data;
    }

    return await getFullUser(token_data.user_id);
}

export const createUser = async (user: OCUser, extras?: { [key: string]: any }): Promise<Error | OCUser> => {
    let query_str = `SELECT 1 FROM users WHERE uuid = $1 OR LOWER(username) = $2`;

    let query = await queryDB(query_str, [user.getUUID(), user.getName().toLowerCase()]);
    if(query instanceof Error)
        return query;

    if(query.rowCount > 0)
        return new Error("Username/UUID already taken. Try again with a different username.");

    query_str = `INSERT INTO users (uuid, username, created_at, last_login, roles, status) 
        VALUES ($1, $2, $3, $4, $5, $6)
    `;

    let ts = user.getCreatedAtTimestamp(), r = user.toJSON().roles ?? 0, s = user.toJSON().status ?? 1;
    query = await queryDB(query_str, [user.getUUID(), user.getName(), ts, ts, r, s]);
    if(query instanceof Error) {
        console.log("CreateUser Error 1::", query);
        return query;
    }

    // Insert Optional Data
    if(user.toJSON().connections.twitch || user.toJSON().connections.youtube) {
        let output = await addUserConnection({ 
            user_id: user.getUUID(), 
            created_for: extras?.site, 
            twitch: user.toJSON().connections?.twitch,
            youtube: user.toJSON().connections?.youtube
        });

        if(output instanceof Error) {
            console.log("CreateUser Error 2::", output);
            return output;
        }

        return output;
    }

    return user;
    // Insert into all tables required for full user data (users, user_connections, channel_connections)
}

export const getUserConnection = async (platform: string, id: string) => {
    let query_str = `SELECT * FROM user_connections WHERE ${platform.toLowerCase()}_id = $1`;
    return await queryDB(query_str, [id]);
}

export const addUserConnection = async (data: { 
    user_id: string,
    created_for?: string, 
    twitch?: { id: string, username: string },
    youtube?: { id: string, username: string },
    discord?: { id: string, username: string }
}) => {
    // check if data exists
    let query_str = `INSERT INTO user_connections 
        (user_id, created_for, twitch_id, twitch_name, youtube_id, youtube_name, discord_id, discord_name) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        ON CONFLICT (user_id) 
        DO ${data.twitch != undefined || data.youtube != undefined || data.discord != undefined ? `
            UPDATE SET
            ${data.twitch ? `twitch_id = $3, twitch_name = $4${data.youtube || data.discord ? ',' : ''}` : ''}
            ${data.youtube ? `youtube_id = $5, youtube_name = $6${data.discord ? ',' : ''}` : ''}
            ${data.discord ? `discord_id = $7, discord_name = $8` : ''}
        ` : 'NOTHING;'}
    `;

    await queryDB(query_str, [
        data.user_id, 
        data.created_for ?? null, 
        data.twitch?.id ?? null, 
        data.twitch?.username ?? null,
        data.youtube?.id ?? null,
        data.youtube?.username ?? null,
        data.discord?.id ?? null,
        data.discord?.username ?? null
    ]);

    return await getFullUser(data.user_id);
}

const fullUserSearch = async (qstr: string, ...values: any[]) => {
    // Gets all user info from multiple tables
    let query_str = `SELECT users.*,
        to_json(user_connections.*) as connections,
        to_json(channel_connections.*) as channels
        FROM users
        LEFT JOIN user_connections ON users.uuid = user_connections.user_id
        LEFT JOIN channel_connections on users.uuid = channel_connections.user_id
        ${qstr}
    `;
    
    return await queryDB(query_str, values);
}

const getUserFromResults = (query: Error | QueryResult<any>) => {
    if(query instanceof Error) { return query; }
    let user = new OCUser(query.rows[0], { noError: true });
    return user;
}
// #endregion

// #region User Tokens
export const createUserToken = async (user: OCUser): Promise<Error | string> => {
    return await createTokenRecordForUUID(user.getUUID());
}

export const getUUIDFromSelector = async (token: string): 
    Promise<Error | { user_id: string, expires: string }> => {
    let selector = token.split('-')[0];
    let query_str = `SELECT user_id, hashed_validator, expires FROM user_tokens WHERE selector = $1`;

    let query = await queryDB(query_str, [selector]);
    if(query instanceof Error)
        return query;

    let data = query.rows?.[0];
    if(data === undefined)
        return new Error("No Token Found");

    let hashed_token = await hashValidator(token.split('-')[1]);
    if(hashed_token instanceof Error)
        return hashed_token;

    if(hashed_token === data.hashed_validator) {
        return {
            user_id: data.user_id,
            expires: data.expires
        }
    } else {
        return new Error("Invalid Token");
    }
}

export const refreshTokenForUser = async (uuid: string): Promise<Error | string> => {
    let result = await deleteTokenForUser(uuid);
    if(result instanceof Error)
        return result;

    return await createTokenRecordForUUID(uuid);
}

export const deleteTokenForUser = async (uuid: string): Promise<Error | boolean> => {
    let query_str = `DELETE FROM user_tokens WHERE user_id = $1`;
    let query = await queryDB(query_str, [uuid]);
    if(query instanceof Error)
        return query;

    return true;
}

const createTokenRecordForUUID = async (uuid: string, expires = 7 * 4) => {
    let data = generateSelectorAndValidator();
    let hashed_validator = await hashValidator(data.validator);
    if(hashed_validator instanceof Error)
        return hashed_validator;

    let query_str = `INSERT INTO user_tokens (user_id, selector, hashed_validator, expires) 
        VALUES ($1, $2, $3, $4)
    `;

    // let eto = (daysToTimestamp(expires)/1000); // `to_timestamp('${eto}', 'YYYY/MM/DD HH24:MI:SS')`
    let timestamp = new Date(daysToTimestamp(expires)).toUTCString();
    let args = [uuid, data.selector, hashed_validator, timestamp];
    let query = await queryDB(query_str, args);
    if(query instanceof Error)
        return query;

    return `${data.selector}-${data.validator}`;
}
// #endregion