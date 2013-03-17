
$(document).ready(function(){
	$('img').each(function(){
		var player = new GIFPlayer(this.src);
		$(this).remove();
	});
});