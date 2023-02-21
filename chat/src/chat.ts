import { OCServer, OCMessage, OCUser, OCChannel } from "ocs-type";
import WebSocket from 'ws';

export default (server: OCServer) => {
    const wss = new WebSocket.Server({
        noServer: true,
        path: "/"
    });

    // Load Channels on Start
    const Channels = new Set<OCChannel>
    const getChannel = (origin: string) => {
        // return matching channel with origin or undefined
        return { name: 'Test Channel' } // testing
    }

    //console.log(server, server.getServer);
    server.getServer().on("upgrade", (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    });

    // Random Hex UUID
    const hexId = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

    // Get User Session
    const getSession = (req: any) => {
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

    interface Chatter {
        channel?: OCChannel,
        user: OCUser
    }

    const Sockets = new Set<WebSocket>;
    const Users = new Map<Chatter, Set<WebSocket>>;

    wss.on("connection", async (socket, request) => {
        let session = await getSession(request);
        console.log("Socket Connection:\n", session);

        let chatter = { channel: getChannel((request as any)?.headers?.origin), user: new OCUser((session as any)?.user) }

        if(chatter.user instanceof OCUser) {
            if(Users.has(chatter)) {
                Users.get(chatter)?.add(socket);
            } else {
                // check if banned
                Users.set(chatter, new Set([socket]));
            }
        } else {
            // anon socket, tell them to login
            Sockets.add(socket);
        }

        (socket as any).isAlive = true;
        (socket as any).UUID = 'User-' + hexId(4);

        // Heartbeat
        setInterval(() => {
            if((socket as any).isAlive !== true) {
                Sockets.delete(socket);
                socket.terminate();
            }

            (socket as any).isAlive = false;
            socket.send('ping');
        }, 1000 * 60 * 0.5); // 30 Seconds

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
            Sockets.forEach((ws: WebSocket) => {
                // if(ws === socket)
                //     return;

                ws.send(JSON.stringify({
                    username: (ws as any).UUID,
                    message: json.value
                }));
            });
        }

        const onError = (err: unknown) => {
            console.log(err);
        }

        socket.send(JSON.stringify({
            ServerMessage: `Connected to Channel ${chatter.channel.name} as ${chatter.user.getName()}.`
        }));
    });

    return wss;
}