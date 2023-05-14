import { v4 as uuidv4 } from 'uuid';

import { OCChannel } from "./chat";

// Global - 8 Bytes - Add as needed
export enum Status {
    VALID = 1 << 0, // also works as "follows" per channel
    BANNED = 1 << 1,
    MUTED = 1 << 2
}

export interface RoleInterface {
    name: string,
    icon: string,
    value: number,
    color: string
}

// Global | Role Class Initalizer
let configGlobalRoles: () => RoleInterface[] = () => {
    let nameToURL = (str: string) => { return str.toLowerCase().replace(' ', '-'); }
    let valToRI = (val: number, str: string, hex: string = "#ffffff") => {
        return { name: str, icon: `/assets/badges/${nameToURL(str)}.svg`, value: val, color: hex };
    }

    let map = new Map<number, RoleInterface>();
    // 8 Bytes - Add as needed - Top Roles get colors, after streamer you just get an icon
    let roles = [
        valToRI(1 << 0, 'Admin', '#ff5c00'),
        valToRI(1 << 1, 'Dev', '#00ff00'),
        valToRI(1 << 2, 'Mod', '#ffff00'),
        valToRI(1 << 3, 'Streamer', "#ff0000")
    ];
    return roles;
}

// Channel Based - 8 Bytes - Channel Owner Set
export class RoleSheet {
    static GlobalRoles = new RoleSheet(configGlobalRoles());
    static IsAdmin: (user: OCUser) => boolean = (user) => {
        let roles = RoleSheet.GlobalRoles.GetRoleValues();
        return !!(user.getRoleValue() & (roles.Admin));
    }
    static IsDev: (user: OCUser) => boolean = (user) => {
        let roles = RoleSheet.GlobalRoles.GetRoleValues();
        return !!(user.getRoleValue() & (roles.Admin + roles.Dev));
    }
    static IsMod: (user: OCUser) => boolean = (user) => {
        let roles = RoleSheet.GlobalRoles.GetRoleValues();
        return !!(user.getRoleValue() & (roles.Admin + roles.Dev + roles.Mod));
    }

    public getRoles: (int: number) => RoleInterface[];
    public getAllRoles: (user: OCUser, channel_name: string) => RoleInterface[];
    public GetRoleValues: () => {[key: string]: number};

    // Internal Enum
    private RoleField: Map<number, RoleInterface>
    private setRoles: (roles: RoleInterface[]) => void;

    constructor(roles: RoleInterface[]) {
        this.RoleField = new Map();
        this.setRoles = (roles) => roles.forEach((r) => this.RoleField.set(r.value, r));
        this.getRoles = (int) => {
            let roles = [], fields = [...this.RoleField.entries()];
            for(let i = 0; i < fields.length; i++) {
                if(fields[i][0] & int)
                    roles.push(fields[i][1]);
            }

            return roles;
        };
        this.GetRoleValues = () => {
            let obj: {[key: string]: number} = {};
            [...this.RoleField.entries()].map((ent) => { obj[ent[1].name] = ent[1].value });
            return obj;
        }

        this.getAllRoles = (user, channel_name) => {
            let roles = [
                ...RoleSheet.GlobalRoles.getRoles(user.toJSON()?.roles ?? 0),
                ...this.getRoles(user.channelDetails(channel_name)?.roles ?? 0)
            ]

            return roles;
        }

        this.setRoles(roles);
    }
}

interface OCUserProps {
    uuid: string,
    username: string,
    roles?: number | string,
    status?: number,
    created_at?: string | number,

    connections: {
        twitch?: {
            id: string,
            username: string
        },
        youtube?: {
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
    public static validUserObject = (data: OCUserProps, debug = false) => {
        let required_keys = ['uuid', 'username'];
        for(let i = 0; i < required_keys.length; i++) {
            let key = required_keys[i];
            if((data as any)?.[key] == undefined) {
                if(debug) { console.log(key, (data as any)[key]) }
                return false;
            }
        }

        return true;
    };

    public static generateId = () => { return uuidv4(); }

    public validUserObject;
    public toJSON;
    public getUUID;
    public getName;
    public channelDetails;
    public isBanned;
    public isMuted;
    public getRoleValue;
    public getRoles;

    public getCreatedAtTimestamp;

    public getChatDetails;

    public toString;

    constructor(user_data: OCUserProps, options?: { noError?: boolean, debug?: boolean }) {
        if(options?.debug) { console.log("User Debug", user_data) }

        // If data doesnt include certain fields, return error
        if(!OCUser.validUserObject(user_data)) {
            if(options?.noError !== true)
                throw new Error(`Invalid User Object`);

            this.validUserObject = (debug?: boolean) => { 
                if(debug) { return OCUser.validUserObject(user_data, debug); } return false
            };
        } else {
            this.validUserObject = (debug?: boolean) => { 
                if(debug) { return OCUser.validUserObject(user_data, debug); } return true
            };
        }

        let udc = user_data?.connections as any;
        const data = {
            uuid: user_data?.uuid,
            username: user_data?.username,
            roles: Number(user_data?.roles) ?? 0,
            status: user_data?.status ?? 0,
            created_at: user_data?.created_at ?? Date.now(),
            connections: {
                creation: udc?.created_for,
                twitch: udc?.twitch ? udc.twitch : udc?.twitch_id ? {
                    id: udc.twitch_id,
                    username: udc.twitch_name
                } : undefined,
                youtube: udc?.youtube ? udc.youtube : udc?.youtube_id ? {
                    id: udc.youtube_id,
                    username: udc.youtube_name
                } : undefined
            },
            channels: user_data?.channels
        }

        /**/

        this.toJSON = () => { return data; }
        this.getUUID = () => { return data.uuid; }
        this.getName = () => { return data.username; }
        this.channelDetails = (channel_name: string) => { return data.channels?.[channel_name]; }
        this.isBanned = (channel_name: string) => { return !!(data.channels?.[channel_name].status & Status.BANNED) }
        this.isMuted = (channel_name: string) => { return !!(data.channels?.[channel_name].status & Status.MUTED) }
        this.getRoleValue = () => { return data.roles }
        this.getRoles = (channel?: OCChannel) => {
            if(channel instanceof OCChannel)
                return channel.getRoleSheet().getAllRoles(this, channel.getName());

            return RoleSheet.GlobalRoles.getRoles(data.roles);
        }

        this.getCreatedAtTimestamp = () => {
            if(typeof(data.created_at) === 'string')
                return data.created_at;

            if(typeof(data.created_at) === 'number')
                return new Date(data.created_at).toISOString();

            return undefined;
        }

        this.getChatDetails = () => { return {}; }

        this.toString = () => { return `${this.getName()} (${this.getUUID()})`; }
    }
}