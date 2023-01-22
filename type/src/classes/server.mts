import express from 'express';

export class OCServer {

    private app = express();

    constructor(port: Number) {
        this.app.get('*', (req: express.Request, res: express.Response) => {
            res.status(200).send(`
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <meta http-equiv="X-UA-Compatible" content="ie=edge">
                        <title>HTML 5 Boilerplate</title>
                    </head>
                    <body>
                        <h1>OCS</h1>
                        <h4>shits working...</h4>
                    </body>
                    <style>
                        * {
                            position: 'relative';
                            box-sizing: 'border-box';
                            margin: 0px;
                        }

                        body {
                            padding: 5px;
                        }
                    </style>
                </html>
            `);
        });

        this.app.listen(port);
    }
}