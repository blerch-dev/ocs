class OCSocket {
    constructor(loc) {
        //console.log("Loaded:", loc); // Should do maps here
        this.loc = loc;
        console.log(loc);

        this.events = new Map();
        this.channel_name = "";
    }

    connect = (url, channel_name) => {
        // connect
        this.socket = new WebSocket(url);
        this.channel_name = channel_name;
        //console.log("Connect:", url);
        for(let [key, value] of this.events) {
            this.socket.on(key, value);
        }
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
    const chat = document.getElementById("OCS-Chat-List");
    const input = document.getElementById("OCS-Chat-Input");
    const submit = document.getElementById("OCS-Chat-Send");

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
            case "Chat-Close":
                RemoveChat(); break;
            default:
                break;
        }
    });
});

const ToggleSettings = () => {
    // show/hide settings
}

const RemoveChat = () => {
    // remove element, close socket
}

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
        if(json.ServerMessage)
            serverMessage(json);

        if(json.EventMessage)
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