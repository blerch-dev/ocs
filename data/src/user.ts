import { OCUser } from 'ocs-type';
import { queryDB } from './data';

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
    if(query instanceof Error) { return query; }
    let user = new OCUser(query.rows[0], { noError: true });
    return user;
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
    if(query instanceof Error) { return query }
    let user = new OCUser(query.rows[0], { noError: true });
    return user;
}

export const createUser = async (user: OCUser) => {
    let query_str = `
        WITH one as (
            INSERT INTO users()
        )
    `;
}