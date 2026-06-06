let endpoint = '';
let extensionEnabled = false;

async function getActiveEndpoint() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['extensionEnabled', 'selectedUrl', 'invidiousUrls'], (result) => {
            const enabled = result.extensionEnabled === true;
            if (!enabled) {
                resolve(null);
                return;
            }
            let chosen = result.selectedUrl;
            if (!chosen && result.invidiousUrls && result.invidiousUrls.length) {
                chosen = result.invidiousUrls[0];
            }
            if (!chosen) {
                chosen = 'https://inv.nadeko.net';
            }
            resolve(new URL(chosen).host);
        });
    });
}

function walkAndReplace(node, regex, replacement) {
    if (node.nodeType === Node.TEXT_NODE && regex.test(node.data)) {
        node.data = node.data.replace(regex, replacement);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'SCRIPT' && !node.closest('[contenteditable="true"]')) {
        Array.from(node.attributes).forEach(attr => {
            if (attr.specified && !(node.nodeName === 'IMG' && attr.name === 'src') && attr.name !== 'value') {
                if (regex.test(attr.value)) {
                    attr.value = attr.value.replace(regex, replacement);
                }
            }
        });
        node.childNodes.forEach(child => walkAndReplace(child, regex, replacement));
    }
}

function replaceYouTubeWithInvidious(endpointUrl) {
    const cleanEndpoint = endpointUrl.replace(/\/$/, '');
    
    // Patterns to replace
    const replacements = [
        { regex: /(www\.)?youtube\.com\/account/g, replace: `${cleanEndpoint}/login` },
        { regex: /(www\.)?youtube\.com/g, replace: cleanEndpoint },
        { regex: /youtu\.be/g, replace: cleanEndpoint },
        { regex: /youtube\.com/g, replace: cleanEndpoint },
        { regex: /YouTube/g, replace: 'Invidious' },
        { regex: /youtube/gi, replace: 'invidious' },
        { regex: /یوتیوب/g, replace: 'اینویدیوس' },
        { regex: /یوتوب/g, replace: 'اینویدیوس' }
    ];

    replacements.forEach(({ regex, replace }) => {
        walkAndReplace(document.body, regex, replace);
    });

    // Fix links and iframes
    document.querySelectorAll('a').forEach(el => {
        if (el.href) {
            if (el.href.includes('youtube.com/account')) {
                el.href = el.href.replace('youtube.com/account', `${cleanEndpoint}/login`);
            } else if (el.href.includes('youtube.com')) {
                el.href = el.href.replace('youtube.com', cleanEndpoint);
            } else if (el.href.includes('youtu.be')) {
                el.href = el.href.replace('youtu.be', cleanEndpoint);
            }
        }
    });

    document.querySelectorAll('iframe').forEach(el => {
        if (el.src) {
            if (el.src.includes('youtube.com/account')) {
                el.src = el.src.replace('youtube.com/account', `${cleanEndpoint}/login`);
            } else if (el.src.includes('youtube.com')) {
                el.src = el.src.replace('youtube.com', cleanEndpoint);
            } else if (el.src.includes('youtu.be')) {
                el.src = el.src.replace('youtu.be', cleanEndpoint);
            }
        }
    });
}

async function initContentScript() {
    const activeEndpoint = await getActiveEndpoint();
    if (!activeEndpoint) return;

    endpoint = activeEndpoint;

    if (window.location.hostname.includes('youtube.com') || window.location.hostname.includes('youtu.be')) {
        let newUrl = window.location.href;
        newUrl = newUrl.replace(/(www\.)?youtube\.com/, endpoint);
        newUrl = newUrl.replace(/youtu\.be/, endpoint);
        if (newUrl !== window.location.href) {
            window.location.href = newUrl;
            return;
        }
    }

    replaceYouTubeWithInvidious(endpoint);

    const observer = new MutationObserver(() => {
        replaceYouTubeWithInvidious(endpoint);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContentScript);
} else {
    initContentScript();
}