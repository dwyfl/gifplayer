(function(){
	/*
	var Base64Table = new Uint8Array(62);
	var Base64String = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	for (var i = 0; i < Base64String.length; i++)
		Base64Table[i] = Base64String[i];
	var Base64Decode = function(data){



		// http://kevin.vanzonneveld.net
		// +   original by: Tyler Akins (http://rumkin.com)
		// +   improved by: Thunder.m
		// +      input by: Aman Gupta
		// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   bugfixed by: Onno Marsman
		// +   bugfixed by: Pellentesque Malesuada
		// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +      input by: Brett Zamir (http://brett-zamir.me)
		// +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
		// *     returns 1: 'Kevin van Zonneveld'
		// mozilla has this native
		// - but breaks in 2.0.0.12!
		//if (typeof this.window['atob'] == 'function') {
		//    return atob(data);
		//}

		var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
			ac = 0,
			dec = "",
			tmp_arr = [];

		if (!data) {
			return data;
		}

		data += '';

		do { // unpack four hexets into three octets using index points in b64
			h1 = b64.indexOf(data.charAt(i++));
			h2 = b64.indexOf(data.charAt(i++));
			h3 = b64.indexOf(data.charAt(i++));
			h4 = b64.indexOf(data.charAt(i++));

			bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

			o1 = bits >> 16 & 0xff;
			o2 = bits >> 8 & 0xff;
			o3 = bits & 0xff;

			if (h3 == 64) {
				tmp_arr[ac++] = String.fromCharCode(o1);
			} else if (h4 == 64) {
				tmp_arr[ac++] = String.fromCharCode(o1, o2);
			} else {
				tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
			}
		} while (i < data.length);

		dec = tmp_arr.join('');

		return dec;
	}
	*/
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
	var loadImage = function(imageElement){
		var request = new XMLHttpRequest();
		if (request && imageElement){
			request.onreadystatechange = function(){
				if (request.readyState == 4) {
					loadImageComplete(request, imageElement);
				}
			};
			request.open("GET", imageElement.src, true);
			request.responseType = 'arraybuffer';
			try { request.send(null); } catch(e) {}
		}
	};
	var loadImageComplete = function(request, image){
		if (request &&
			request.status == 200 &&
			request.response &&
			request.responseType == 'arraybuffer') {
			
			var autostart = false;
			var bodyElement = document.getElementsByTagName('BODY');
			if (bodyElement &&
				bodyElement.length &&
				bodyElement[0].children.length == 1 &&
				bodyElement[0].children[0].tagName == 'IMG') {
				autostart = true;
			}

			var initialWidth = image.style.width || image.width;
			var initialHeight = image.style.height || image.height;
			var canvas = document.createElement("CANVAS");
			var parent = image.parentNode;
			if (parent) {
				parent.insertBefore(canvas, image);
				parent.removeChild(image);
			} else return;

			var gif = new GIF(request.response);
			var player = new GIFPlayer(gif, canvas);
			var controls = new GIFPlayerControls(player);

			player.canvas.style.width = initialWidth;
			player.canvas.style.height = initialHeight;

			if (autostart) {
				controls.play();
				controls.fullscreen();
			}
		}
	};

	var images = document.getElementsByTagName('img');
	for (var i = 0; i < images.length; ++i) {
		ifGif(images[i], function(el){ loadImage(el); });
	}

})();