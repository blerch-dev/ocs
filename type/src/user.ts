// Global - 8 Bytes - Add as needed
export enum Status {
    VALID = 1 << 0,
    BANNED = 1 << 1,
    MUTED = 1 << 2
}

// Global - 8 Bytes - Add as needed | Converint 
export enum GlobalRoles {
    ADMIN = 1 << 0,
    MOD = 1 << 2,
    STREAMER = 1 << 3
}

// Channel Based - 8 Bytes - Channel Owner Set
class Roles {
    static GlobalRoles = new Map<number, {}>()
    // Manages Internal Enum
    constructor(roles: string[]) {
        roles = roles.slice(0, 64);
        
    }
}

interface OCUserProps {
    uuid: string,
    username: string,
    roles: number,
    created_at: string,
    email: string,
    status: number,
    user_connections?: {
        uuid: string,
        id: string,
        username: string
    },
    channel_roles?: {
        uuid: string,
        channel_id: string,
        roles: number
    },

    connections: {
        twitch?: {
            id: string,
            username: string
        }
    },
    channels: {
        [channel_name: string]: {
            id: string,
            roles: number,
            status: number
        }
    }
}

export class OCUser {
    public static validUserObject = (data: object) => {
        if(typeof(data) !== 'object')
            return false;

        let required_keys = ['uuid', 'username', 'roles', 'status'];
        required_keys.forEach(key => {
            if((data as any)[key] === undefined)
                return false;
        });
        return true;
    };

    public toJSON;
    public getName;
    public channelDetails;
    public isBanned;
    public isMuted;

    constructor(data: OCUserProps) {
        // const UserData = {
        //     uuid: data.uuid,
        //     username: data.username,
        //     roles: data.roles,
        //     status: data.status,
        //     created_at: data.created_at,
        //     email: data.email,
        //     twitch: data.twitch
        // }

        // If data doesnt include certain fields, return error
        if(!OCUser.validUserObject(data))
            throw new Error("Invalid User Object");

        this.toJSON = () => { return data; }
        this.getName = () => { return data.username; }
        this.channelDetails = (channel_name: string) => { return data.channels?.[channel_name]; }
        this.isBanned = (channel_name: string) => { return !!(data.channels?.[channel_name].status & Status.BANNED) }
        this.isMuted = (channel_name: string) => { return !!(data.channels?.[channel_name].status & Status.MUTED) }
    }
}