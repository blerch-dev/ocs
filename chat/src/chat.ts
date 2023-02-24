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
    const Channels = new Set<OCChannel>
    const getChannel = (origin: string) => {
        // return matching channel with origin or undefined
        return { name: 'Test Channel' } // testing
    }

    //console.log(server, server.getServer);
    server.getServer().on("upgrade", async (request, socket, head) => {
        //console.log("Request Headers:", request.headers);
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    });

    interface Chatter {
        channel?: OCChannel,
        user?: OCUser
    }

    const Sockets = new Set<WebSocket>;
    const Users = new Map<Chatter, Set<WebSocket>>;

    wss.on("connection", async (socket, request) => {
        let session = await getSession(request) as any;
        console.log("Socket Connection:", session?.user);

        let user = (session as any)?.user;
        if(OCUser.validUserObject(user))
            user = new OCUser(user);
        else
            user = undefined;

        let chatter = { channel: getChannel((request as any)?.headers?.origin), user: user }

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

        // Heartbeat
        (socket as any).isAlive = true;
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

        if(chatter.user instanceof OCUser) {
            socket.send(JSON.stringify({
                ServerMessage: `Connected to Channel ${chatter.channel.name} as ${chatter.user.getName()}.`
            }));
        } else {
            socket.send(JSON.stringify({
                ServerMessage: 'Sign in to chat...'
            }));
        }
    });

    return wss;
}