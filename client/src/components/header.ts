

export const headerComponent = (header: string, username?: string, links?: { label: string, link: string }[]) => { 
    let cv = 0;
    const getNV = () => { return ('0' + cv++).slice(-2) }
    return `
    <header id="OCS-Header">
        <a tabindex="1${getNV()}" href="/"><h2>${header}</h2></a>
        <div id="OCS-Header-Controls">
            <div class="header-links">
                ${links?.map((l) => { return `<a tabindex="1${getNV()}" href="${l.link}">${l.label}</a>` }).join('')}
            </div>
            <div class="header-controls">
                <span id="OCS-Header-Status">
                    <p style="color: #ffffff55">
                        offline
                        <span id="OCS-Header-Status-Embed">blerch</span>
                        |
                        <span id="OCS-Header-Status-Source">●</span>
                    </p>
                </span>
                <a tabindex="1${getNV()}" href="/live" id="OCS-Live">Stream</a>
                <a tabindex="1${getNV()}" href="${username ? '/profile' : '/login'}" id="OCS-Profile">${username ?? 'Login'}</a>
            </div>
        </div>
    </header>
`};