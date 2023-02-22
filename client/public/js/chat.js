class OCSocket {
    constructor(loc) {
        console.log("Loaded:", loc);
        this.events = new Map();
    }

    connect = (url) => {
        // connect
        this.socket = new WebSocket(url);
        console.log("Connect:", url);
        for(let [key, value] of this.events) {
            this.socket.on(key, value);
        }
    }

    sendChat = (value) => {
        if(!(this.socket instanceof WebSocket))
            return;
        
        this.socket.send(JSON.stringify({ value: value }));
        console.log("Send Value:", value);
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
        console.log(e.code);
        if(e.code == "Enter" || e.code == "NumpadEnter")
            getValue();
    });

    submit.addEventListener('click', (e) => {
        getValue();
    });

    ConfigureChat(chat, input, submit)
});

const OCS = new OCSocket(window.location);
function ConfigureChat(chat, input, submit) {
    // OCS.connect('ws://localhost:8081');
    OCS.connect('ws://chat.ocs.local');
    OCS.on('message', (event) => {
        let msg = event.data;
        if(msg === 'ping')
            return OCS.socket.send("pong");
        
        try {
            onMessage(JSON.parse(msg));
        } catch(err) {
            console.log("Error:", err);
            console.log("Message Event:", event);
        }
    });

    let even = true;
    const onMessage = (json) => {
        console.log("JSON:", json);
        if(json.ServerMessage)
            return serverMessage(json);

        if(json.EventMessage)
            return eventMessage(json);

        chatMessage(json);
    }

    const chatMessage = (json) => {
        let elem = document.createElement('div');
        elem.classList.add('chat-message', even ? undefined : 'odd');
        even = !even;
        elem.innerHTML = `
            <p><span class="user-tag">${json.username}</span>: ${json.message}</p>
        `;
    
        chat.appendChild(elem);
    }

    const serverMessage = (json) => {
        let elem = document.createElement('div');
        elem.classList.add('server-message');
        even = !even;
        elem.innerHTML = `
            <p>${json.ServerMessage}</p>
        `;

        chat.appendChild(elem);
    }

    const eventMessage = (json) => {

    }
}