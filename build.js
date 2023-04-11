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

const images = Object.keys(pkg).map((key) => { 
    return { folder: key.toLowerCase(), img_nme: `blerch-dev/${pkg[key].name}`, img_ver: `${pkg[key].version}` }
});

const start = async () => {
    console.log("Clearing Old Images...")
    let tp = require('./type/package.json');
    await exe(`docker rmi -f $(docker images --filter=reference="blerch-dev/ocs-*:*" -q)`).catch((err) => { 
        console.log("Image RM -", err); 
    });

    console.log("Building Type Library Image...")
    await exe(`cd type && docker build -t blerch-dev/${tp.name}:latest .`);

    console.log("Building Images...");
    for(let i = 0; i < images.length; i++) {
        let m = images[i];
        await exe(`cd ${m.folder} && docker build -t ${m.img_nme}:${m.img_ver} -t ${m.img_nme}:latest .`);
        console.log(`-- Built Image: ${m.img_nme}`);
    }

    console.log("Finished Building Images.\n");
}

const minikube_config = async () => {
    console.log("Removing Images...");
    for(let i = 0; i < images.length; i++) {
        let m = images[i];
        await exe(`minikube image rm blerch-dev/${m.img_nme}`);
    }

    console.log("Loading Images...");
    for(let i = 0; i < images.length; i++) {
        let m = images[i];
        await exe(`minikube image load blerch-dev/${m.img_nme}:latest`);
        console.log(`-- Uploaded Image: ${m.img_nme}`);
    }

    console.log("Finished Uploading Images.\n")
}

start().then(() => {
    if(process.argv[2] && process.argv[2] === '-m') { minikube_config(); }
});
