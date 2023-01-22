"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCServer = void 0;
const express_1 = __importDefault(require("express"));
class OCServer {
    constructor(port) {
        this.app = (0, express_1.default)();
        this.app.get('*', (req, res) => {
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
                    </style>
                </html>
            `);
        });
        this.app.listen(port);
    }
}
exports.OCServer = OCServer;
