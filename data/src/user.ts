import { QueryResult } from 'pg';
import { generateSelectorAndValidator, hashValidator, daysToTimestamp, OCUser } from 'ocs-type';
import { queryDB } from './data';

// #region Users
export const getFullUser = async (uuid: string): Promise<Error | OCUser> => {
    // Gets all user info from multiple tables
    let query_str = `SELECT users.*,
        to_json(user_connections.*) as connections,
        to_json(channel_connections.*) as channels
        FROM users
        INNER JOIN user_connections ON users.uuid = user_connections.user_id
        INNER JOIN channel_connections on users.uuid = channel_connections.user_id
        WHERE users.uuid = $1
    `;

    let query = await queryDB(query_str, [uuid]);
    return getUserFromResults(query);
}

export const getFullUserFromTwitch = async (twitch_id: string): Promise<Error | OCUser> => {
    let query_str = `SELECT users.*,
        to_json(user_connections.*) as connections,
        to_json(channel_connections.*) as channels
        FROM users
        INNER JOIN user_connections ON users.uuid = user_connections.user_id
        INNER JOIN channel_connections on users.uuid = channel_connections.user_id
        WHERE user_connections.twitch_id = $1
    `;

    let query = await queryDB(query_str, [twitch_id]);
    return getUserFromResults(query);
}

export const getFullUserFromToken = async (token: string) => {
    let token_data = await getTokenFromSelector(token);

    //let query = await queryDB(query_str, )
}

export const createUser = async (user: OCUser) => {
    let query_str = `SELECT 1 FROM users WHERE uuid = $1 OR LOWER(username) = $2`;

    let query = await queryDB(query_str, [user.getUUID(), user.getName().toLowerCase()]);
    if(query instanceof Error)
        return query;

    if(query.rowCount > 0)
        return new Error("Username/UUID already taken. Try again with a different username.");

    // Insert into all tables required for full user data (users, user_connections, channel_connections)
}

const getUserFromResults = (query: Error | QueryResult<any>) => {
    if(query instanceof Error) { return query; }
    let user = new OCUser(query.rows[0], { noError: true });
    return user;
}
// #endregion

// #region User Tokens
export const createUserToken = async (user: OCUser): Promise<Error | string> => {
    let data = generateSelectorAndValidator();
    let hashed_validator = await hashValidator(data.validator);
    if(hashed_validator instanceof Error)
        return hashed_validator;

    let query_str = `INSERT INTO user_tokens (user_id, selector, hashed_validator, expires) 
        VALUES($1, $2, $3, $4)
    `;

    let expires = (daysToTimestamp(7 * 4)/1000);
    let query = await queryDB(query_str, [user.getUUID(), data.selector, hashed_validator, `to_timestamp(${expires})`]);
    if(query instanceof Error)
        return query;

    return `${data.selector}-${data.validator}`;
}

export const getTokenFromSelector = async (token: string): 
    Promise<Error | { user_id: string, expires: string, hashed_validator: string }> => {
    let selector = token.split('-')[0];
    let query_str = `SELECT user_id, hashed_validator, expires FROM user_tokens WHERE selector = $1`;

    let query = await queryDB(query_str, [selector]);
    if(query instanceof Error)
        return query;

    let data = query.rows?.[0];
    if(data === undefined)
        return new Error("No Token Found");

    return {
        user_id: data.user_id,
        expires: data.expires,
        hashed_validator: data.hashed_validator
    }
}
// #endregion