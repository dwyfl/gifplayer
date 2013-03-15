$('img').each(function(){
	var self = this;
	var imageSrc = $(this).attr('src');
	if (imageSrc && imageSrc.substr(-4) == '.gif') {
		var request = new XMLHttpRequest();
		if (request){
			request.onreadystatechange = function(){
				if (request.readyState == 4) {
					imageLoaded(request, self);
				}
			};
			request.open("GET", imageSrc, true);
			request.responseType = 'arraybuffer';
			request.send(null);
		} else {
			alert("Unable to create request for GIF image, sorry.");
		}
	}
});

var imageLoaded = function(request, image){
	if (request && request.status == 200 &&
		request.response && request.responseType == 'arraybuffer') {

		var canvas = ($('<canvas/>').appendTo('body'))[0];
		var gif = new GIF(request.response);
		
		console.log(gif);

		var player;
		if (typeof(Glsl) != 'undefined' && Glsl.supported()) {
			player = new GIFPlayerWebGL(gif, canvas);
		} else {
			player = new GIFPlayer(gif, canvas);
		}
		var controls = new GIFPlayerControls(player);
		controls.play();
		controls.fullscreen();

		$(image).remove();
	}
};
