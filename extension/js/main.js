(function(){
	
	var getFileExtension = function(url){
		if (typeof(url) !== 'string')
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
	var getContentType = function(url, callback){
		var request = new XMLHttpRequest();
		if (request && url) {
			request.open("HEAD", url, true);
			request.onreadystatechange = function() {
				if (request.readyState == 4) {
					callback(request.getResponseHeader("Content-Type"));
				}
			};
			try { request.send(null); } catch(e) {}
		}
	};
	var ifGif = function(imageElement, callback){
		if (!imageElement || !imageElement.src)
			return;
		var url = imageElement.src;
		if (url.substr(0, 5) == 'data:') {
			return;
		}
		// TODO: If "data:image/gif;base64,", we could base64 decode in js as well...
		var fileExtension = getFileExtension(url);
		if (fileExtension == 'gif') {
			callback(imageElement);
			return;
		}
		if (fileExtension === null) {
			getContentType(url, function(contentType){
				if (contentType == 'image/gif') {
					callback(imageElement);
				}
			});
		}
	};
	var running = false;
	var start = function(){
		
		if (running)
			return;

		var imageNodes = document.getElementsByTagName('img');
		var images = [];
		for (var i = imageNodes.length; i--; images.unshift(imageNodes[i])) ;

		var iframes = document.getElementsByTagName('iframe');
		for (var i = 0; i < iframes.length; ++i) {
			var iframeDocument = iframes[i].contentWindow ? iframes[i].contentWindow.document : iframes[i].contentDocument;
			var iframeImages = iframeDocument ? iframeDocument.getElementsByTagName('img') : [];
			for (var j = 0; j < iframeImages.length; images.push(iframeImages[j++])) ;
		}

		var loadedImages = [];
		var player = null;
		for (var i = 0; i < images.length; ++i) {
			ifGif(images[i], function(el){
				el.style['visibility'] = 'hidden';
				loadedImages.push(el);
				if (player === null) {
					player = new GIFPlayer(el.src);
					player.once(GIFPlayer.GIF_EVENT_CLOSE, function(){
						player.removeAllListeners();
						player = null;
						running = false;
						for (var i = 0; i < loadedImages.length; ++i) {
							loadedImages[i].style['visibility'] = null;
						}
					});
					chrome.storage.sync.get(null, function(settings){
						if (settings['size']) {
							if (player.loading) {
								player.once(GIFPlayer.LOAD_COMPLETE, function(){
									player.setSize(settings['size']);
								});
							} else {
								player.setSize(settings['size']);
							}
						}
					});
					player.on(GIFPlayer.GIF_EVENT_SIZE, function(size){
						chrome.storage.sync.set({'size': size});
					});
					running = true;
				} else {
					player.addUrl(el.src);
				}
			});
		}
	};

	chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
		if (request.type == 'start')
			start();
	});
	
	start();

})();