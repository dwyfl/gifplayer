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
	 * Depends of jQuery for now.
	 **/
	var GIFPlayerControls = Class.extend({

		init : function(player){
			
			var self = this;
			var prefix = 'gifplay';
			
			this.player = player;

			this.elements = {
				container: $('<div class="'+prefix+'"/>'),
				controls: {
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
						size: $('<li class="'+prefix+'-slider"><label>Size</label><input type="range" min="1" max="100" step="1" class="'+prefix+'-size"/><span class="value"></span></li>'),
						speed: $('<li class="'+prefix+'-slider"><label class="'+prefix+'-speedreset">Speed</label></label><input type="range" min="0.1" max="8" step="0.1" class="'+prefix+'-speed"/><span class="value"></span></li>'),
						loop: $('<li class="'+prefix+'-loop"><a href="#">Loop</a></li>'),
						pingpong: $('<li class="'+prefix+'-pingpong"><a href="#">Ping-pong</a></li>'),
						noloop: $('<li class="'+prefix+'-noloop"><a href="#">No loop</a></li>'),
						reverse: $('<li class="'+prefix+'-reverse disabled"><a href="#">Reverse</a></li>'),
					}
				}
			};

			$(this.player.canvas).after(this.elements.container);
			$(this.elements.container)
				.append(this.player.canvas)
				.append(this.elements.controls.container)
				.css({
					// width: this.player.canvas.width,
					// height: this.player.canvas.height,
				});
			$(this.elements.controls.container)
				.append(this.elements.controls.previous)
				.append(this.elements.controls.play)
				.append(this.elements.controls.pause)
				.append(this.elements.controls.stop)
				.append(this.elements.controls.next)
				.append(this.elements.controls.scrub.container)
				.append(this.elements.controls.extended.loop)
				.append(this.elements.controls.extended.pingpong)
				.append(this.elements.controls.extended.noloop)
				.append(this.elements.controls.extended.reverse)
				.append(this.elements.controls.fullscreen)
				.append(this.elements.controls.extended.speed)
				.css({
					// marginLeft: this.player.canvas.width >= 240 ? '-50%' : -(((240 - this.player.canvas.width) + this.player.canvas.width)*0.5)
				});

			$(this.elements.controls.scrub.container).find('a')
				.append(this.elements.controls.scrub.fill);

			/* Control elements event handlers. */

			$(this.player.canvas).click(function(){
				self.player.togglePlay();
			});
			$(this.elements.controls.previous).click(function(){
				self.previous();
				return false;
			});
			$(this.elements.controls.next).click(function(){
				self.next();
				return false;
			});
			$(this.elements.controls.play).click(function(){
				self.play();
				return false;
			});
			$(this.elements.controls.pause).click(function(){
				self.pause();
				return false;
			});
			$(this.elements.controls.stop).click(function(){
				self.stop();
				return false;
			});
			$(this.elements.controls.fullscreen).click(function(){
				self.fullscreen();
				return false;
			});
			$(this.elements.controls.extended.loop)
				.add(this.elements.controls.extended.noloop)
				.add(this.elements.controls.extended.pingpong)
				.click(function(){
					self.player.toggleLoopMode();
					return false;
				});
			$(this.elements.controls.extended.reverse).click(function(){
				self.player.toggleReverse();
				return false;
			});
			$(this.elements.controls.extended.speed).change(function(){
				self.player.setSpeed($(this).find('input').val());
				return false;
			});
			$(this.elements.controls.container).find('.'+prefix+'-speedreset').click(function(){
				self.toggleSpeed();
				return false;
			});
			var scrubMouseDown = function(e){
				var position = e.offsetX / $(self.elements.controls.scrub.container).width();
				var frames = self.player.frames.length - 1;
				var frame = Math.min(frames, Math.max(0, Math.round(frames * position)));
				self.player.setFrame(frame)
				return false;
			};
			$(this.elements.controls.scrub.container).mousedown(function(e){
				scrubMouseDown(e);
				$(this).mousemove(scrubMouseDown);
				$(document).one('mouseup', function(){
					$(self.elements.controls.scrub.container).unbind('mousemove');
					return false;
				});
				return false;
			});

			/* GIFPlayer event handlers. */

			this.player.on(GIFPlayer.GIF_EVENT_SET_FRAME, function(e){
				self.setScrub(e);
			});
			this.player.on(GIFPlayer.GIF_EVENT_PLAY, function(e){
				$(self.elements.controls.play).hide();
				$(self.elements.controls.pause).show();
				$(self.elements.controls.previous).addClass('disabled');
				$(self.elements.controls.next).addClass('disabled');
			});
			this.player.on(GIFPlayer.GIF_EVENT_PAUSE, function(e){
				$(self.elements.controls.play).show();
				$(self.elements.controls.pause).hide();
				$(self.elements.controls.previous).removeClass('disabled');
				$(self.elements.controls.next).removeClass('disabled');
			});
			this.player.on(GIFPlayer.GIF_EVENT_STOP, function(e){
				$(self.elements.controls.play).show();
				$(self.elements.controls.pause).hide();
				$(self.elements.controls.previous).removeClass('disabled');
				$(self.elements.controls.next).removeClass('disabled');
			});
			this.player.on(GIFPlayer.GIF_EVENT_LOOP, function(e){
				$(self.elements.controls.extended.loop).hide();
				$(self.elements.controls.extended.pingpong).hide();
				$(self.elements.controls.extended.noloop).hide();
				switch (e) {
					case GIFPlayer.LOOP_OFF:
						$(self.elements.controls.extended.noloop).show();
						break;
					case GIFPlayer.LOOP_PING_PONG:
						$(self.elements.controls.extended.pingpong).show();
						break;
					case GIFPlayer.LOOP_NORMAL:
						$(self.elements.controls.extended.loop).show();
						break;
				}
			});
			this.player.on(GIFPlayer.GIF_EVENT_REVERSE, function(e){
				if (e)
					$(self.elements.controls.extended.reverse).removeClass('disabled');
				else
					$(self.elements.controls.extended.reverse).addClass('disabled');
			});
			this.player.on(GIFPlayer.GIF_EVENT_SPEED, function(e){
				$(self.elements.controls.extended.speed).find('input').val(e);
				$(self.elements.controls.extended.speed).find('.value').text(formattedNumber(e, 1));
			});

			/* Some settings. */

			this.player.setLoopMode(GIFPlayer.LOOP_NORMAL);
			this.player.setSpeed(1.0);

			$(window).resize(function(){ self.resize(); });
		},

		resize : function() {
			if (!$(this.elements.container).hasClass('gifplay-overlay'))
				return;
			var windowWidth = $(window).width();
			var windowHeight = $(window).height();
			var windowRatio = $(window).height()/$(window).width();
			var gifRatio = this.player.gif.header.height/this.player.gif.header.width;
			console.log($(window).height(), $(window).width(), $(window).height()/$(window).width());
			if (windowRatio < gifRatio) {
				$(this.player.canvas).css({height: '100%', width: 'auto', marginTop: 0});
			} else {
				var height = gifRatio * windowWidth;
				$(this.player.canvas).css({height: 'auto', width: '100%', marginTop: (windowHeight - height) * 0.5});
			}
		},

		setScrub : function(frame) {
			var width = Math.round(frame * 100 / (this.player.frames.length - 1));
			$(this.elements.controls.scrub.fill).css({
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
			var speed = $(this.elements.controls.extended.speed).find('input').val();
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
			$(this.elements.container).toggleClass('gifplay-overlay');
			if (!$(this.elements.container).hasClass('gifplay-overlay')) {
				$(this.player.canvas).css({height:'auto', width:'auto',marginTop:0});
				$(document).off('keydown');
			} else {
				this.resize();
				$(document).on('keydown', keyDownHandler);
			}
		}
	});

	this.GIFPlayerControls = this.GIFPlayerControls || GIFPlayerControls;
	
})();