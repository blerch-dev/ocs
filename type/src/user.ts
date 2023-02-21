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
    }
}

export class OCUser {
    public toJSON;
    public getName;

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
        if(typeof(data) !== 'object')
            throw new Error("Invalid User Object");

        console.log(data);
        let required_keys = ['uuid', 'username', 'roles', 'status'];
        required_keys.forEach(key => {
            console.log(key);
            if((data as any)[key] === undefined)
                throw new Error("Invalid User Object");
        });

        this.toJSON = () => { return data; }
        this.getName = () => { return data.username };
    }
}