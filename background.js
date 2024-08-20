let endpoint = "invidious.privacyredirect.com";

let enable = false;
chrome.storage.sync.get('enable', (result)=>{
    enable = result['enable'];
})

document.addEventListener('DOMContentLoaded', () => {
    let xhr = new XMLHttpRequest();
    if(!enable){return;}
    xhr.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            endpoint = xhr.responseText;
            // instance = endpoint;
            if (!window.location.toString().trim().includes(endpoint.trim())) {
                function walkText(node, text, replace) {
                    if (node.nodeType === 3 && text.test(node.data)) {
                        node.data = node.data.replace(text, replace);
                    } else if (node.nodeType === 1 && node.nodeName !== "SCRIPT" && !node.closest('[contenteditable="true"]')) {
                        Array.from(node.attributes).forEach(function (attr) {
                            if (attr.specified && !(node.nodeName === "IMG" && attr.name === "src" || attr.name === "value")) {
                                if (text.test(attr.value)) {
                                    attr.value = attr.value.replace(text, replace);
                                }
                            }
                        });

                        Array.from(node.childNodes).forEach(function (childNode) {
                            walkText(childNode, text, replace);
                        });
                    }
                }

                function setup() {
                    walkText(document.body, /(www\.)?youtube\.com\/account/, endpoint + '/login');
                    walkText(document.body, /(www\.)?youtube\.com/, endpoint);
                    walkText(document.body, /youtube\.com/, endpoint);
                    walkText(document.body, /^https?:\/\/youtu.be/, 'https://');
                    walkText(document.body, /YouTube/, 'Invidious');
                    walkText(document.body, /youtube/, 'invidious');
                    walkText(document.body, /یوتیوب/, 'اینویدیوس');
                    walkText(document.body, /یوتوب/, 'اینویدیوس');
                    document.querySelectorAll('a').forEach((el) => {
                        if (el.href.includes('youtube.com/account')) {
                            el.href = el.href.replace('youtube.com/account', endpoint + '/login');
                        } else if (el.href.includes('youtube.com')) {
                            el.href = el.href.replace('youtube.com', endpoint);
                        } else if (el.href.includes('youtu.be')) {
                            el.href = el.href.replace('youtu.be', endpoint);
                        }
                    });
                    document.querySelectorAll('iframe').forEach((el) => {
                        if (el.src.includes('youtube.com/account')) {
                            el.src = el.src.replace('youtube.com/account', endpoint + '/login');
                        } else if (el.src.includes('youtube.com')) {
                            el.src = el.src.replace('youtube.com', endpoint);
                        } else if (el.src.includes('youtu.be')) {
                            el.src = el.src.replace('youtu.be', endpoint);
                        }
                    });
                }

                setup();
                const observer = new MutationObserver(() => {
                    setup();
                });
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    mutations: [
                        {
                            addedNodes: true,
                        },
                    ],
                });
            }
        }
    };
    xhr.open("GET", "https://raw.githubusercontent.com/idkvarghastaken/invidiouser/main/endpoint.txt", true);
    xhr.send();
});

if (window.location.host == "youtube.com"){
    if (enable){
        let location = window.location.toString();
        let newLoc = location.replace("youtube.com", endpoint);
        window.location = newLoc;
    }
}