(function(){

	/**
	 * Controls for the GIFPlayer.
	 * Requires jQuery (1.9.1), for now.
	 **/
	var GIFPlayerControls = function(player){
		
		this.player = player;
		this.setupElements();

		/* GIFPlayer event handlers. */
		
		var self = this;

		this.player.on(GIFPlayer.GIF_EVENT_SET_FRAME, function(e){
			self.setScrub(e);
		});
		this.player.on(GIFPlayer.GIF_EVENT_PLAY, function(e){
			GIFUtils.elementRemoveClass(self.elements.play, 'gifplayer-icon-play');
			GIFUtils.elementAddClass(self.elements.play, 'gifplayer-icon-pause');
			GIFUtils.elementAddClass(self.elements.previous, 'disabled');
			GIFUtils.elementAddClass(self.elements.next, 'disabled');
		});
		this.player.on(GIFPlayer.GIF_EVENT_LOOP, function(e){
			self.elements.loop.innerText =
				GIFPlayerControls.loopModeString[e] ? GIFPlayerControls.loopModeString[e] : '???';
		});
		this.player.on(GIFPlayer.GIF_EVENT_REVERSE, function(e){
			if (e)
				GIFUtils.elementRemoveClass(self.elements.reverse, 'gifplayer-disabled');
			else
				GIFUtils.elementAddClass(self.elements.reverse, 'gifplayer-disabled');
		});
		var onStop = function(){
			GIFUtils.elementRemoveClass(self.elements.play, 'gifplayer-icon-pause');
			GIFUtils.elementAddClass(self.elements.play, 'gifplayer-icon-play');
			GIFUtils.elementRemoveClass(self.elements.previous, 'disabled');
			GIFUtils.elementRemoveClass(self.elements.next, 'disabled');
		};
		this.player.on(GIFPlayer.GIF_EVENT_PAUSE, onStop);
		this.player.on(GIFPlayer.GIF_EVENT_STOP, onStop);
		var onSetSpeed = function(speed){
			self.elements.speed.input.value = speed;
			self.elements.speed.output.innerText = 'x'+Number(speed).toFixed(1);
		};
		var onSetSize = function(size){
			self.elements.size.input.value = size;
			self.elements.size.output.innerText = Math.round(size*100)+'%';
		};
		this.player.on(GIFPlayer.GIF_EVENT_SPEED, onSetSpeed);
		this.player.on(GIFPlayer.GIF_EVENT_SIZE, onSetSize);

		onSetSpeed(this.player.getSpeed());
		onSetSize(this.player.getSize());

		this.player.on(GIFPlayer.GIF_EVENT_CLOSE, function(){
			document.onkeydown = null;
			self.player = null;
			self.elements = null;
		});

		/* Short keys. */

		window.onblur = function(e) {
			self.commandKey = false;
		}
		document.onkeyup = function(e) {
			switch (e.which) {
				case 91: // Command
					self.commandKey = false;
					break;
			}
		}
		document.onkeydown = function(e) {
			if (e.ctrlKey || self.commandKey)
				return true;
			switch (e.which) {
				case 27: // esc
					self.player.close();
					break;
				case 32: // space
					self.player.togglePlay();
					self.player.setAction(self.player.playing ? 'Play' : 'Pause');
					break;
					break;
				case 37: // <-
					if (e.shiftKey && self.player.urls.length) {
						self.player.loadPrevious();
						self.player.setAction('Previous');
						break;
					}
					if (self.player.playing) {
						var speed = Math.round(parseFloat(self.elements.speed.input.value) * 10) * 0.1;
						self.player.setSpeed(parseFloat(speed) - 0.1);
						self.player.setAction('Speed: x'+Number(self.player.playSpeed).toFixed(1));
					} else {
						self.previous();
					}
					break;
				case 39: // ->
					if (e.shiftKey && self.player.urls.length) {
						self.player.loadNext();
						self.player.setAction('Next');
						break;
					}
					if (self.player.playing) {
						var speed = Math.round(parseFloat(self.elements.speed.input.value) * 10) * 0.1;
						self.player.setSpeed(parseFloat(speed) + 0.1);
						self.player.setAction('Speed: x'+Number(self.player.playSpeed).toFixed(1));
					} else {
						self.next();
					}
					break;
				case 38: // up
					var size = parseFloat(self.elements.size.input.value);
					var value = e.shiftKey ? 0.1 : 0.02;
					self.player.setSize(parseFloat(size) + value);
					self.player.setAction('Size: '+Math.round(self.player.canvasSize*100)+'%');
					break;
				case 40: // down
					var size = parseFloat(self.elements.size.input.value);
					var value = e.shiftKey ? 0.1 : 0.02;
					self.player.setSize(parseFloat(size) - value);
					self.player.setAction('Size: '+Math.round(self.player.canvasSize*100)+'%');
					break;
				case 76: // L
					self.player.toggleLoopMode();
					var loopMode = '-';
					switch (self.player.playLoop) {
						case GIFPlayer.LOOP_OFF:		loopMode = 'Off'; break;
						case GIFPlayer.LOOP_NORMAL:		loopMode = 'On'; break;
						case GIFPlayer.LOOP_PING_PONG:	loopMode = 'Ping-pong'; break;
					}
					self.player.setAction('Loop: '+loopMode);
					break;
				case 82: // R
					self.player.toggleReverse();
					self.player.setAction('Reverse: '+(self.player.playReverse?'On':'Off'));
					break;
				case 83: // S
					self.increaseSpeed(e.shiftKey ? -1 : 1);
					self.player.setAction('Speed: x'+Number(self.player.playSpeed).toFixed(1));
					break;
				case 91: // Command
					self.commandKey = true;
					break;
				default:
					return true;
			}
			return false;
		};
	};

	GIFPlayerControls.loopModeString = {};
	GIFPlayerControls.loopModeString[GIFPlayer.LOOP_OFF] = 'Don\'t loop';
	GIFPlayerControls.loopModeString[GIFPlayer.LOOP_NORMAL] = 'Loop';
	GIFPlayerControls.loopModeString[GIFPlayer.LOOP_PING_PONG] = 'Ping-pong';

	GIFPlayerControls.prototype = {

		setScrub : function(frame) {
			var width = Math.round(frame * 100 / (this.player.frames.length - 1));
			this.elements.scrub.fill.style.width = width + '%';
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
			var speed = this.elements.speed.input.value;
			var newSpeed = speed < 8 ? Math.pow(2, Math.round(GIFUtils.log2(speed))+amount) : 0.25;
			this.player.setSpeed(newSpeed);
		},

		setupElements : function() {

			this.elements = {};
			this.elements.previous = GIFUtils.elementCreate('A',
				{
					'id': 'gifplayer-control-previous',
					'className': 'gifplayer-icon gifplayer-icon-previous',
					'href': '#',
					'title': 'Previous frame (left arrow)'
				}
			);
			this.elements.next = GIFUtils.elementCreate('A',
				{
					'id': 'gifplayer-control-next',
					'className': 'gifplayer-icon gifplayer-icon-next',
					'href': '#',
					'title': 'Next frame (rigth arrow)'
				}
			);
			this.elements.play = GIFUtils.elementCreate('A',
				{
					'id': 'gifplayer-control-play',
					'className': 'gifplayer-icon gifplayer-icon-play',
					'href': '#',
					'title': 'Play (space)'
				}
			);
			this.elements.stop = GIFUtils.elementCreate('A',
				{
					'id': 'gifplayer-control-stop',
					'className': 'gifplayer-icon gifplayer-icon-stop',
					'href': '#',
					'title': 'Stop'
				}
			);
			this.elements.close = GIFUtils.elementCreate('A',
				{
					'id': 'gifplayer-control-close',
					'className': 'gifplayer-icon',
					'href': '#',
					'title': 'Close (esc)',
					'innerHTML': '&times;'
				}
			);
			this.elements.icons = GIFUtils.elementCreate('DIV', { 'id': 'gifplayer-icons' }, {}, [
				this.elements.previous,
				this.elements.play,
				this.elements.stop,
				this.elements.next,
				this.elements.close
			]);

			this.elements.scrub = {};
			this.elements.scrub.fill = GIFUtils.elementCreate('SPAN', { 'id': 'gifplayer-scrub-fill' });
			this.elements.scrub.container = GIFUtils.elementCreate('A', { 'id': 'gifplayer-scrub', 'href': '#' }, {}, [this.elements.scrub.fill]);

			var createSlider = function(id, min, max, step, value, title){
				var input = GIFUtils.elementCreate('INPUT', {
					'id': id,
					'type': 'range',
					'min': min,
					'max': max,
					'step': step,
					'value': value
				});
				var output = GIFUtils.elementCreate('OUTPUT', {
					'id': id + '-output',
					'for': id
				});
				var label = GIFUtils.elementCreate('LABEL', {
					'id': id + '-label',
					'for': id
				}, undefined, undefined, title);
				var container = GIFUtils.elementCreate('DIV', { 'className': 'gifplayer-slider '+id+'-slider' }, undefined, [
					label, input, output
				]);
				return {
					'container': container,
					'input': input,
					'output': output,
					'label': label
				};
			};
			this.elements.size = createSlider('gifplayer-size', 0.1, 1.0, 0.01, 1.0, 'Size');
			this.elements.speed = createSlider('gifplayer-speed', 0.1, 8.0, 0.1, 1.0, 'Speed');
			this.elements.loop = GIFUtils.elementCreate('A',
				{
					'id': 'gifplayer-loop',
					'className': 'gifplayer-control-textlabel',
					'title': 'Loop mode (L)',
					'href': '#'
				}, undefined, undefined, 'Loop'
			);
			this.elements.reverse = GIFUtils.elementCreate('A',
				{
					'id': 'gifplayer-reverse',
					'className': 'gifplayer-control-textlabel gifplayer-disabled',
					'title': 'Play reverse (R)',
					'href': '#'
				},
				undefined, undefined, 'Reverse'
			);
			this.elements.extended = GIFUtils.elementCreate('DIV', { 'id': 'gifplayer-controls-extended' }, undefined, [
				this.elements.speed.container,
				this.elements.loop,
				this.elements.reverse,
				this.elements.size.container
			]);
			this.elements.container = GIFUtils.elementCreate('DIV', { 'id': 'gifplayer-controls' }, undefined, [
				this.elements.icons,
				this.elements.scrub.container,
				this.elements.extended
			]);
			var playerElement = document.getElementById('gifplayer');
			if (playerElement)
				playerElement.appendChild(this.elements.container);

			/* Event handlers. */

			var self = this;
			
			this.elements.close.onclick = function(){
				self.player.close();
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
				self.player.togglePlay();
				return false;
			};
			this.elements.stop.onclick = function(){
				self.stop();
				return false;
			};
			this.elements.loop.onclick = function(){
				self.player.toggleLoopMode();
				return false;
			};
			this.elements.reverse.onclick = function(){
				self.player.toggleReverse();
				return false;
			};
			this.elements.speed.input.onchange = function(){
				self.player.setSpeed(self.elements.speed.input.value);
			};
			this.elements.speed.label.onclick = function(){
				self.increaseSpeed(1);
			};
			this.elements.size.input.onchange = function(){
				self.player.setSize(parseFloat(self.elements.size.input.value));
			};
			var scrubMouseDown = function(e){
				var position = e.offsetX / self.elements.scrub.container.offsetWidth;
				var frames = self.player.frames.length - 1;
				var frame = Math.min(frames, Math.max(0, Math.round(frames * position)));
				self.player.setFrame(frame)
				return false;
			};
			this.elements.scrub.container.onmousedown = function(e){
				scrubMouseDown(e);
				self.elements.scrub.container.onmousemove = scrubMouseDown;
				document.onmouseup = function(){
					document.onmouseup = null;
					self.elements.scrub.container.onmousemove = null;
					return false;
				};
				return false;
			};
		}
	};

	this.GIFPlayerControls = this.GIFPlayerControls || GIFPlayerControls;
	
})();