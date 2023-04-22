// Default Layout/Route for ocs.gg
import { OCRoute, OCServices, RoleSheet, Status } from "ocs-type";
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
            let body = `
                ${headerComponent('OCS Live', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main class="live">${chat}</main>
            `;

            res.send(defaultLayout(head, body));
        });

        router.get('/login', isAuthed, (req, res, next) => {
            return res.redirect('/profile');
        });

        router.get('/profile', isAuthed, (req, res, next) => {
            let head = defaultHead('OCS | Profile');
            let roles = RoleSheet.GlobalRoles.getRoles(req.session?.user?.roles);

            let content = `
                <div>
                    <div>
                        <h2>Account Details</h2>
                        <span class="user-card">${req.session?.user?.username}</span>
                        <h4>Roles</h4>
                        <span class="profile-card">
                            ${roles.map((ri) => {
                                `<p style="color: ${ri.color};">${ri.name}</p>`
                            }).join('<br>')}
                        </span>
                        <h4>Status</h4>
                        <span class="profile-card">
                            ${Status.VALID & req.session?.user?.status ? '<p>Valid Account</p><br>' : '<p>Invalid Account</p><br>'}
                            ${Status.BANNED & req.session?.user?.status ? '<p>Global Chat Ban</p><br>' : ''}
                            ${Status.MUTED & req.session?.user?.status ? '<p>Global Chat Mute</p><br>' : ''}
                        </span>
                    <div>
                </div>
            `;

            let body = `
                ${headerComponent('OCS Live', req.session?.user?.username, [{ label: 'bler.ch', link: 'https://bler.ch' }])}
                <main style="flex-direction: row;">
                    <nav class="section-nav">
                        <div style="flex: 1;">
                        
                        </div>
                        <div>
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
