
function insertGIFPlayer(tabId) {
    // Insert GIFPlayer JavaScript/CSS
    chrome.tabs.executeScript(tabId, {file:"gifplayer/lib/DataStream.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"gifplayer/lib/jquery.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"gifplayer/src/Utils.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"gifplayer/src/LZW.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"gifplayer/src/GIF.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"gifplayer/src/GIFPlayer.js"}, function callback(result){});
    chrome.tabs.executeScript(tabId, {file:"gifplayer/src/GIFPlayerControls.js"}, function callback(result){});
    chrome.tabs.insertCSS(tabId,     {file:"gifplayer/src/css/GIFPlayer.css"}, function callback(){});
    // Insert extension JavaScript
    chrome.tabs.executeScript(tabId, {file:"js/main.js"}, function callback(result){});
}

function update(tabId) {
    chrome.tabs.sendMessage(tabId, {type:'findgif'}, function(result) {
        if (result && result.images && result.images.length) {
            if (result.autostart)
                insertGIFPlayer(tabId);
            chrome.pageAction.show(tabId);
        } else {
            chrome.pageAction.hide(tabId);
        }
    });
}

chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
    if (change.status == "complete")
        update(tabId);
});

chrome.tabs.getSelected(null, function(tab) {
    update(tab.id);
});

chrome.pageAction.onClicked.addListener(function(tab) {
    insertGIFPlayer();
});