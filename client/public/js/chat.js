class OCSocket {
    constructor(loc) {
        //console.log("Loaded:", loc); // Should do maps here
        this.loc = loc;
        this.embed = loc?.pathname?.indexOf('/embed') >= 0 ?? false;
        console.log(loc);

        this.events = new Map();
        this.channel_name = undefined;
    }

    connect = (url, channel_name) => {
        this.socket = new WebSocket(url);
        this.channel_name = channel_name;
        for(let [key, value] of this.events) {
            this.socket.on(key, value);
        }
    }

    disconnect = (code) => {
        // add message to the ui to show disconnect - todo
        this.socket.close(code ?? 1001, "Closed by user.");
        this.channel_name = undefined;
        this.events = new Map();
    }

    sendChat = (value) => {
        if(!(this.socket instanceof WebSocket))
            return;
        
        this.socket.send(JSON.stringify({ message: value }));
        //console.log("Send Value:", value);
    };

    on(event, callback) {
        this.events.set(event, callback);
        if(this.socket instanceof WebSocket)
            this.socket.addEventListener(event, callback);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const frame = document.getElementById("OCS-Chat");
    const chat = document.getElementById("OCS-Chat-List");
    const input = document.getElementById("OCS-Chat-Input");
    const submit = document.getElementById("OCS-Chat-Send");
    const settings = document.getElementById("OCS-Settings");

    const getValue = () => {
        let msg = input.value;
        if(msg !== '' && msg != undefined) {
            OCS.sendChat(msg); input.value = "";
        }
        input.focus();
    }

    input.addEventListener('keydown', (e) => {
        if(e.code == "Enter" || e.code == "NumpadEnter")
            getValue();
    });

    submit.addEventListener('click', (e) => {
        getValue();
    });

    ConfigureChat(chat, input, submit);

    document.addEventListener('click', (e) => {
        switch(e.target.id) {
            case "Chat-Settings":
                ToggleSettings(); break;
            case "Chat-Popout":
                window.open(OCS.loc.origin + '/chat', '_blank', 'location=yes,height=900,width=300,scrollbars=no,status=yes');
                RemoveChat(1000); break;
            case "Chat-Close":
                RemoveChat(1001); break;
            default:
                break;
        }
    });

    const ToggleSettings = () => {
        if(!(settings instanceof Element))
            return console.log("No settings element.");

        const settings_button = document.getElementById("Chat-Settings");
        const open = !settings.classList.contains('hide');
        let currently_open = settings.classList.toggle('hide', open);
        settings_button.classList.toggle('negative', !currently_open);
    }

    const SaveSettings = () => {
        // configure settings on change
    }
    
    const RemoveChat = (code) => { if(frame instanceof Element) { frame.classList.add('hide'); } OCS.disconnect(code); }
});

// Need a way to either include headers in websocket cross origin, or include in an iframe cross origin
const OCS = new OCSocket(window.location);
function ConfigureChat(chat, input, submit) {
    const url = window.location.host.indexOf('local') >= 0 ? 'chat.ocs.local' : 'chat.ocs.gg'
    OCS.connect(`wss://${url}/?channel=${CHANNEL_NAME ?? 'global'}&client=${window.location}`, CHANNEL_NAME);
    OCS.on('message', (event) => {
        let msg = event.data;
        if(msg === 'ping')
            return OCS.socket.send("pong");
        
        try {
            onMessage(JSON.parse(msg));
        } catch(err) {
            console.log("Error:", err, msg, event);
            console.log("Message Event:", event);
        }
    });

    let even = true;
    const onMessage = (json) => {
        //console.log("JSON:", json);
        if(json.ServerMessage && !OCS.embed)
            serverMessage(json);

        if(json.EventMessage && !OCS.embed)
            eventMessage(json);

        if(json.MessageQueue)
            messageQueue(json);

        if(json.ChatMessage)
            chatMessage(json);
    }

    const chatMessage = (json) => {
        const badges = () => {
            //<img class="user-badge" src="${msg.roles[0].icon}" title="${msg.roles[0].name}">
            // for each badge ^
            return '';
        }

        let msg = json.ChatMessage;
        let elem = document.createElement('div');
        elem.classList.add('chat-message', even ? undefined : 'odd');
        even = !even;
        elem.innerHTML = `
            <p>
                <span class="user-tag" style="color: ${msg.roles[0]?.color ?? '#ffffff'}">
                    ${badges()}
                    ${msg.username}</span>:
                ${msg.message}
            </p>
        `;
    
        chat.appendChild(elem);
    }

    const serverMessage = (json) => {
        let msg = json.ServerMessage;
        let elem = document.createElement('div');
        elem.classList.add('server-message');
        even = !even;
        elem.innerHTML = `
            <p>${msg.icon ? `<span><img src="${msg.icon}"></span> ` : ''}${msg.message}</p>
        `;

        chat.appendChild(elem);
    }

    const eventMessage = (json) => {

    }

    const messageQueue = (json) => {
        let list = json.MessageQueue;
        for(let i = 0; i < list.length; i++) {
            chatMessage(list[i]);
        }
    }
}