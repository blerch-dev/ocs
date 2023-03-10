interface chatOptions {
    embed?: string,
    directLink?: string,
    transparent?: boolean,
    flex?: boolean
}

export const chatComponent = (title: string, options?: chatOptions) => {
    let cv = 0;
    const getNV = (sv?: number) => { if(sv != undefined) { cv = 0; } return ('0' + cv++).slice(-2) }
    return `
    <div id="OCS-Chat" 
        class="${options?.transparent ?? false ? 'embed-chat' : ''} ${options?.flex ?? false ? 'fill-space' : ''}" 
        data-embed="${options?.embed ?? ''}" 
        data-link="${options?.directLink ?? ''}"
    >
        <header>
            <h4>${title}</h4>
            <div>
                <span tabindex="2${getNV()}"></span>
                <span tabindex="2${getNV()}"></span>
                <span tabindex="2${getNV()}"></span>
            </div>
        </header>
        <span id="InteractList" data-tab="3"></span>
        <main class="no-scrollbar" style="padding: 0px;">
            <div id="OCS-Chat-List" data-tab="4"></div>
        </main>
        <span id="FillList" class="no-scrollbar" data-tab="5"></span>
        <footer>
            <input tabindex="6${getNV(0)}" id="OCS-Chat-Input" type="text" placeholder="Message..."/>
            <button tabindex="6${getNV()}" id="OCS-Chat-Send" type="button">Send</button>
        </footer>
        <script type="module" src="/js/chat.js"></script>
    </div>
`};