import { google } from 'googleapis';
import { OCServices } from './server';

import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

const twitch = {
    id: process.env.TWITCH_ID ?? '',
    secret: process.env.TWITCH_SECRET ?? ''
}

const youtube = {
    id: process.env.YOUTUBE_ID ?? '',
    secret: process.env.YOUTUBE_SECRET ?? ''
}

// Will hold all auth logic, pulled in per server required to auth something
// will probably remove passportjs and do this manually
export interface OCAuthProps {
    callbackURL: string,
    twitch?: boolean,
    youtube?: boolean,
}

export class OCAuth {
    public twitch = {
        authenticate: (req: any, res: any, next: any) => { console.log("Undefined Function"); },
        verify: (req: any, res: any, next: any) => { console.log("Undefined Function"); },
        appAuth: () => {},
        appVerify: () => {}
    }

    public youtube = {
        authenticate: (req: any, res: any, next: any) => { console.log("Undefined Function"); },
        verify: (req: any, res: any, next: any) => { console.log("Undefined Function"); },
        appAuth: () => {},
        appVerify: () => {}
    }

    public clearCode = (cb: Function, seconds: number) => { setTimeout(cb, seconds * 1000); }

    constructor(props: OCAuthProps) {
        if(props.twitch === true) {
            this.twitch = {
                authenticate: (req: any, res: any, next: any) => {
                    let twitchRedirectURL = `https://${props.callbackURL}/auth/twitch`;
                    let twitchAuthURL = `https://id.twitch.tv/oauth2/authorize?client_id=${twitch.id}` + 
                        `&redirect_uri=${twitchRedirectURL}&response_type=code` + 
                        `&scope=user:read:subscriptions+channel:read:polls+channel:read:subscriptions` +
                        `+channel:read:vips+moderation:read+moderator:read:blocked_terms+chat:edit+chat:read` + 
                        `&state=twitch`;

                    res.redirect(twitchAuthURL); 
                },

                verify: async (req: any, res: any, next: any) => {
                    // res.locals.timing = Date.now();

                    let validate_url = `https://id.twitch.tv/oauth2/token?client_id=${twitch.id}
                        &client_secret=${twitch.secret}
                        &code=${req.query.code}
                        &grant_type=authorization_code
                        &redirect_uri=https://${props.callbackURL}/auth/twitch`.replace(/\s/g,'');

                    let validate = await fetch(validate_url, { method: 'POST', headers: { 
                        'Content-Type': 'application/vnd.twitchtv.v3+json' 
                    } });

                    let json = await validate.json();
                    let result = await fetch('https://api.twitch.tv/helix/users', {
                        headers: {
                            'Authorization': `Bearer ${json.access_token}`,
                            'Client-Id': `${twitch.id}`
                        }
                    });

                    json = await result.json();
                    if(json.error) {
                        console.log(json);
                        res.locals.twitch = { ...json };
                        return next();
                    }

                    if(Array.isArray(json?.data) && json?.data[0]?.id !== undefined) {
                        res.locals.twitch = json.data[0];
                    }

                    next();
                },
                
                appAuth: () => {},

                appVerify: () => {}
            }
        }

        if(props.youtube === true) {
            // example here
            // https://stackoverflow.com/questions/54973671/youtube-account-authentication-nodejs
            const redirectHost = OCServices.Production ? `https://auth.ocs.gg` : `http://localhost:8082`;
            const redirectURL = `${redirectHost}/auth/youtube`;
            const authClient = new google.auth.OAuth2(youtube.id, youtube.secret, redirectURL);
            const authUrl = authClient.generateAuthUrl({
                access_type: 'offline',
                scope: 'https://www.googleapis.com/auth/youtube.readonly'
            });

            const service = google.youtube({ version: "v3" });

            this.youtube = {
                authenticate: async (req: any, res: any, next: any) => {
                    const token = req.cookies?.google_token ?? null;
                    return res.redirect(authUrl);

                    // if token, forward to verify
                    // needs method for saving refresh token to cookie / repopulate auth client

                    // const url = 'https://people.googleapis.com/v1/people/me?personFields=names';
                    // const response = await authClient.request({ url });
                    // console.log("GOOGLE API RES:", response.data);
                },

                verify: async (req: any, res: any, next: any) => {
                    const { code, scope } = req.query;
                    const { tokens } = await authClient.getToken(code);
                    authClient.setCredentials(tokens);

                    // this is CHANNEL data, if user is only on a google account it will be empty
                    // maybe this only does google data (not youtube)
                    // need a general google/youtube id I can save to a user,
                    // can do follow up data fetchs after the creation of the account
                    // search/channel/google account
                    service.channels.list({
                        auth: authClient,
                        //maxResults: 1,
                        part: ["snippet", "contentDetails", "statistics"],
                        mine: true
                    }, (err, resp) => {
                        if(err) { console.log(err); res.locals.youtube = { error: err }; return next(); }
                        res.locals.youtube = resp?.data;
                        return next();
                    });
                },

                appAuth: () => {},

                appVerify: () => {}
            }
        }
    }
}
