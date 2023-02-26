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
    const getChannel = async (origin: string) => {
        let channel = Channels.get(origin);
        if(channel instanceof OCChannel)
            return channel;

        return await new Promise<OCChannel | Error>((res, rej) => {
            server.getRedisClient().getClient().get(`channel|${origin}`, (err, result) => {
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
        // Connection Details
        let session = await getSession(request) as any;
        let origin = (request as any)?.headers?.origin as string;
        let channel = await getChannel(origin);
        let user = OCUser.validUserObject((session as any)?.user) ? new OCUser((session as any)?.user) : undefined;

        if(channel instanceof Error) {
            return socket.send(JSON.stringify({ ServerMessage: `Couldn't find channel named ${origin}.` }));
        }

        // Channel Connection
        let deleteSocket: () => void;
        let isBanned: () => boolean;
        let isMuted: () => boolean;
        if(user instanceof OCUser) {
            channel.addUserConnection(user, socket);
            deleteSocket = () => { (channel as OCChannel).deleteUserConnection((user as OCUser), socket); }
            //isBanned = () => { (channel as OCChannel). }
        } else {
            channel.addAnonConnection(socket);
            deleteSocket = () => { (channel as OCChannel).deleteAnonConnection(socket); }
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
            // check if muted
            try { onJSON(JSON.parse(message.toString())) } catch(err) { onError(err); }
        });

        // Add OCMessage as a class type.
        const onJSON = (json: OCMessage | any) => {
            // If Ban/Mute List
            // If Command/Arguments
            // Else
            // Sockets.forEach((ws: WebSocket) => {
            //     // if(ws === socket)
            //     //     return;

            //     ws.send(JSON.stringify({
            //         username: (ws as any).UUID,
            //         message: json.value
            //     }));
            // });
        }

        const onError = (err: unknown) => {
            console.log(err);
        }

        // if(chatter.user instanceof OCUser) {
        //     socket.send(JSON.stringify({
        //         ServerMessage: `Connected to Channel ${chatter.channel.getName()} as ${chatter.user.getName()}.`
        //     }));
        // } else {
        //     socket.send(JSON.stringify({
        //         ServerMessage: 'Sign in to chat...'
        //     }));
        // }
    });

    return wss;
}