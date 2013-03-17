
$(document).ready(function(){
	var urls = [];
	$('img').each(function(){
		urls.push(this.src);
		$(this).remove();
	});
	var player = new GIFPlayer(urls);
});