let endpoint = "https://inv.nadeko.net";
let enable = false;

chrome.storage.sync.get('enable', (result) => {
    enable = result['enable'];
    if (enable == undefined){
        enable = true;
        chrome.storage.sync.set({'enable': true});
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (!enable) return;

    fetch("https://raw.githubusercontent.com/ImTheSadra/invidiouser/refs/heads/main/endpoint.txt")
        .then(response => response.text())
        .then(data => {
            endpoint = data.trim();

            if (!window.location.toString().trim().includes(endpoint)) {
                // Function to replace text nodes and attributes
                function walkText(node, text, replace) {
                    if (node.nodeType === 3 && text.test(node.data)) {
                        node.data = node.data.replace(text, replace);
                    } else if (node.nodeType === 1 && node.nodeName !== "SCRIPT" && !node.closest('[contenteditable="true"]')) {
                        Array.from(node.attributes).forEach(attr => {
                            if (attr.specified && !(node.nodeName === "IMG" && attr.name === "src" || attr.name === "value")) {
                                if (text.test(attr.value)) {
                                    attr.value = attr.value.replace(text, replace);
                                }
                            }
                        });
                        Array.from(node.childNodes).forEach(childNode => walkText(childNode, text, replace));
                    }
                }

                // Replace text on the page
                function setup() {
                    walkText(document.body, /(www\.)?youtube\.com\/account/, `${endpoint}/login`);
                    walkText(document.body, /(www\.)?youtube\.com/, endpoint);
                    walkText(document.body, /youtube\.com/, endpoint);
                    walkText(document.body, /^https?:\/\/youtu.be/, 'https://');
                    walkText(document.body, /YouTube/, 'Invidious');
                    walkText(document.body, /youtube/, 'invidious');
                    walkText(document.body, /یوتیوب/, 'اینویدیوس');
                    walkText(document.body, /یوتوب/, 'اینویدیوس');

                    // Update links and iframes
                    document.querySelectorAll('a').forEach(el => {
                        if (el.href.includes('youtube.com/account')) {
                            el.href = el.href.replace('youtube.com/account', `${endpoint}/login`);
                        } else if (el.href.includes('youtube.com')) {
                            el.href = el.href.replace('youtube.com', endpoint);
                        } else if (el.href.includes('youtu.be')) {
                            el.href = el.href.replace('youtu.be', endpoint);
                        }
                    });

                    document.querySelectorAll('iframe').forEach(el => {
                        if (el.src.includes('youtube.com/account')) {
                            el.src = el.src.replace('youtube.com/account', `${endpoint}/login`);
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
                });
            }
        })
        .catch(error => console.error("Error fetching endpoint:", error));
});

if (window.location.host === "youtube.com" && enable) {
    const newLoc = window.location.toString().replace("youtube.com", endpoint);
    window.location = newLoc;
}
