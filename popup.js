document.getElementById("enable").addEventListener("change", (event) => {
    const value = event.target.checked; 
    chrome.storage.sync.set({ enable: value });  
});

chrome.storage.sync.get('enable', (result) => {
    const enable = document.getElementById("enable");
    if (result['enable']) {
        enable.checked = true;  
    }
});

document.getElementById("open").addEventListener("click", () => {
    window.open("http://invidious.privacyredirect.com");
});

document.getElementById("deakoIcon").addEventListener("click", () => {
    window.open("https://github.com/irdeako");
});
