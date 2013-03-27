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
	var GIFPlayerControls = function(player){
		
		var self = this;
		var prefix = 'gifplayer';
		
		this.player = player;
		this.elements = {
			container: $('<ul id="'+prefix+'-controls"/>')[0],
			previous: $('<li class="'+prefix+'-previous '+prefix+'-icon '+prefix+'-icon-previous"><a href="#" title="Previous frame (left arrow)"></a></li>')[0],
			play: $('<li class="'+prefix+'-play '+prefix+'-icon '+prefix+'-icon-play"><a href="#" title="Play (space)"></a></li>')[0],
			pause: $('<li class="'+prefix+'-pause '+prefix+'-icon '+prefix+'-icon-pause"><a href="#" title="Pause (space)"></a></li>')[0],
			stop: $('<li class="'+prefix+'-stop '+prefix+'-icon '+prefix+'-icon-stop"><a href="#" title="Stop (esc)"></a></li>')[0],
			next: $('<li class="'+prefix+'-next '+prefix+'-icon '+prefix+'-icon-next"><a href="#" title="Next frame (right arrow)"></a></li>')[0],
			scrub: {
				container: $('<li class="'+prefix+'-scrub"><a href="#"></a></li>')[0],
				fill: $('<span class="'+prefix+'-scrub-fill"></span>')[0]
			},
			extended: {
				size: $('<li class="'+prefix+'-slider"><label class="'+prefix+'-size-toggle">Size</label><input type="range" min="0.1" max="1" step="0.01" value="1.0" class="'+prefix+'-size"/><output for="" class="value"></output></li>')[0],
				speed: $('<li class="'+prefix+'-slider"><label class="'+prefix+'-speed-toggle">Speed</label></label><input type="range" min="0.1" max="8" step="0.1" value="1.0" class="'+prefix+'-speed"/><output for="" class="value"></output></li>')[0],
				loop: $('<li class="'+prefix+'-loop"><a href="#" title="Toggle loop mode (L)">Loop</a></li>')[0],
				pingpong: $('<li class="'+prefix+'-pingpong"><a href="#">Ping-pong</a></li>')[0],
				noloop: $('<li class="'+prefix+'-noloop"><a href="#">No loop</a></li>')[0],
				reverse: $('<li class="'+prefix+'-reverse disabled"><a href="#" title="Play reverse (R)">Reverse</a></li>')[0]
			}
		};

		this.player.elements.container.appendChild(this.elements.container);
		this.elements.container.appendChild(this.elements.previous)
		this.elements.container.appendChild(this.elements.play)
		this.elements.container.appendChild(this.elements.pause)
		this.elements.container.appendChild(this.elements.stop)
		this.elements.container.appendChild(this.elements.next)
		this.elements.container.appendChild(this.elements.scrub.container)
		this.elements.container.appendChild(this.elements.extended.loop)
		this.elements.container.appendChild(this.elements.extended.pingpong)
		this.elements.container.appendChild(this.elements.extended.noloop)
		this.elements.container.appendChild(this.elements.extended.reverse)
		this.elements.container.appendChild(this.elements.extended.speed)
		this.elements.container.appendChild(this.elements.extended.size);

		$(this.elements.scrub.container).find('a')
			.append(this.elements.scrub.fill);

		/* Control elements event handlers. */

		this.player.elements.canvas.onclick = function(){
			self.player.togglePlay();
			return false;
		};
		this.elements.previous.onclick = function(){
			self.previous();
			return false;
		};
		this.elements.next.onclick = function(){
			self.next();
			return false;
		};
		this.elements.play.onclick = function(){
			self.play();
			return false;
		};
		this.elements.pause.onclick = function(){
			self.pause();
			return false;
		};
		this.elements.stop.onclick = function(){
			self.stop();
			return false;
		};
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
			self.increaseSpeed(1);
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
		var onSetSpeed = function(speed){
			$(self.elements.extended.speed).find('input').val(speed);
			$(self.elements.extended.speed).find('.value').text(formattedNumber(speed, 1));
		};
		var onSetSize = function(size){
			$(self.elements.extended.size).find('input').val(size);
			$(self.elements.extended.size).find('.value').text(Math.round(size*100)+'%');
		};
		this.player.on(GIFPlayer.GIF_EVENT_SPEED, onSetSpeed);
		this.player.on(GIFPlayer.GIF_EVENT_SIZE, onSetSize);

		onSetSpeed(this.player.getSpeed());
		onSetSize(this.player.getSize());

		/* Short keys. */

		$(document).on('keydown', function(e) {
			switch (e.which) {
				case 27: // esc
					self.player.close();
					break;
				case 32: // space
					self.player.togglePlay();
					return false;
					break;
				case 37: // <-
					if (e.shiftKey) {
						self.player.loadPrevious();
						break;
					}
					if (self.player.playing) {
						var speed = Math.round($(self.elements.extended.speed).find('input').val() * 10) * 0.1;
						self.player.setSpeed(parseFloat(speed) - 0.1);
					} else {
						self.previous();
					}
					break;
				case 39: // ->
					if (e.shiftKey) {
						self.player.loadNext();
						break;
					}
					if (self.player.playing) {
						var speed = Math.round($(self.elements.extended.speed).find('input').val() * 10) * 0.1;
						self.player.setSpeed(parseFloat(speed) + 0.1);
					} else {
						self.next();
					}
					break;
				case 38: // up
					var size = $(self.elements.extended.size).find('input').val();
					self.player.setSize(parseFloat(size) + 0.05);
					break;
				case 40: // down
					var size = $(self.elements.extended.size).find('input').val();
					self.player.setSize(parseFloat(size) - 0.05);
					break;
				case 76: // L
					self.player.toggleLoopMode();
					break;
				case 82: // R
					self.player.toggleReverse();
					break;
				case 83: // S
					self.increaseSpeed(e.shiftKey ? -1 : 1);
					break;
			}
		});
	};

	GIFPlayerControls.prototype = {

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

		increaseSpeed : function(amount) {
			var speed = $(this.elements.extended.speed).find('input').val();
			var newSpeed = speed < 8 ? Math.pow(2, Math.round(log2(speed))+amount) : 0.25;
			this.player.setSpeed(newSpeed);
		}
	};

	this.GIFPlayerControls = this.GIFPlayerControls || GIFPlayerControls;
	
})();