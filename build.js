const { exec } = require('child_process');
const pkg = {
    Auth: require('./auth/package.json'),
    Chat: require('./chat/package.json'),
    Client: require('./client/package.json'),
    Data: require('./data/package.json'),
    State: require('./state/package.json')
}

// Build Docker image in each service folder

const exe = (cmd) => {
    return new Promise((res, rej) => {
        exec(cmd, (error, stdout, stderr) => {
            if(error) { return rej(error); }
            res(stdout);
        });
    });
}

/**
    Error: Command failed: cd type && docker build -t blerch-dev/ocs-type:latest .
    The command '/bin/sh -c npm install && npm run build' returned a non-zero code: 1

    at ChildProcess.exithandler (node:child_process:419:12)
    at ChildProcess.emit (node:events:513:28)
    at maybeClose (node:internal/child_process:1091:16)
    at ChildProcess._handle.onexit (node:internal/child_process:302:5) {
        code: 1,
        killed: false,
        signal: null,
        cmd: 'cd type && docker build -t blerch-dev/ocs-type:latest .'
    }
 */
const start = async () => {
    console.log("Building Type Library Image...")
    let tp = require('./type/package.json');
    await exe(`docker image rm blerch-dev/${tp.name}:latest`).catch((err) => { console.log("Image RM -", err); })
    await exe(`cd type && docker build -t blerch-dev/${tp.name}:latest .`);

    console.log("Building Images...");
    const images = Object.keys(pkg).map((key) => { 
        return { folder: key.toLowerCase(), image_name: `blerch-dev/${pkg[key].name}:${pkg[key].version}` }
    });

    for(let i = 0; i < images.length; i++) {
        await exe(`cd ${images[i].folder} && docker build -t ${images[i].image_name} .`);
        console.log(`-- Built Image: ${images[i].image_name}`);
    }

    console.log("Finished Building Images...");
}

start();