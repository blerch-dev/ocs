const { exec } = require(`child_process`);

const exe = (cmd) => {
    return new Promise((res, rej) => {
        exec(cmd, (error, stdout, stderr) => {
            if(error) { return rej(error); }
            res(stdout);
        });
    });
}

const start = async () => {
    console.log("Installing Packages...");
    await exe(`cd type && npm install && npm run build`);
    console.log(` - Installed Type Packages`);
    await exe(`cd client && npm install`);
    console.log(` - Installed Client Packages`);
    await exe(`cd chat && npm install`);
    console.log(` - Installed Chat Packages`);
    await exe(`cd auth && npm install`);
    console.log(` - Installed Auth Packages`);
    await exe(`cd data && npm install`);
    console.log(` - Installed Data Packages`);
    await exe(`cd state && npm install`);
    console.log(` - Installed State Packages`);
}

start();