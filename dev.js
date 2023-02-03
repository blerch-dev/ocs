const { exec } = require('child_process');

// Build in all child subdirectories
// Import default from build folders (where applicable)
// Run all servers

// This will set up all servers on respective ports,
// easy to test without building images for everything

const exe = (cmd) => {
    return new Promise((res, rej) => {
        exec(cmd, (error, stdout, stderr) => {
            if(error) { return rej(error); }
            res(stdout);
        });
    });
}

let client = exe('cd client && npm run build');
let chat = exe('cd chat && npm run build');
let auth = exe('cd auth && npm run build');

const start = async () => {

    await client;
    await chat;
    await auth;
    
    const Client = require('./client/build');
    const Chat = require('./chat/build');
    const Auth = require('./auth/build');

}

start();