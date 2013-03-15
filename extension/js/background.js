// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
  // If the letter 'g' is found in the tab's URL...
  if ((/\.gif/).test(tab.url) > -1) {
    // ... show the page action.
    chrome.pageAction.show(tabId);
  }
};

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);
*/
/*
var callback = function headersReceived(details) {
	console.log('onHeadersReceived()');
	console.log(details);
	for (var i in details.responseHeaders) {
		if (details.responseHeaders[i].name.toLowerCase() == "content-type") {
			if (details.responseHeaders[i].value.toLowerCase() == "image/gif") {
				console.log('GIFPlayer!')
				chrome.pageAction.show(tabId);
			} else {
				break;
			}
		}
	}
};
var filter = {
	"urls": ["<all_urls>"]
};
var extraInfoSpec = [
	"responseHeaders"
];
chrome.webRequest.onHeadersReceived.addListener(callback, filter, extraInfoSpec);*/

/*
function onRequest(request, sender, sendResponse) {
  // Show the page action for the tab that the sender (content script)
  // was on.
  chrome.pageAction.show(sender.tab.id);
  // Return nothing to let the connection be cleaned up.
  sendResponse({});
  //
  // AUTO INJECT?
};

// Listen for the content script to send a message to the background page.
chrome.extension.onRequest.addListener(onRequest);
chrome.pageAction.onClicked.addListener(function(tab) {
	console.log('click!', tab);

  chrome.tabs.executeScript(sender.tab.id, {file:"jquery.min.js"}, function callback(result){});
  chrome.tabs.executeScript(sender.tab.id, {file:"main.js"}, function callback(result){});
  chrome.tabs.insertCSS(sender.tab.id, {file:""}, function callback(){});

});*/

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Global accessor that the popup uses.
var gifs = {};
var selectedGif = null;
var selectedId = null;

function updateGif(tabId) {
  console.log('updateGif()', tabId);
	chrome.tabs.sendMessage(tabId, {}, function(gif) {
    console.log('sendMessage() response', gif);
    gifs[tabId] = gif;
    if (!gif) {
      chrome.pageAction.hide(tabId);
    } else {
      chrome.pageAction.show(tabId);
      if (selectedId == tabId) {
        updateSelected(tabId);
      }
    }
  });
}

function updateSelected(tabId) {
  selectedGif = gifs[tabId];
  // if (selectedGif)
  //   chrome.pageAction.setTitle({tabId:tabId, title:selectedGif});
}

chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
  if (change.status == "complete") {
    updateGif(tabId);
  }
});

chrome.tabs.onSelectionChanged.addListener(function(tabId, info) {
  selectedId = tabId;
  updateSelected(tabId);
});

// Ensure the current selected tab is set up.
chrome.tabs.getSelected(null, function(tab) {
  updateGif(tab.id);
});

chrome.pageAction.onClicked.addListener(function(tab) {
	console.log('click!', tab);

  chrome.tabs.executeScript(sender.tab.id, {file:"jquery.min.js"}, function callback(result){});
  chrome.tabs.executeScript(sender.tab.id, {file:"main.js"}, function callback(result){});
  chrome.tabs.insertCSS(sender.tab.id, {file:""}, function callback(){});

});
