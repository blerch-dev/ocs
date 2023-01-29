export const chatComponent = (title: string, embed?: string, directLink?: string) => `
    <div id="OCS-Chat" data-embed="${embed ?? ''}" data-link="${directLink ?? ''}">
        <header>
            <h4>${title}</h4>
            <div>
                <span></span>
                <span></span>
                <span></span>
            </div>
        </header>
        <span id="InteractList"></span>
        <main class="no-scrollbar" style="padding: 0px;">
            <div id="OCS-Chat-List"></div>
        </main>
        <span id="FillList" class="no-scrollbar"></span>
        <footer>
            <input id="OCS-Chat-Input" type="text" placeholder="Message..."/>
            <button id="OCS-Chat-Send" type="button">Send</button>
        </footer>
        <script type="module" src="/js/chat.js"></script>
    </div>
`;