interface bodyOptions {
    transparent?: boolean
}

export const defaultLayout = (head: string, body: string, options?: bodyOptions) => `
    <!DOCTYPE html>
    <html lang="en">
        <script> var exports = {}; </script>
        <head>${head}</head>
        <body ${options?.transparent ?? false ? 'style="background-color: transparent;"' : ''}>${body}</body>
    </html>
`;

export const defaultHead = (title: string, channel: string = 'global') => `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="/assets/favicon.ico" />
    <title>${title}</title>
    <link rel="stylesheet" href="/css/style.css">
    <script> const CHANNEL_NAME = "${channel}"; </script>
    <script type="module" src="/js/main.js"></script>
`;