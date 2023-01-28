export const defaultLayout = (head: string, body: string) => `
    <!DOCTYPE html>
    <html lang="en">
        <script> var exports = {}; </script>
        <head>${head}</head>
        <body>${body}</body>
    </html>
`;

export const defaultHead = (title: string) => `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="/assets/favicon.ico" />
    <title>${title}</title>
    <link rel="stylesheet" href="/css/style.css">
`;

export const embedComponent = () => `
    <div style="flex: 1;"></div>
`;

export const chatComponent = (title: string) => `
    <div id="OCS-Chat">
        <header>
            <h4>${title}</h4>
            <div>
                <span></span>
                <span></span>
                <span></span>
            </div>
        </header>
        <span id="InteractList"></span>
        <main>

        </main>
        <span id="FillList" class="no-scrollbar"></span>
        <footer>
            <input id="OCS-Chat-Input" type="text" placeholder="Message..."/>
            <button id="OCS-Chat-Send" type="button">Send</button>
        </footer>
        <script type="module" src="/js/chat.js"></script>
    </div>
`;