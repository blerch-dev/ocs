import { URL } from 'url';
import { OCServer, OCMessage, OCUser, OCChannel } from "ocs-type";
import WebSocket from 'ws';

export default (server: OCServer) => {
    const wss = new WebSocket.Server({
        noServer: true
    });

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

    const getHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();

    //// Cant use the same redis instance for express-session and sub/pub
    const redis = server.getRedisClient().getSubscriber();
    const publisher = server.getRedisClient().getPublisher();

    // Load Channels on Start - Make names lowercase on map
    const Channels = new Map<string, OCChannel>() // Channel Name -> OCChannel Object
    // Debug
    Channels.set('global', new OCChannel({
        name: 'Global',
        id: '12345',
        commands: {},
        bans: { ips: [], users: []},
        mutes: []
    }));
    // Debug
    const getChannel = async (name: string) => {
        let channel = Channels.get(name);
        if(channel instanceof OCChannel) {
            subChannel(channel);
            return channel;
        }

        return await new Promise<OCChannel | Error>((res, rej) => {
            redis.get(`channel|${name}`, (err, result) => {
                if(err) {
                    server.logger.error('Redis Client Error', err);
                    return res(err);
                } else if(result == undefined) {
                    return res(new Error("Invalid Result"));
                }
    
                try {
                    let channel = new OCChannel(JSON.parse(result));
                    subChannel(channel);
                    return res(channel);
                } catch(err) {
                    return res(err instanceof Error ? err : new Error("Invalid Error"));
                }
            });
        });
    }

    // Sub
    const subChannel = (channel: OCChannel) => {
        redis.subscribe(`chat|${channel.getSlug()}`, (err, count) => {
            if(err)
                return server.logger.error(err);
    
            // Count is number of channels subbed
            //server.logger.debug(`Subbed to ${channel.getSlug()} - Sub Count: ${count}`);
        });
    }

    redis.on("message", async (channel, message) => {
        let channel_name = channel.split('|')[1];
        let c = await getChannel(channel_name);
        if(c instanceof OCChannel) {
            try {
                let json = JSON.parse(message);
                c.broadcast(json as OCMessage);
            } catch(err) {
                server.logger.error(err);
            }
        }
    });

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
        (socket as any).hexcode = getHex(6);
        let session = await getSession(request) as any;
        let origin = (request as any)?.headers?.origin as string;
        let channel_data = await getChannel(getQuery(request.url ?? '/')?.channel);
        let user = OCUser.validUserObject((session as any)?.user) ? new OCUser((session as any)?.user) : undefined;
        // Updating User with new User from new session should effect current chatter copium

        server.logger.debug(`${channel_data.toString()} - ${user?.getName()} | ${(socket as any).hexcode}`)
        if(channel_data instanceof Error) {
            return socket.send(JSON.stringify({ ServerMessage: { message: `Couldn't find channel named ${origin}. Try again later.` } }));
        }

        let channel = (channel_data as OCChannel);

        // Heartbeat Setup
        (socket as any).isAlive = true;
        (socket as any).hb = setInterval(() => {
            server.logger.verbose('Sending Heartbeat');
            if((socket as any).isAlive !== true) {
                return deleteSocket('heartbeat');
            }
    
            (socket as any).isAlive = false;
            socket.send('ping');
        }, 1000 * 60 * 0.5); // 60 Seconds

        // Channel Connection
        let deleteSocket: (caller?: string) => void;
        let isBanned: () => boolean;
        let isMuted: () => boolean;
        if(user instanceof OCUser) {
            let added = channel.addUserConnection(user, socket);
            server.logger.debug(`Added: ${added} - ${user.getName()} | ${(socket as any).hexcode}`)
            if(!added) {
                // Checks Banned
                return socket.send(JSON.stringify({ ServerMessage: { message: `Sorry, you couldn't join this channel.` } }));
            }

            deleteSocket = (caller: string = 'undefined') => { 
                let deleted = channel.deleteUserConnection((user as OCUser), socket);
                server.logger.debug(`Deleted Socket (${caller}): ${deleted} | ${(socket as any).hexcode}`);

                clearInterval((socket as any).hb);
                socket.send(JSON.stringify({ ServerMessage: { message: 'You were disconnected from the server.' } }));
                socket.terminate();
            }
            isBanned = () => { return !!(channel.getUserConnection((user as OCUser))?.banned); }
            isMuted = () => { return !!(channel.getUserConnection((user as OCUser))?.muted); }
        } else {
            channel.addAnonConnection(socket);
            deleteSocket = () => { 
                channel.deleteAnonConnection(socket);

                clearInterval((socket as any).hb);
                socket.send(JSON.stringify({ ServerMessage: { message: 'You were disconnected from the server.' } }));
                socket.terminate();
            }
            isBanned = () => { return false; } // IP is checked on connection
            isMuted = () => { return true; } // Anon connections cant type
        }

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
            const msg = JSON.stringify({
                ChatMessage: {
                    username: (user as OCUser).getName(),
                    message: json.message,
                    roles: (user as OCUser).getRoles(channel)
                }
            });

            // Filter Messages/Commands Here

            publisher.publish(`chat|${channel.getSlug()}`, msg);
        }

        const onError = (err: unknown) => {
            console.log(err);
        }

        // Close
        socket.on('close', (code, reason) => {
            server.logger.debug(`Socket ${(socket as any).hexcode} Closed: (${code}) - ${reason}`);
            deleteSocket('on close');
        });

        // Error
        socket.on('error', (err) => {
            server.logger.debug(err.toString());
        });

        if(user instanceof OCUser) {
            socket.send(JSON.stringify({
                ServerMessage: {
                    message: `Connected to Channel ${channel.getName()} as ${user.getName()}.`,
                    icon: '/assets/info.svg'
                },
                MessageQueue: channel.getMessageList(),
                meta: { user: (user as OCUser).getChatDetails() }
            }));
        } else {
            socket.send(JSON.stringify({
                ServerMessage: {
                    message: 'Sign in to chat...'
                },
                MessageQueue: channel.getMessageList()
            }));
        }
    });

    return wss;
}