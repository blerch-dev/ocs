import WebSocket from 'ws';
import { OCUser } from "./user";

export interface OCMessage {
    value: string;
}

export class OCChannel {
    public getName;
    public addUserConnection;
    public deleteUserConnection;
    public addAnonConnection;
    public deleteAnonConnection;

    private UserConnections = new Map<string, { banned: boolean, muted: boolean, sockets: Set<WebSocket.WebSocket> }>();
    private AnonConnections = new Set<WebSocket.WebSocket>();

    constructor(props: {}) {
        this.getName = () => { return "Test" }

        this.addUserConnection = (user: OCUser, socket: WebSocket.WebSocket) => {
            if(this.UserConnections.has(user.getName())) {
                let sockets = this.UserConnections.get(user.getName());
                if(sockets instanceof Set) {
                    sockets.add(socket);
                    return true;
                }

                return false;
            }

            this.UserConnections.set(user.getName(), {
                banned: user.isBanned(this.getName()),
                muted: user.isMuted(this.getName()),
                sockets: new Set<WebSocket.WebSocket>([socket])
            });
            return true;
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
    }
}