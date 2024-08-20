let enable = document.getElementById("enable");
enable.onchange = () => {
    let value = false;
    if (enable.value == 'on'){value = true;}
    chrome.storage.sync.set({enable: value});
}

chrome.storage.sync.get('enable', (result)=>{
    if(result['enable']){
        enable.checked = true;
    }
})

let deako = document.getElementById("deakoIcon");

document.getElementById("open").addEventListener("click", () => {
    window.open("http://invidious.privacyredirect.com");
})

deako.addEventListener("click", ()=>{
    window.open("https://github.com/irdeako");
})

