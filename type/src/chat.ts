import WebSocket from 'ws';
import { OCUser, RoleInterface, RoleSheet } from "./user";

export interface OCMessage {
    ChatMessage?: {
        username: string,
        message: string,
        roles: RoleInterface[]
    }
    ServerMessage?: { [key: string]: string },
    ServerEvent?: { [key: string]: string }
}

interface UserConnection { 
    uuid: string, 
    banned: boolean, 
    muted: boolean, 
    sockets: Set<WebSocket.WebSocket>, 
    send: (msg: string) => void 
}

export class OCChannel {
    public getName;
    public getSlug;
    public toString;
    public toJSON;

    public setBannedIP;
    public clearBannedIP;

    public addUserConnection;
    public getUserConnection;
    public deleteUserConnection;

    public addAnonConnection;
    public deleteAnonConnection;

    public broadcast;

    public getMessageList: () => OCMessage[];
    public getRoleSheet: () => RoleSheet;

    private BannedIPs: Set<string>;
    private ModConnections = new Map<string, UserConnection>(); // mods will also be in the user connections list
    private UserConnections = new Map<string, UserConnection>();
    private AnonConnections = new Set<WebSocket.WebSocket>();

    private MessageList;
    private distMessageList: (socket: WebSocket.WebSocket) => void;

    private roles: RoleSheet;

    constructor(props: {
        name: string,
        id: string,
        commands?: any,
        roles?: RoleInterface[]
        bans?: {
            users: any,
            ips: any
        },
        mutes?: any,
        messageQueue?: number
    }) {
        let maxQueueLength = props.messageQueue || 200;
        this.roles = new RoleSheet(props.roles ?? []);
        this.getRoleSheet = () => { return this.roles; }

        this.getName = () => { return props.name }
        this.getSlug = () => { return props.name.toLowerCase() }
        this.toString = () => { return `Channel: ${this.getName()}` }
        this.toJSON = () => { return props; }

        this.BannedIPs = new Set<string>();
        this.setBannedIP = (ip: string) => {
            let count = this.BannedIPs.entries.length;
            if(this.BannedIPs.add(ip).entries.length > count)
                return true;

            return false;
        }

        this.clearBannedIP = (ip: string) => {
            return this.BannedIPs.delete(ip);
        }

        this.addUserConnection = (user: OCUser, socket: WebSocket.WebSocket) => {
            // if mod, add to mod list
            if(this.UserConnections.has(user.getName())) {
                let connections = this.UserConnections.get(user.getName());
                let sockets = connections?.sockets;
                if(sockets instanceof Set) {
                    if(sockets.has(socket))
                        return true;

                    let count = sockets.size;
                    if(sockets.add(socket).size > count) {
                        return true;
                    }
                }

                return false;
            }

            let sockets = new Set<WebSocket.WebSocket>([socket]);
            this.UserConnections.set(user.getName(), {
                uuid: user.getUUID(),
                banned: user.isBanned(this.getName()),
                muted: user.isMuted(this.getName()),
                sockets: sockets,
                send: (msg) => { [...sockets].forEach((socket) => { socket.send(msg); }) }
            });
            return true;
        }

        this.getUserConnection = (user: OCUser) => {
            return this.UserConnections.get(user.getName());
        }

        this.deleteUserConnection = (user: OCUser, socket: WebSocket.WebSocket) => {
            // if mod, remove from mod list
            if(!this.UserConnections.has(user.getName()))
                return true;

            let sockets = this.UserConnections.get(user.getName())?.sockets;
            if(sockets instanceof Set) {
                let deleted = sockets.delete(socket);
                if(sockets.entries.length === 0)
                    this.UserConnections.delete(user.getName());

                return deleted;
            }

            return false;
        }

        this.addAnonConnection = (socket: WebSocket.WebSocket) => {
            if(this.AnonConnections.has(socket))
                return true;

            let count = this.AnonConnections.entries.length;
            if(this.AnonConnections.add(socket).entries.length > count) {
                return true;
            }

            return false;
        }

        this.deleteAnonConnection = (socket: WebSocket.WebSocket) => {
            return this.AnonConnections.delete(socket);
        }

        this.broadcast = (message: OCMessage) => {
            let sockets = [...this.UserConnections.values()];
            sockets.forEach((socket) => { socket.send(JSON.stringify(message)) });
            this.MessageList.push(message);
            if(this.MessageList.length > maxQueueLength)
                this.MessageList.splice(0, this.MessageList.length - maxQueueLength);
        }

        this.MessageList = new Array();
        this.distMessageList = (socket) => {
            console.log("Dist Message Queue");
            socket.send(JSON.stringify({ MessageQueue: this.MessageList }));
        }

        this.getMessageList = () => {
            return this.MessageList;
        }
    }
}