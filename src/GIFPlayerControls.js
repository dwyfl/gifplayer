(function(){

	var formattedNumber = function(n, decimalDigits){
		var str = n + '';
		var pointIndex = str.indexOf('.');
		if (pointIndex > -1) {
			var len = pointIndex + decimalDigits + 1;
			while (str.length < pointIndex + decimalDigits + 1)
				str += '0';
			return str.substr(0, pointIndex+decimalDigits + 1);
		} else {
			str += '.0';
			while (str.length < pointIndex + decimalDigits + 1)
				str += '0';
			return str;
		}
	};
	var LN2 = Math.log(2);
	var log2 = function(n){
		return Math.log(n)/LN2;
	};

	/**
	 * Controls for the GIFPlayer.
	 * Requires jQuery (1.9.1), for now.
	 **/
	var GIFPlayerControls = Class.extend({

		init : function(player){
			
			var self = this;
			var prefix = 'gifplay';
			
			this.player = player;
			this.elements = {
				container: $('<ul class="'+prefix+'-controls"/>'),
				previous: $('<li class="'+prefix+'-previous '+prefix+'-icon '+prefix+'-icon-previous"><a href="#"></a></li>'),
				play: $('<li class="'+prefix+'-play '+prefix+'-icon '+prefix+'-icon-play"><a href="#"></a></li>'),
				pause: $('<li class="'+prefix+'-pause '+prefix+'-icon '+prefix+'-icon-pause"><a href="#"></a></li>'),
				stop: $('<li class="'+prefix+'-stop '+prefix+'-icon '+prefix+'-icon-stop"><a href="#"></a></li>'),
				next: $('<li class="'+prefix+'-next '+prefix+'-icon '+prefix+'-icon-next"><a href="#"></a></li>'),
				fullscreen: $('<li class="'+prefix+'-fullscreen"><a href="#">Fullscreen</a></li>'),
				scrub: {
					container: $('<li class="'+prefix+'-scrub"><a href="#"></a></li>'),
					fill: $('<span class="'+prefix+'-scrub-fill"></span>')
				},
				extended: {
					size: $('<li class="'+prefix+'-slider"><label class="'+prefix+'-size-toggle">Size</label><input type="range" min="0.1" max="1" step="0.01" value="1.0" class="'+prefix+'-size"/><span class="value"></span></li>'),
					speed: $('<li class="'+prefix+'-slider"><label class="'+prefix+'-speed-toggle">Speed</label></label><input type="range" min="0.1" max="8" step="0.1" value="1.0" class="'+prefix+'-speed"/><span class="value"></span></li>'),
					loop: $('<li class="'+prefix+'-loop"><a href="#">Loop</a></li>'),
					pingpong: $('<li class="'+prefix+'-pingpong"><a href="#">Ping-pong</a></li>'),
					noloop: $('<li class="'+prefix+'-noloop"><a href="#">No loop</a></li>'),
					reverse: $('<li class="'+prefix+'-reverse disabled"><a href="#">Reverse</a></li>'),
				}
			};

			$(this.player.elements.container).append(this.elements.container);
			$(this.elements.container)
				.append(this.elements.previous)
				.append(this.elements.play)
				.append(this.elements.pause)
				.append(this.elements.stop)
				.append(this.elements.next)
				.append(this.elements.scrub.container)
				.append(this.elements.extended.loop)
				.append(this.elements.extended.pingpong)
				.append(this.elements.extended.noloop)
				.append(this.elements.extended.reverse)
				// .append(this.elements.fullscreen)
				.append(this.elements.extended.speed)
				.append(this.elements.extended.size);
			$(this.elements.scrub.container).find('a')
				.append(this.elements.scrub.fill);

			/* Control elements event handlers. */

			$(this.player.elements.canvas).click(function(){
				self.player.togglePlay();
				return false;
			});
			$(this.player.elements.canvas).dblclick(function(){
				self.fullscreen();
				return false;
			});
			$(this.elements.previous).click(function(){
				self.previous();
				return false;
			});
			$(this.elements.next).click(function(){
				self.next();
				return false;
			});
			$(this.elements.play).click(function(){
				self.play();
				return false;
			});
			$(this.elements.pause).click(function(){
				self.pause();
				return false;
			});
			$(this.elements.stop).click(function(){
				self.stop();
				return false;
			});
			$(this.elements.fullscreen).click(function(){
				self.fullscreen();
				return false;
			});
			$(this.elements.extended.loop)
				.add(this.elements.extended.noloop)
				.add(this.elements.extended.pingpong)
				.click(function(){
					self.player.toggleLoopMode();
					return false;
				});
			$(this.elements.extended.reverse).click(function(){
				self.player.toggleReverse();
				return false;
			});
			$(this.elements.extended.speed).change(function(){
				self.player.setSpeed($(this).find('input').val());
				return false;
			});
			$(this.elements.extended.size).change(function(){
				self.player.setSize($(this).find('input').val());
				return false;
			});
			$(this.elements.container).find('.'+prefix+'-speed-toggle').click(function(){
				self.toggleSpeed();
				return false;
			});
			var scrubMouseDown = function(e){
				var position = e.offsetX / $(self.elements.scrub.container).width();
				var frames = self.player.frames.length - 1;
				var frame = Math.min(frames, Math.max(0, Math.round(frames * position)));
				self.player.setFrame(frame)
				return false;
			};
			$(this.elements.scrub.container).mousedown(function(e){
				scrubMouseDown(e);
				$(this).mousemove(scrubMouseDown);
				$(document).one('mouseup', function(){
					$(self.elements.scrub.container).unbind('mousemove');
					return false;
				});
				return false;
			});

			/* GIFPlayer event handlers. */

			this.player.on(GIFPlayer.GIF_EVENT_SET_FRAME, function(e){
				self.setScrub(e);
			});
			this.player.on(GIFPlayer.GIF_EVENT_PLAY, function(e){
				$(self.elements.play).hide();
				$(self.elements.pause).show();
				$(self.elements.previous).addClass('disabled');
				$(self.elements.next).addClass('disabled');
			});
			this.player.on(GIFPlayer.GIF_EVENT_PAUSE, function(e){
				$(self.elements.play).show();
				$(self.elements.pause).hide();
				$(self.elements.previous).removeClass('disabled');
				$(self.elements.next).removeClass('disabled');
			});
			this.player.on(GIFPlayer.GIF_EVENT_STOP, function(e){
				$(self.elements.play).show();
				$(self.elements.pause).hide();
				$(self.elements.previous).removeClass('disabled');
				$(self.elements.next).removeClass('disabled');
			});
			this.player.on(GIFPlayer.GIF_EVENT_LOOP, function(e){
				$(self.elements.extended.loop).hide();
				$(self.elements.extended.pingpong).hide();
				$(self.elements.extended.noloop).hide();
				switch (e) {
					case GIFPlayer.LOOP_OFF:
						$(self.elements.extended.noloop).show();
						break;
					case GIFPlayer.LOOP_PING_PONG:
						$(self.elements.extended.pingpong).show();
						break;
					case GIFPlayer.LOOP_NORMAL:
						$(self.elements.extended.loop).show();
						break;
				}
			});
			this.player.on(GIFPlayer.GIF_EVENT_REVERSE, function(e){
				if (e)
					$(self.elements.extended.reverse).removeClass('disabled');
				else
					$(self.elements.extended.reverse).addClass('disabled');
			});
			this.player.on(GIFPlayer.GIF_EVENT_SPEED, function(e){
				$(self.elements.extended.speed).find('input').val(e);
				$(self.elements.extended.speed).find('.value').text(formattedNumber(e, 1));
			});
			this.player.on(GIFPlayer.GIF_EVENT_SIZE, function(e){
				$(self.elements.extended.size).find('input').val(e);
				$(self.elements.extended.size).find('.value').text(Math.round(e*100)+'%');
			});
			$(document).on('keydown', function(e) {
				switch (e.which) {
					case 27: // esc
					case 70: // f
						self.fullscreen();
						break;
					case 32: // space
						self.player.togglePlay();
						break;
					case 37: // <-
						if (!self.player.playing)
							self.player.showPreviousFrame();
						break;
					case 39: // ->
						if (!self.player.playing)
							self.player.showNextFrame();
						break;
					case 38: // up
						var speed = $(this.elements.extended.speed).find('input').val();
						this.player.setSpeed(speed + 0.2);
						break;
					case 40: // down
						var speed = $(this.elements.extended.speed).find('input').val();
						this.player.setSpeed(speed - 0.2);
						break;
					case 76: // L
						self.player.toggleLoopMode();
						break;
					case 82: // R
						self.player.toggleReverse();
						break;
					case 83: // S
						self.toggleSpeed();
						break;
				}
			});

			/* Some settings. */

			this.player.setLoopMode(GIFPlayer.LOOP_NORMAL);
			this.player.setSpeed(1.0);
			this.player.setSize(0.75);
		},

		setScrub : function(frame) {
			var width = Math.round(frame * 100 / (this.player.frames.length - 1));
			$(this.elements.scrub.fill).css({
				width: width + '%'
			});
		},

		play : function() {
			if (!this.player.playing)
				this.player.play();
		},

		pause : function() {
			if (this.player.playing)
				this.player.pause();
		},

		stop : function() {
			this.player.stop();
		},

		next : function() {
			if (!this.player.playing)
				this.player.showNextFrame();
		},

		previous : function() {
			if (!this.player.playing)
				this.player.showPreviousFrame();
		},

		toggleSpeed : function() {
			var speed = $(this.elements.extended.speed).find('input').val();
			var newSpeed = speed < 8 ? Math.pow(2, Math.round(log2(speed))+1) : 0.25;
			this.player.setSpeed(newSpeed);
		},

		fullscreen : function() {
			var self = this;
			var keyDownHandler = function(e) {
				switch (e.which) {
					case 27: // esc
					case 70: // f
						self.fullscreen();
						break;
					case 32: // space
						self.player.togglePlay();
						break;
					case 37: // <-
						if (!self.player.playing)
							self.player.showPreviousFrame();
						break;
					case 39: // ->
						if (!self.player.playing)
							self.player.showNextFrame();
						break;
					case 38: // up
						var speed = $(this.elements.extended.speed).find('input').val();
						this.player.setSpeed(speed + 0.2);
						break;
					case 40: // down
						var speed = $(this.elements.extended.speed).find('input').val();
						this.player.setSpeed(speed - 0.2);
						break;
					case 76: // L
						self.player.toggleLoopMode();
						break;
					case 82: // R
						self.player.toggleReverse();
						break;
					case 83: // S
						self.toggleSpeed();
						break;
				}
			};
			$(document).on('keydown', keyDownHandler);
		}
	});

	this.GIFPlayerControls = this.GIFPlayerControls || GIFPlayerControls;
	
})();