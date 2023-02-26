import { URL } from 'url';
import { OCServer, OCMessage, OCUser, OCChannel } from "ocs-type";
import WebSocket from 'ws';

export default (server: OCServer) => {
    const wss = new WebSocket.Server({
        noServer: true
    });

    // Get User Session
    const getSession = async (req: any) => {
        let sessionParser = server.getSessionParser();
        return new Promise((res, rej) => {
            if(sessionParser !== undefined) {
                sessionParser(req, {} as any, () => {
                    if(req?.session)
                        return res(req.session);
                    
                    return res("No Session");
                });
            } else {
                return res("No Session");
            }
        });
    }

    // Load Channels on Start
    const Channels = new Map<string, OCChannel>() // Channel Name -> OCChannel Object
    // Debug
    Channels.set('kidnotkin', new OCChannel({
        name: 'KidNotkin',
        id: '12345',
        commands: {},
        bans: { ips: [], users: []},
        mutes: []
    }))
    // Debug
    const getChannel = async (name: string) => {
        let channel = Channels.get(name);
        if(channel instanceof OCChannel)
            return channel;

        return await new Promise<OCChannel | Error>((res, rej) => {
            server.getRedisClient().getClient().get(`channel|${name}`, (err, result) => {
                if(err) {
                    server.logger.error('Redis Client Error', err);
                    return res(err);
                } else if(result == undefined) {
                    return res(new Error("Invalid Result"));
                }
    
                try {
                    let channel = new OCChannel(JSON.parse(result));
                    return res(channel);
                } catch(err) {
                    return res(err instanceof Error ? err : new Error("Invalid Error"));
                }
            });
        });
    }

    //console.log(server, server.getServer);
    server.getServer().on("upgrade", async (request, socket, head) => {
        //console.log("Request Headers:", request.headers);
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    });

    wss.on("connection", async (socket, request) => {
        const getQuery = (url: string) => {
            let kv = url.replace('/', '').replace('?', '').split('&')
            let obj: { [key: string]: string } = {};
            for(let i = 0; i < kv.length; i++) {
                let args = kv[i].split('=');
                obj[args[0]] = args[1];
            }
            return obj;
        }

        // Connection Details
        let session = await getSession(request) as any;
        let origin = (request as any)?.headers?.origin as string;
        let channel = await getChannel(getQuery(request.url ?? '/')?.channel);
        let user = OCUser.validUserObject((session as any)?.user) ? new OCUser((session as any)?.user) : undefined;
        // Updating User with new User from new session should effect current chatter copium

        if(channel instanceof Error) {
            return socket.send(JSON.stringify({ ServerMessage: `Couldn't find channel named ${origin}. Try again later.` }));
        }

        // Channel Connection
        let deleteSocket: () => void;
        let isBanned: () => boolean;
        let isMuted: () => boolean;
        if(user instanceof OCUser) {
            let added = channel.addUserConnection(user, socket);
            if(!added) {
                // Checks Banned
                return socket.send(JSON.stringify({ ServerMessage: `Sorry, you couldn't join this channel.` }));
            }

            deleteSocket = () => { (channel as OCChannel).deleteUserConnection((user as OCUser), socket); }
            isBanned = () => { return !!((channel as OCChannel).getUserConnection((user as OCUser))?.banned); }
            isMuted = () => { return !!((channel as OCChannel).getUserConnection((user as OCUser))?.muted); }
        } else {
            channel.addAnonConnection(socket);
            deleteSocket = () => { (channel as OCChannel).deleteAnonConnection(socket); }
            isBanned = () => { return false; } // IP is checked on connection
            isMuted = () => { return true; } // Anon connections cant type
        }

        // Heartbeat
        (socket as any).isAlive = true;
        setInterval(() => {
            if((socket as any).isAlive !== true) {
                deleteSocket();
                socket.terminate();
            }

            (socket as any).isAlive = false;
            socket.send('ping');
        }, 1000 * 60 * 0.5); // 30 Seconds

        // Message
        socket.on("message", (message) => {
            if(message.toString() === 'pong') { (socket as any).isAlive = true; return; }
            if(isMuted())
                return;

            try { onJSON(JSON.parse(message.toString())) } catch(err) { onError(err); }
        });

        // Add OCMessage as a class type.
        const onJSON = (json: OCMessage | any) => {
            // Detect Command: Check User Roles/Status
            (channel as OCChannel).broadcast({
                username: (user as OCUser).getName(),
                message: json.value
            });
        }

        const onError = (err: unknown) => {
            console.log(err);
        }

        if(user instanceof OCUser) {
            socket.send(JSON.stringify({
                ServerMessage: `Connected to Channel ${channel.getName()} as ${user.getName()}.`
            }));
        } else {
            socket.send(JSON.stringify({
                ServerMessage: 'Sign in to chat...'
            }));
        }
    });

    return wss;
}