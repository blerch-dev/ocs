import { OCServer, OCMessage, OCUser } from "ocs-type";
import WebSocket from 'ws';

export default (server: OCServer) => {
    const wss = new WebSocket.Server({
        noServer: true,
        path: "/"
    });

    //console.log(server, server.getServer);
    server.getServer().on("upgrade", (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    });

    // Random Hex UUID
    const hexId = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

    // This will be a User -> Sockets<Set> Map once auth is in.
    const Sockets = new Set<WebSocket>;
    const Users = new Map<string, WebSocket[]>;

    wss.on("connection", (socket, request) => {
        console.log("Chat Connection:", JSON.stringify({
            headers: request.headers,
            rawHeaders: request.rawHeaders
        }, null, 2));

        Sockets.add(socket);
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
            // connection details, session details
        }));
    });

    return wss;
}