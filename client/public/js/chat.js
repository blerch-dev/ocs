class OCSocket {
    constructor(loc) {
        console.log("Loaded:", loc);
    }

    connect = (url) => {
        // connect
        console.log("Connect:", url);
    }

    sendChat = (value) => {
        console.log("Send Value:", value);
    };
}

const OCS = new OCSocket(window.location);