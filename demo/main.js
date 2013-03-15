
$(document).ready(function(){
	$('img').each(function(){
		var imageSrc = $(this).attr('src');
		if (imageSrc && imageSrc.substr(-4) == '.gif') {
			var req = new XMLHttpRequest();
			req.open("GET", imageSrc, true);
			req.onload = imageLoaded;
			req.responseType = 'arraybuffer';
			req.send(null);
			$(this).remove();
		}
	});
});

var imageLoaded = function(xhr){
	if (xhr.srcElement && xhr.srcElement.status == 200 &&
		xhr.srcElement.response && xhr.srcElement.responseType == 'arraybuffer') {

		var canvas = ($('<canvas/>').appendTo('body'))[0];
		var gif = new GIF(xhr.srcElement.response);
		
		console.log(gif);

		var player = new GIFPlayer(gif, canvas);
		var controls = new GIFPlayerControls(player);
		
		player.play();
	}
};
