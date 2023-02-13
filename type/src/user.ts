interface OCUserProps {
    uuid: string,
    username: string,
    roles: number,
    created_at: string,
    email: string,
    status: number,
    twitch: {
        id: string,
        username: string
    }
}

export class OCUser {
    public toJSON;

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

        this.toJSON = () => { return data; }
    }
}