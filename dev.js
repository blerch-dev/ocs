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

let type = exe('cd type && npm run build');

const start = async () => {
    await type;

    await exe('cd client && npm run build');
    await exe('cd chat && npm run build');
    await exe('cd auth && npm run build');
    await exe('cd data && npm run build');
    
    const Client = require('./client/build');
    const Chat = require('./chat/build');
    const Auth = require('./auth/build');
    const Data = require('./data/build');

    console.log("Services Running...");
}

start();