import WebSocket from 'ws';
import { OCUser } from "./user";

export interface OCMessage {
    value: string;
}

export class OCChannel {
    public getName;

    public setBannedIP;
    public clearBannedIP;

    public addUserConnection;
    public getUserConnection;
    public deleteUserConnection;

    public addAnonConnection;
    public deleteAnonConnection;

    public broadcast;

    private BannedIPs: Set<string>;
    private UserConnections = new Map<string, { banned: boolean, muted: boolean, sockets: Set<WebSocket.WebSocket>, send: (msg: string) => void }>();
    private AnonConnections = new Set<WebSocket.WebSocket>();

    constructor(props: {
        name: string,
        id: string,
        commands?: any,
        bans?: {
            users: any,
            ips: any
        },
        mutes?: any
    }) {
        this.getName = () => { return props.name }

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
            if(this.UserConnections.has(user.getName())) {
                let sockets = this.UserConnections.get(user.getName());
                if(sockets instanceof Set) {
                    sockets.add(socket);
                    return true;
                }

                return false;
            }

            let sockets = new Set<WebSocket.WebSocket>([socket]);
            this.UserConnections.set(user.getName(), {
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
            if(!this.UserConnections.has(user.getName()))
                return true;

            let sockets = this.UserConnections.get(user.getName());
            if(sockets instanceof Set) {
                sockets.delete(socket);
                if(sockets.entries.length === 0)
                    this.UserConnections.delete(user.getName());

                return true;
            }

            return false;
        }

        this.addAnonConnection = (socket: WebSocket.WebSocket) => {
            let count = this.AnonConnections.entries.length;
            if(this.AnonConnections.add(socket).entries.length > count)
                return true;

            return false;
        }

        this.deleteAnonConnection = (socket: WebSocket.WebSocket) => {
            return this.AnonConnections.delete(socket);
        }

        this.broadcast = (message: { username: string, message: string }) => {
            let sockets = [...this.UserConnections.values()];
            sockets.forEach((socket) => { socket.send(JSON.stringify(message)) });
        }
    }
}