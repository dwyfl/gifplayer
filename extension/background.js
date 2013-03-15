
function update(tabId) {
    chrome.tabs.sendMessage(tabId, {}, function(result) {
        if (result && result.images && result.images.length) {
            if (result.autostart)
                play(tabId);
            chrome.pageAction.show(tabId);
        } else {
            chrome.pageAction.hide(tabId);
        }
    });
}

function play(tabId) {
    // Insert GIFPlayer JavaScript/CSS
    chrome.tabs.executeScript(tabId, {file:"gifplayer/lib/DataStream.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"gifplayer/src/Utils.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"gifplayer/src/LZW.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"gifplayer/src/GIF.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"gifplayer/src/GIFPlayer.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"gifplayer/src/GIFPlayerControls.js"}, function callback(result){});
    chrome.tabs.insertCSS(tabId,     {file:"gifplayer/src/GIFPlayer.css"}, function callback(){});
    // Insert extension JavaScript
    chrome.tabs.executeScript(tabId, {file:"js/jquery.min.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"js/main.js"}, function callback(result){});
}

chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
    if (change.status == "complete")
        update(tabId);
});

chrome.tabs.getSelected(null, function(tab) {
    update(tab.id);
});

chrome.pageAction.onClicked.addListener(function(tab) {
    play();
});