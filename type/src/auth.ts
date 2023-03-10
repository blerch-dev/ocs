const twitch = require('../secrets/twitch.json');

// Will hold all auth logic, pulled in per server required to auth something
// will probably remove passportjs and do this manually
export interface OCAuthProps {
    callbackURL: string,
    twitch?: boolean
}

export class OCAuth {
    public twitch = {
        authenticate: (req: any, res: any, next: any) => { console.log("Undefined Function"); },
        verify: (req: any, res: any, next: any) => { console.log("Undefined Function"); }
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
                    if(json?.data[0]?.id !== undefined) {
                        res.locals.twitch = json.data[0];
                    }

                    next();
                }
            }
        }
    }
}