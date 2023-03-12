import { QueryResult } from 'pg';
import { OCUser } from 'ocs-type';
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

export const createUser = async (user: OCUser, extras?: { [key: string]: any }) => {
    let query_str = `
        WITH one as (
            INSERT INTO users()
        )
    `;
}

const getUserFromResults = (query: Error | QueryResult<any>) => {
    if(query instanceof Error) { return query; }
    let user = new OCUser(query.rows[0], { noError: true });
    return user;
}
// #endregion

// #region User Tokens
export const createUserToken = async () => {
    // selector(12 charcters)-validator(64 characters)
    // returns selector(12 charcters)-hashed_validator(64 characters)
}

export const getTokenFromSelector = async (token: string) => {
    // return uuid/hashed_validator/exp
    let selector = token.split('-')[0];
    let query_str = `SELECT user_id, hashed_validator, expires FROM user_tokens WHERE selector = $1`;

    let query = queryDB(query_str, [selector]);
}

export const hashValidater = async () => {

}
// #endregion