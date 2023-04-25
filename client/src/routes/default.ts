// Default Layout/Route for ocs.gg
import { OCRoute, OCServices, OCUser, RoleSheet, Status } from "ocs-type";
import { defaultLayout, defaultHead, embedComponent, chatComponent, headerComponent } from "../components";

const DefaultRoute = new OCRoute({
    domain: '[\\s\\S]*',
    callback: (router, server, session) => {
        const isAuthed = (req: any, res: any, next: any) => {
            if(req?.session?.user == undefined) 
                return res.redirect(`${OCServices.IMP}://${OCServices.Auth}/sso?site=${req.hostname}`);

            next();
        }

        router.get('/live', (req, res, next) => {
            let head = defaultHead('OCS | Live');
            let embed = embedComponent();
            let chat = chatComponent('Global Chat');
            let body = `
                ${headerComponent('OCS Live', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main class="live">${embed}${chat}</main>
            `;

            res.send(defaultLayout(head, body));
        });

        router.get('/chat/embed', (req, res) => {
            let head = defaultHead('OCS | Embed Chat');
            let chat = chatComponent('Global Chat', { transparent: true, flex: true });
            let body = `<main class="live">${chat}</main>`;

            res.send(defaultLayout(head, body, { transparent: true }));
        });

        router.get('/chat', (req, res, next) => {
            let head = defaultHead('OCS | Chat');
            let chat = chatComponent('Global Chat', { flex: true });
            let body = `<main class="live">${chat}</main>`;

            res.send(defaultLayout(head, body));
        });

        router.get('/login', isAuthed, (req, res, next) => {
            return res.redirect('/profile');
        });

        router.get('/profile', isAuthed, (req, res, next) => {
            let head = defaultHead('OCS | Profile');
            let roles = RoleSheet.GlobalRoles.getRoles(req.session?.user?.roles);
            let user = new OCUser(req.session?.user as any, { noError: true });
            let isDev = user.validUserObject() && RoleSheet.IsDev(user);

            let dev = `
                <div id="Developer" class="profile-section">
                    <h2>Developer Info</h2>
                    <span class="profile-card">
                        <h4>Full Session</h4>
                        <pre>${JSON.stringify(req.session.user, null, 2)}</pre>
                    </span>
                </div>
            `;

            let content = `
                <div class="content-section">
                    ${isDev ? dev : ''}
                    <div id="Account" class="profile-section">
                        <h2>Account Details</h2>
                        <span class="profile-card">
                            <span class="profile-card-tag">
                                <h4>Username:</h4>
                                <p>${user.getName()}</p>
                            </span>
                            <span class="profile-card-group">
                                <h4>Roles:</h4>
                                ${roles.map((ri) => {
                                    return `<p style="color: ${ri.color};">${ri.name}</p>`
                                }).join('<br>')}
                            </span>
                            <span class="profile-card-group">
                            <h4>Status:</h4>
                                ${Status.VALID & user.toJSON().status ? '<p>Valid Account</p>' : '<p>Invalid Account</p>'}
                                ${Status.BANNED & user.toJSON().status ? '<p>Global Chat Ban</p>' : ''}
                                ${Status.MUTED & user.toJSON().status ? '<p>Global Chat Mute</p>' : ''}
                            </span>
                        </span>
                    <div>
                    <div>
                        <h2>Connections</h2>
                        <span class="profile-card">
                            ${user.toJSON().connections?.twitch ? `
                                <span class="profile-card-tag twitch-tag">
                                    <img src="/assets/logos/twitch.svg">
                                    <h4>${user.toJSON().connections.twitch.username}</h4>
                                </span>
                            ` : ''}
                        </span>
                    </div>
                    <div>
                        <h2>Channels</h2>
                        <span class="profile-card">
                                <h4>Channels TODO</h4>
                        </span>
                    </div>
                </div>
            `;

            let body = `
                ${headerComponent('OCS Live', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main class="profile-page">
                    <nav class="section-nav">
                        <div style="flex: 1;">
                            ${isDev ? '<a href="/profile#Developer">Developer</a>' : ''}
                            <a href="/profile#Account">Account</a>
                        </div>
                        <div style="padding-bottom: 20px;">
                            <span class="section-link">
                                <a href="${OCServices.IMP}://${req.hostname}/logout">Logout</a>
                            </span>
                        </div>
                    </nav>
                    ${content}
                </main>
            `;

            res.send(defaultLayout(head, body));
        })

        router.get('/', (req, res, next) => {
            let head = defaultHead('OCS');
            let body = `
                ${headerComponent('OCS Live', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main>
                    <h3>Home Page</h3>
                </main>
            `;

            res.send(defaultLayout(head, body));
        });

        // 404 Page
        // JSON Catch All

        return router;
    }
});

export default DefaultRoute;
