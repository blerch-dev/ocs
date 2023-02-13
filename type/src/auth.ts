import passport, { PassportStatic } from 'passport';
const TwitchStrategy = require('passport-twitch-latest');

const twitch = require('../secrets/twitch.json');

// let redirectURL = 'https://auth.local/auth/twitch';
// let authURL = `https://id.twitch.tv/oauth2/authorize?client_id=${twitch.id}` + 
//     `&redirect_uri=${redirectURL}&response_type=code` + 
//     `&scope=user:read:subscriptions+channel:read:polls+channel:read:subscriptions` +
//     `+channel:read:vips+moderation:read+moderator:read:blocked_terms+chat:edit+chat:read` + 
//     `&state=twitch`;

// passport.use(new TwitchStrategy({
//     clientID: twitch.id,
//     clientSecret: twitch.secret,
//     callbackURL: redirectURL,
//     authorization: authURL
// }, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
//     // Find User
//     let result = await fetch(`http://data.local/user/twitch/${profile.id}`);
//     let output = await result.json();
//     if(output.data instanceof Error) { return done(output.data); }
//     let user = new OCUser(output.data); console.log("OCUser:", user instanceof OCUser);
//     //if(user instanceof OCUser) { return user.toJSON(); }
//     // Create User
//     done();
// }));

// Will hold all auth logic, pulled in per server required to auth something
export class OCAuth {
    constructor() {}
}