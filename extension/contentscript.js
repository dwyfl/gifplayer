var getFileExtension = function(url){
	if (!url)
		return null;
	var urlQuery = url.indexOf('?');
	var urlHash = url.indexOf('#');
	if (urlQuery > -1 || urlHash > -1)
		url = url.substr(0, Math.min(urlQuery, urlHash));
	var urlSlash = url.lastIndexOf('/');
	if (urlSlash > -1)
		url = url.substr(urlSlash);
	var regexp = /^[^.]+\.(.+)$/;
	var match = url.match(regexp);
	if (match && match.length >= 2)
		return match[1];
	return null;
}
var checkPageForGifs = function() {
	var result = [];
	var autostart = false;
	var bodyElement = document.getElementsByTagName('BODY');
	if (bodyElement &&
		bodyElement.length &&
		bodyElement[0].children.length == 1 &&
		bodyElement[0].children[0].tagName == 'IMG') {
		autostart = true;
	}
	var images = document.getElementsByTagName('img');
	for (var i = 0; i < images.length; ++i) {
		var imageSrc = images[i].src;
		var imageExt = getFileExtension(imageSrc);
		if (imageExt == 'gif' || imageExt === null) {
			result.push(imageSrc);
		}
	}
	return {
		autostart: autostart,
		images: result
	};
};

if (window == top) {
	chrome.extension.onMessage.addListener(function(req, sender, sendResponse) {
		// console.log(req);
		sendResponse(checkPageForGifs());
	});
}
