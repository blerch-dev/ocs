const rootURL = process.env?.rootURL ?? 'ocs.local';

export const DefaultPage = (title: string, body: string) => `
    <!DOCTYPE html>
    <html lang="en">
        <script> var exports = {}; </script>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="icon" href="/assets/favicon.ico" />
            <title>${title}</title>
            <link rel="stylesheet" href="/css/style.css">
        </head>
        <body>${body}</body>
    </html>
`;

export default (code: number, message?: string) => `
    ${DefaultPage('OCS | Error', `
        <main>
            <h2>OCS.GG Authentication Error: ${code}</h2>
            <p>${message ?? 'Undefined Error. Please try again later.'}</p>
        </main>
    `)}
`;

export const AuthPage = (domain: string, login?: boolean) => `
    ${DefaultPage('OCS | SSO', `
        <main>
            <div class="auth-form">
                <h1>OCS Auth</h1>
                <span style="display: flex; align-items: center; gap: 8px;">
                    <h4>for</h4>
                    <pre>${domain}</pre>
                </span>
                <span class="column-spacer"></span>
                <a class="twitch-button auth-button" href="https://auth.${rootURL}/twitch"><h3>Twitch</h3></a>
                <span class="column-spacer"></span>
                <span class="options-span">
                    <label for="ssi">Keep Me Signed In?</label>
                    <input type="checkbox" name="ssi" id="ssi">
                    <span id="ssi-control" ></span>
                    <script>
                        // Syncs SSI Checkbox
                        document.addEventListener('DOMContentLoaded', () => {
                            let elem = document.getElementById('ssi');
                            let button = document.getElementById('ssi-control')
                            elem.check = document.cookie.includes('ssi=true');
                            elem.addEventListener('change', function() {
                                if(this.checked)
                                    document.cookie = "ssi=true";
                                else
                                    document.cookie = "ssi=false";
                            });

                            button.addEventListener('click', (e) => {
                                elem.click();
                            });
                        });
                    </script>
                </span>
            </div>
        </main>
    `)}
`;

export const SignUpPage = (domain: string, data: any) => `
    ${DefaultPage('OCS | Sign Up', `
        <main>
            <form class="auth-form" action="/">
                <h1>OCS Auth</h1>
                <span style="display: flex; align-items: center; gap: 8px;">
                    <h4>for</h4>
                    <pre>${domain}</pre>
                </span>
                <span class="column-spacer"></span>
                <span class="auth-input">
                    <label for="username">Username:</label>
                    <input 
                    required 
                    min
                    maxlength="32" 
                    type="username" 
                    name="username" 
                    id="username" 
                    value="${data?.login ?? ''}">
                </span>
                <span class="auth-input">
                    <label for="username">Code:</label>
                    <input type="username" name="username" id="username" placeholder="Optional">
                </span>
                <input type="hidden" name="data" value='${JSON.stringify(data)}'>
                <span class="column-spacer"></span>
                <button class="auth-button" type="submit">Create Account</button>
            </form>
        </main>
    `)}
`;

export const SessionPage = (session: any) => `
    ${DefaultPage('OCS | Session', `
        <main>
            <h3>Session Data:</h3>
            <pre>${JSON.stringify(session, null, 2)}</pre>
        </main>
    `)}
`;