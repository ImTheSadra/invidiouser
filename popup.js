let urls = [];
let extensionEnabled = true;

// DOM elements
const enableCheckbox = document.getElementById('enableExtension');
const openBtn = document.getElementById('openInvidiousBtn');
const urlInput = document.getElementById('urlInput');
const addBtn = document.getElementById('addUrlBtn');
const endpoints = document.getElementById('endpoints');
const clearAllBtn = document.getElementById('clearAllUrls');
const alertDiv = document.getElementById('alertMessage');
const themeToggle = document.getElementById('themeToggle');

function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark');
        localStorage.setItem('invidTheme', 'dark');
    } else if (theme === 'light') {
        document.body.classList.remove('dark');
        localStorage.setItem('invidTheme', 'light');
    } else {
        // auto based on system
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.body.classList.add('dark');
            localStorage.setItem('invidTheme', 'auto-dark');
        } else {
            document.body.classList.remove('dark');
            localStorage.setItem('invidTheme', 'auto-light');
        }
    }
}

function applyStoredTheme() {
    const stored = localStorage.getItem('invidTheme');
    if (stored === 'dark') setTheme('dark');
    else if (stored === 'light') setTheme('light');
    else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    if (isDark) {
        setTheme('light');
    } else {
        setTheme('dark');
    }
    showAlert('Theme toggled', 'success');
}

function showAlert(message, type = 'info') {
    alertDiv.textContent = message;
    alertDiv.classList.remove('success', 'error');
    if (type === 'success') alertDiv.classList.add('success');
    else if (type === 'error') alertDiv.classList.add('error');
    setTimeout(() => {
        if (alertDiv.textContent === message) {
            alertDiv.classList.remove('success', 'error');
            alertDiv.textContent = '✨ Ready — manage Invidious instances';
        }
    }, 2800);
}

function saveToStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.set({
            invidiousUrls: urls,
            extensionEnabled: extensionEnabled
        }, () => {
            if (chrome.runtime.lastError) {
                console.warn(chrome.runtime.lastError);
                showAlert('Storage error', 'error');
            } else {
                resolve();
            }
        });
    });
}

function loadFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['invidiousUrls', 'extensionEnabled'], (result) => {
            if (chrome.runtime.lastError) {
                console.warn(chrome.runtime.lastError);
                urls = [];
                extensionEnabled = true;
            } else {
                urls = result.invidiousUrls || [];
                if (urls.length === 0) {
                    urls = ['https://inv.nadeko.net', 'https://invidious.nerdvpn.de'];
                }
                extensionEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;
            }
            enableCheckbox.checked = extensionEnabled;
            resolve();
        });
    });
}

function renderUrlList() {
    if (!urlContainer) return;
    if (urls.length === 0) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', "https://raw.githubusercontent.com/ImTheSadra/invidiouser/refs/heads/main/endpoints.txt", true);
        xhr.timeout = 5000;
        
        xhr.onload = function() {
            if(this.status == 200){
                all = this.responseText.split("\n");
                all.forEach(url => {addUrl(url)});
            }
        };
        
        xhr.send();
        return;
    }

    endpoints.innerHTML = '';
    urls.forEach((url, idx) => {
        const item = document.createElement('option');
        item.className = 'url-item';
        // truncate display
        const displayUrl = url.length > 45 ? url.substring(0, 42) + '...' : url;
        item.innerText = url;

        endpoints.appendChild(item);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
function addUrl() {
    let rawUrl = urlInput.value.trim();
    if (!rawUrl) {
        showAlert('Please enter a valid URL', 'error');
        return;
    }
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        rawUrl = 'https://' + rawUrl;
    }
    // basic URL validation
    try {
        new URL(rawUrl);
    } catch (e) {
        showAlert('Invalid URL format (e.g., https://example.com)', 'error');
        return;
    }
    if (urls.includes(rawUrl)) {
        showAlert('URL already exists', 'error');
        return;
    }
    urls.push(rawUrl);
    saveToStorage().then(() => {
        renderUrlList();
        urlInput.value = '';
        showAlert(`✅ Added: ${rawUrl}`, 'success');
    }).catch(() => showAlert('Failed to save', 'error'));
}

function removeUrlAtIndex(index) {
    if (index >= 0 && index < urls.length) {
        const removed = urls[index];
        urls.splice(index, 1);
        saveToStorage().then(() => {
            renderUrlList();
            showAlert(`Removed ${removed}`, 'success');
        }).catch(() => showAlert('Remove failed', 'error'));
    }
}

function clearAllUrls() {
    if (urls.length === 0) {
        showAlert('No URLs to clear', 'error');
        return;
    }
    urls = [];
    saveToStorage().then(() => {
        renderUrlList();
        showAlert('All instances cleared', 'success');
    }).catch(() => showAlert('Clear failed', 'error'));
}

function updateEnableFlag() {
    extensionEnabled = enableCheckbox.checked;
    saveToStorage().catch(() => showAlert('Failed to save extension state', 'error'));
    showAlert(`Extension ${extensionEnabled ? 'enabled' : 'disabled'}`, 'success');
}

function openInvidiousInstance() {
    if (!extensionEnabled) {
        showAlert('Extension is disabled. Enable it first.', 'error');
        return;
    }
    if (urls.length === 0) {
        showAlert('No Invidious instances added. Add a URL first.', 'error');
        return;
    }
    // try to open first url (most common action)
    const targetUrl = urls[0];
    chrome.tabs.create({ url: targetUrl }, () => {
        if (chrome.runtime.lastError) {
            showAlert('Failed to open tab: ' + chrome.runtime.lastError.message, 'error');
        } else {
            showAlert(`Opened ${targetUrl}`, 'success');
        }
    });
}

async function init() {
    applyStoredTheme();
    await loadFromStorage();
    renderUrlList();
    enableCheckbox.checked = extensionEnabled;

    enableCheckbox.addEventListener('change', updateEnableFlag);
    openBtn.addEventListener('click', openInvidiousInstance);
    addBtn.addEventListener('click', addUrl);
    clearAllBtn.addEventListener('click', clearAllUrls);
    themeToggle.addEventListener('click', toggleTheme);

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addUrl();
    });
}

if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('Chrome storage API not available — using localStorage fallback for demo');
    window.chrome = window.chrome || {};
    window.chrome.storage = {
        local: {
            get: (keys, cb) => {
                const mock = localStorage.getItem('invid_mock');
                const data = mock ? JSON.parse(mock) : {};
                cb({ invidiousUrls: data.urls || ['https://invidious.nerdvpn.de'], extensionEnabled: data.enabled !== false });
            },
            set: (obj, cb) => {
                localStorage.setItem('invid_mock', JSON.stringify({ urls: obj.invidiousUrls, enabled: obj.extensionEnabled }));
                if (cb) cb();
            }
        }
    };
    window.chrome.tabs = { create: (obj, cb) => { window.open(obj.url, '_blank'); if (cb) cb(); } };
    window.chrome.runtime = { lastError: null };
}

document.onload = init;