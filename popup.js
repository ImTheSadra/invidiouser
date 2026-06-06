let urls = [];
let extensionEnabled = true;
let selectedUrl = '';

const enableCheckbox = document.getElementById('enableExtension');
const openBtn = document.getElementById('openInvidiousBtn');
const urlInput = document.getElementById('urlInput');
const addBtn = document.getElementById('addUrlBtn');
const urlContainer = document.getElementById('urlListContainer');
const pingAllBtn = document.getElementById('pingAllBtn');
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
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) document.body.classList.add('dark');
        else document.body.classList.remove('dark');
        localStorage.setItem('invidTheme', 'auto');
    }
}

function applyStoredTheme() {
    const stored = localStorage.getItem('invidTheme');
    if (stored === 'dark') setTheme('dark');
    else if (stored === 'light') setTheme('light');
    else setTheme('auto');
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    setTheme(isDark ? 'light' : 'dark');
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
            extensionEnabled: extensionEnabled,
            selectedUrl: selectedUrl
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
        chrome.storage.local.get(['invidiousUrls', 'extensionEnabled', 'selectedUrl'], (result) => {
            if (chrome.runtime.lastError) {
                urls = [];
                extensionEnabled = true;
            } else {
                urls = result.invidiousUrls || [];
                extensionEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;
                selectedUrl = result.selectedUrl || '';
            }
            enableCheckbox.checked = extensionEnabled;
            resolve();
        });
    });
}

async function fetchDefaultUrlsFromTxt() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/ImTheSadra/invidiouser/refs/heads/main/endpoints.txt');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const text = await response.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim() && line.startsWith('http'));
        for (let line of lines) {
            let cleanUrl = line.trim();
            if (!urls.includes(cleanUrl)) {
                urls.push(cleanUrl);
            }
        }
        if (urls.length === 0) {
            // fallback defaults
            urls = ['https://inv.nadeko.net', 'https://invidious.nerdvpn.de'];
        }
        // auto-select first if none selected
        if (!selectedUrl && urls.length) selectedUrl = urls[0];
        await saveToStorage();
        renderUrlList();
    } catch (err) {
        console.warn('Could not fetch endpoints.txt, using defaults', err);
        if (urls.length === 0) {
            urls = ['https://inv.nadeko.net', 'https://invidious.nerdvpn.de'];
            if (!selectedUrl) selectedUrl = urls[0];
            await saveToStorage();
            renderUrlList();
        }
    }
}

function renderUrlList() {
    if (!urlContainer) return;
    if (urls.length === 0) {
        urlContainer.innerHTML = `<div class="empty-state">🌱 No instances. Add one above or fetch defaults.</div>`;
        return;
    }

    urlContainer.innerHTML = '';
    urls.forEach((url, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'url-item';
        const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
        const isChecked = (selectedUrl === url);
        itemDiv.innerHTML = `
            <div class="url-info">
                <input type="radio" name="selectedInstance" value="${escapeHtml(url)}" ${isChecked ? 'checked' : ''}>
                <span class="url-text" title="${escapeHtml(url)}">${escapeHtml(displayUrl)}</span>
            </div>
            <div class="item-actions">
                <button class="remove-single" data-url="${escapeHtml(url)}">🗑️</button>
            </div>
        `;
        urlContainer.appendChild(itemDiv);
    });

    document.querySelectorAll('input[name="selectedInstance"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedUrl = e.target.value;
                saveToStorage();
                showAlert(`Selected: ${selectedUrl}`, 'success');
            }
        });
    });

    document.querySelectorAll('.remove-single').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const url = btn.getAttribute('data-url');
            await removeUrlByValue(url);
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
async function addUrl(rawUrl) {
    if (!rawUrl) {
        showAlert('Please enter a URL', 'error');
        return false;
    }
    let cleanUrl = rawUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
    }
    try {
        new URL(cleanUrl);
    } catch (e) {
        showAlert('Invalid URL format', 'error');
        return false;
    }
    if (urls.includes(cleanUrl)) {
        showAlert('URL already exists', 'error');
        return false;
    }
    urls.push(cleanUrl);
    if (!selectedUrl) selectedUrl = cleanUrl;
    await saveToStorage();
    renderUrlList();
    urlInput.value = '';
    showAlert(`✅ Added: ${cleanUrl}`, 'success');
    return true;
}

async function removeUrlByValue(urlToRemove) {
    const index = urls.indexOf(urlToRemove);
    if (index === -1) return;
    urls.splice(index, 1);
    if (selectedUrl === urlToRemove) {
        selectedUrl = urls.length > 0 ? urls[0] : '';
    }
    await saveToStorage();
    renderUrlList();
    showAlert(`Removed ${urlToRemove}`, 'success');
}

async function clearAllUrls() {
    if (urls.length === 0) {
        showAlert('No URLs to clear', 'error');
        return;
    }
    urls = [];
    selectedUrl = '';
    await saveToStorage();
    renderUrlList();
    showAlert('All instances cleared', 'success');
}

function openSelectedInstance() {
    if (!extensionEnabled) {
        showAlert('Extension is disabled.', 'error');
        return;
    }
    if (urls.length === 0) {
        showAlert('No instances. Add a URL first.', 'error');
        return;
    }
    let target = selectedUrl;
    if (!target || !urls.includes(target)) {
        target = urls[0];
        selectedUrl = target;
        saveToStorage();
    }
    chrome.tabs.create({ url: target }, () => {
        if (chrome.runtime.lastError) {
            showAlert('Failed to open tab: ' + chrome.runtime.lastError.message, 'error');
        } else {
            showAlert(`Opened ${target}`, 'success');
        }
    });
}

function updateEnableFlag() {
    extensionEnabled = enableCheckbox.checked;
    saveToStorage();
    showAlert(`Extension ${extensionEnabled ? 'enabled' : 'disabled'}`, 'success');
}

async function init() {
    applyStoredTheme();
    await loadFromStorage();

    if (urls.length === 0) {
        await fetchDefaultUrlsFromTxt();
    } else {
        if (!selectedUrl && urls.length) selectedUrl = urls[0];
        renderUrlList();
    }

    enableCheckbox.checked = extensionEnabled;

    enableCheckbox.addEventListener('change', updateEnableFlag);
    openBtn.addEventListener('click', openSelectedInstance);
    addBtn.addEventListener('click', () => addUrl(urlInput.value));
    clearAllBtn.addEventListener('click', clearAllUrls);
    themeToggle.addEventListener('click', toggleTheme);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addUrl(urlInput.value);
    });
}

if (typeof chrome === 'undefined' || !chrome.storage) {
    console.warn('Chrome storage API not available — using localStorage fallback');
    window.chrome = window.chrome || {};
    window.chrome.storage = {
        local: {
            get: (keys, cb) => {
                const mock = localStorage.getItem('invid_mock');
                const data = mock ? JSON.parse(mock) : {};
                cb({
                    invidiousUrls: data.urls || [],
                    extensionEnabled: data.enabled !== false,
                    selectedUrl: data.selectedUrl || ''
                });
            },
            set: (obj, cb) => {
                localStorage.setItem('invid_mock', JSON.stringify({
                    urls: obj.invidiousUrls,
                    enabled: obj.extensionEnabled,
                    selectedUrl: obj.selectedUrl
                }));
                if (cb) cb();
            }
        }
    };
    window.chrome.tabs = { create: (obj, cb) => { window.open(obj.url, '_blank'); if (cb) cb(); } };
    window.chrome.runtime = { lastError: null };
}

init();