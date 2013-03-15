
var checkPageForGifs = function() {
	var autostart = false;
	var result = [];
	var bodyElement = document.getElementsByTagName('body');
	if (bodyElement && bodyElement.length &&
		bodyElement[0].children.length == 1 && bodyElement[0].children[0].tagName == 'IMG') {
		autostart = true;
	}
	var regexp = /^.+\.gif$/;
	var images = document.getElementsByTagName('img');
	for (var i = 0; i < images.length; ++i) {
		var imageSrc = images[i].src;
		var imageSrcQuery = imageSrc.indexOf('?');
		var imageSrcHash = imageSrc.indexOf('#');
		if (imageSrcQuery > -1 || imageSrcHash > -1)
			imageSrc = imageSrc.substr(0, Math.min(imageSrcQuery, imageSrcHash));
		if (regexp.test(imageSrc))
			result.push(imageSrc);
	}
	return {
		autostart: autostart,
		images: result
	};
};

if (window == top) {
	chrome.extension.onMessage.addListener(function(req, sender, sendResponse) {
		sendResponse(checkPageForGifs());
	});
}
