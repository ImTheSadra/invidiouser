let urls = [];           // array of strings (valid URLs)
let extensionEnabled = true;

// DOM elements
const enableCheckbox = document.getElementById('enableExtension');
const openBtn = document.getElementById('openInvidiousBtn');
const urlInput = document.getElementById('urlInput');
const addBtn = document.getElementById('addUrlBtn');
const urlContainer = document.getElementById('urlListContainer');
const pingAllBtn = document.getElementById('pingAllBtn');
const clearAllBtn = document.getElementById('clearAllUrls');
const alertDiv = document.getElementById('alertMessage');
const themeToggle = document.getElementById('themeToggle');

// ======================== THEME LOGIC (light/dark + system) ========================
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
        // auto detect
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

// ======================== ALERT HELPER ========================
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

// ======================== CHROME STORAGE (sync URLs + enabled) ========================
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
                // default example instances if empty (for better onboarding)
                if (urls.length === 0) {
                    urls = ['https://yewtu.be', 'https://inv.riverside.rocks'];
                }
                extensionEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;
            }
            enableCheckbox.checked = extensionEnabled;
            resolve();
        });
    });
}

// ======================== RENDER URL LIST ========================
function renderUrlList() {
    if (!urlContainer) return;
    if (urls.length === 0) {
        urlContainer.innerHTML = `<div class="empty-state">🌱 No instances added. Add an Invidious URL above.</div>`;
        return;
    }

    urlContainer.innerHTML = '';
    urls.forEach((url, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'url-item';
        // truncate display
        const displayUrl = url.length > 45 ? url.substring(0, 42) + '...' : url;
        itemDiv.innerHTML = `
            <span class="url-text" title="${escapeHtml(url)}">${escapeHtml(displayUrl)}</span>
            <div class="item-actions">
                <button class="ping-single" data-index="${idx}" data-url="${escapeHtml(url)}">🏓 Ping</button>
                <button class="remove-single danger" data-index="${idx}">🗑️ Remove</button>
            </div>
        `;
        urlContainer.appendChild(itemDiv);
    });

    // attach event listeners dynamically for ping & remove
    document.querySelectorAll('.ping-single').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index'));
            const url = btn.getAttribute('data-url');
            if (!isNaN(idx)) pingSingleUrl(idx, url);
        });
    });

    document.querySelectorAll('.remove-single').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index'));
            if (!isNaN(idx)) removeUrlAtIndex(idx);
        });
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

// ======================== URL CRUD ========================
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

// ======================== PING LOGIC (fetch with timeout) ========================
async function pingUrlEndpoint(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'cors',
            cache: 'no-store',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
            return { success: true, status: response.status, url };
        } else {
            return { success: false, status: response.status, url, error: `HTTP ${response.status}` };
        }
    } catch (err) {
        clearTimeout(timeoutId);
        let errorMsg = err.message;
        if (err.name === 'AbortError') errorMsg = 'Timeout (5s)';
        return { success: false, url, error: errorMsg };
    }
}

async function pingSingleUrl(index, url) {
    if (!url) url = urls[index];
    if (!url) {
        showAlert('Invalid URL index', 'error');
        return;
    }
    showAlert(`🏓 Pinging ${url} ...`, 'info');
    const result = await pingUrlEndpoint(url);
    if (result.success) {
        showAlert(`✅ ${url} is reachable (${result.status})`, 'success');
    } else {
        showAlert(`❌ ${url} failed: ${result.error || 'unreachable'}`, 'error');
    }
}

async function pingAllUrls() {
    if (urls.length === 0) {
        showAlert('No URLs to ping. Add some instances first.', 'error');
        return;
    }
    showAlert(`🏓 Pinging ${urls.length} instance(s)...`, 'info');
    const promises = urls.map(url => pingUrlEndpoint(url));
    const results = await Promise.allSettled(promises);
    let successCount = 0;
    let failCount = 0;
    for (const res of results) {
        if (res.status === 'fulfilled' && res.value.success) successCount++;
        else failCount++;
    }
    if (successCount === urls.length) {
        showAlert(`✨ All ${urls.length} URLs responded successfully!`, 'success');
    } else {
        showAlert(`📡 Ping complete: ${successCount} OK, ${failCount} failed. Check alert history.`, 'error');
    }
}

// ======================== ENABLE EXTENSION HANDLER ========================
function updateEnableFlag() {
    extensionEnabled = enableCheckbox.checked;
    saveToStorage().catch(() => showAlert('Failed to save extension state', 'error'));
    showAlert(`Extension ${extensionEnabled ? 'enabled' : 'disabled'}`, 'success');
}

// ======================== OPEN INVIDIOUS (first working instance or first in list) ========================
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

// ======================== INITIALIZE AND EVENT LISTENERS ========================
async function init() {
    applyStoredTheme();
    await loadFromStorage();
    renderUrlList();
    enableCheckbox.checked = extensionEnabled;

    // Event listeners
    enableCheckbox.addEventListener('change', updateEnableFlag);
    openBtn.addEventListener('click', openInvidiousInstance);
    addBtn.addEventListener('click', addUrl);
    pingAllBtn.addEventListener('click', pingAllUrls);
    clearAllBtn.addEventListener('click', clearAllUrls);
    themeToggle.addEventListener('click', toggleTheme);

    // allow Enter key in input
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addUrl();
    });
}

// notify if chrome.storage is missing (dev env fallback)
if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('Chrome storage API not available — using localStorage fallback for demo');
    // provide a mock for demo (but still work)
    window.chrome = window.chrome || {};
    window.chrome.storage = {
        local: {
            get: (keys, cb) => {
                const mock = localStorage.getItem('invid_mock');
                const data = mock ? JSON.parse(mock) : {};
                cb({ invidiousUrls: data.urls || ['https://yewtu.be'], extensionEnabled: data.enabled !== false });
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