import uuid from 'uuid';

import { OCChannel } from "./chat";

// Global - 8 Bytes - Add as needed
export enum Status {
    VALID = 1 << 0,
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
    // 8 Bytes - Add as needed
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
    public getRoles: (int: number) => RoleInterface[];
    public getAllRoles: (user: OCUser, channel_name: string) => RoleInterface[];

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

        this.getAllRoles = (user, channel_name) => {
            let roles = [
                ...RoleSheet.GlobalRoles.getRoles(user.toJSON().roles),
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
    public getUUID;
    public getName;
    public channelDetails;
    public isBanned;
    public isMuted;
    public getRoles;

    public getChatDetails;

    public toString;

    constructor(data: OCUserProps) {
        // If data doesnt include certain fields, return error
        if(!OCUser.validUserObject(data))
            throw new Error("Invalid User Object");

        this.toJSON = () => { return data; }
        this.getUUID = () => { return data.uuid; }
        this.getName = () => { return data.username; }
        this.channelDetails = (channel_name: string) => { return data.channels?.[channel_name]; }
        this.isBanned = (channel_name: string) => { return !!(data.channels?.[channel_name].status & Status.BANNED) }
        this.isMuted = (channel_name: string) => { return !!(data.channels?.[channel_name].status & Status.MUTED) }
        this.getRoles = (channel: OCChannel) => { return channel.getRoleSheet().getAllRoles(this, channel.getName()); }

        this.getChatDetails = () => { return {}; }

        this.toString = () => { return `${this.getName()} (${this.getUUID()})`; }
    }
}