const { exec } = require(`child_process`);

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

const start = async () => {
    const install = process.argv.includes(`-i`) ?? false;
    console.log("Building Library...");
    await exe(`cd type && ${install ? 'npm install && ' : ''}npm run build`);

    console.log("Building Services...");
    await exe(`cd client && ${install ? 'npm install && ' : ''}npm run build`);
    await exe(`cd chat && ${install ? 'npm install && ' : ''}npm run build`);
    await exe(`cd auth && ${install ? 'npm install && ' : ''}npm run build`);
    await exe(`cd data && ${install ? 'npm install && ' : ''}npm run build`);
    await exe(`cd state && ${install ? 'npm install && ' : ''}npm run build`);
    
    console.log("Running Services...")
    const Client = require(`./client/build`);
    const Chat = require(`./chat/build`);
    const Auth = require(`./auth/build`);
    const Data = require(`./data/build`);
    const State = require(`./state/build`);

    console.log("App Ready");
}

start();