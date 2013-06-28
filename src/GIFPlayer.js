(function(global){
	
	window.requestAnimFrame = (function(){
		return window.requestAnimationFrame       ||
			   window.webkitRequestAnimationFrame ||
			   window.mozRequestAnimationFrame    ||
			   function(callback){ window.setTimeout(callback, 1000 / 60); };
	})();

	var GIFPlayer = function(urls, options){
		EventEmitter.call(this);
		options = GIFUtils.extendObject(options, {
			speed: 1.0,
			size: 1.0
		});
		this.urls = [];
		this.urlIndex = -1;
		this.canvasSize = options.size;
		this.playSpeed = options.speed;
		this.loading = false;
		this.request = null;
		this.setupElements();
		this.controls = new GIFPlayerControls(this);
		if (typeof (urls) != 'undefined')
			this.load(urls);
	};
	
	GIFPlayer.LOAD_START = 'load_START';
	GIFPlayer.LOAD_PROGRESS = 'load_progress';
	GIFPlayer.LOAD_COMPLETE = 'load_complete';

	GIFPlayer.LOOP_OFF = 'loop_off';
	GIFPlayer.LOOP_NORMAL = 'loop_normal';
	GIFPlayer.LOOP_PING_PONG = 'loop_ping_pong';

	GIFPlayer.GIF_EVENT_SET_FRAME = 'set_frame';
	GIFPlayer.GIF_EVENT_PLAY = 'play';
	GIFPlayer.GIF_EVENT_STOP = 'stop';
	GIFPlayer.GIF_EVENT_PAUSE = 'pause';
	GIFPlayer.GIF_EVENT_NEXT_FRAME = 'next_frame';
	GIFPlayer.GIF_EVENT_PREVIOUS_FRAME = 'previous_frame';
	GIFPlayer.GIF_EVENT_NEXT_FRAME = 'next_frame';
	GIFPlayer.GIF_EVENT_REVERSE = 'reverse';
	GIFPlayer.GIF_EVENT_LOOP = 'loop';
	GIFPlayer.GIF_EVENT_SPEED = 'speed';
	GIFPlayer.GIF_EVENT_SIZE = 'size';
	GIFPlayer.GIF_EVENT_CLOSE = 'close';

	GIFPlayer.prototype = Object.create(EventEmitter.prototype);

	GIFPlayer.prototype.error = function(error){
		GIFUtils.elementAddClass(this.elements.container, 'error');
		this.setStatus(error);
		this.loading = false;
	};

	GIFPlayer.prototype.killRequest = function(){
		if (this.gif)
			this.gif.stop();
		this.request.onprogress = null;
		this.request.onreadystatechange = null;
		this.request.abort();
		this.request = null;
	};

	GIFPlayer.prototype.load = function(urls){
		this.urls = GIFUtils.isArray(urls) ? urls : [ urls ];
		this.urlIndex = 0;
		if (this.urls.length > 1) {
			this.elements.previous.style['visibility'] = 'visible';
			this.elements.next.style['visibility'] = 'visible';
		} else {
			this.elements.previous.style['visibility'] = 'hidden';
			this.elements.next.style['visibility'] = 'hidden';
		}
		this.loadUrl(this.urls[this.urlIndex]);
	};

	GIFPlayer.prototype.loadUrl = function(url){
		this.loadInit();
		try {
			var self = this;
			var requestStart = 0;
			this.request = new XMLHttpRequest();
			if (this.request) {
				var progress = 0;
				var size = 10;
				this.request.onprogress = function(event){
					if (event.lengthComputable) {
						var percent = Math.min(100, Math.max(0, Math.round(100 * event.loaded / event.total)));
						self.elements.loader.style['backgroundPositionX'] = 0;
						self.elements.loader.style['backgroundImage'] = 
							'-webkit-linear-gradient(0deg, #555 '+percent+'%, transparent '+percent+'%)';
						self.setStatus('Fetching... ('+GIFUtils.humanReadableBytes(event.loaded)+')<br/>'+self.urls[self.urlIndex]);
					} else {
						progress = (progress+1)%size;
						self.elements.loader.style['backgroundPositionX'] = progress;
						self.elements.loader.style['backgroundImage'] = 
							'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAARUlEQVQYV2OcOXPm//T0dEYGNAASRxZihAkQUgxXCNKNTzGKQnyKMRTiUgz2BLrDsSmG+5aQYpRgwaeYYPjBnIGhEJebAfePMf05Jj0DAAAAAElFTkSuQmCC)';
					}
				};
				this.request.onreadystatechange = function(){
					if (this.readyState == 4 && this.response) {
						self.loadDecodeStart();
						var requestEnd = GIFUtils.timer();
						var requestTime = Math.round((requestEnd - requestStart)*100)*0.01;
						var requestSpeed = Math.round(10 * (this.response.byteLength / 1024) * 1000 / (requestEnd - requestStart)) * 0.1;
						GIF.log('GIF: Fetched', GIFUtils.humanReadableBytes(this.response.byteLength), 'of data in', requestTime, 'ms ('+requestSpeed+' kb/s).');
						var gif = new GIF(this.response,
							function(gif){
								self.loadComplete(gif);
							},
							function(progressAmount, totalBytes, readBytes){
								self.loadUpdate(progressAmount);
								while (self.frames.length < this.images.length) {
									var frame = self.initFrame(this, self.frames.length);
									self.frames.push(frame.frameImage);
									self.frameDelay.push(frame.frameDelay);
								}
							},
							function(error){
								self.error(error ? error : 'Unknown error.')
							}
						);
						self.killRequest();
					}
				};
				GIF.log('GIF: Fetching GIF from "'+url+'"...');
				requestStart = GIFUtils.timer();
				this.request.open("GET", url, true);
				this.request.responseType = 'arraybuffer';
				// TODO: Work out cache control, force load from cache?
				// this.request.setRequestHeader('Cache-Control', 'public');
				try {
					this.request.send(null);
				} catch (e) {
					throw new Error('GIFPlayer: Error while making XMLHttpRequest.');
				}
			} else {
				throw new Error('GIFPlayer: Could not create XMLHttpRequest.');
			}
		} catch (e) {
			var error = e || 'Unknown error.';
			this.setStatus(error);
			throw e;
		}
	};

	GIFPlayer.prototype.loadInit = function(){
		this.emit(GIFPlayer.LOAD_START);
		if (this.autoSkipTimer) {
			clearTimeout(this.autoSkipTimer);
			this.autoSkipTimer = null;
		}
		this.loading = true;
		this.elements.loader.style['backgroundPositionX'] = 0;
		this.elements.loader.style['backgroundImage'] = 'none';
		this.setStatus('Fetching...<br/>'+this.urls[this.urlIndex]);
		GIFUtils.elementRemoveClass(this.elements.container, 'error');
		GIFUtils.elementAddClass(this.elements.container, 'loading');
	};

	GIFPlayer.prototype.loadDecodeStart = function(){
		this.frames = [];
		this.frameDelay = [];
		this.elements.loader.style['backgroundPositionX'] = 0;
		this.setStatus('Decoding...<br/>'+this.urls[this.urlIndex]);
	};

	GIFPlayer.prototype.loadNext = function(){
		if (this.urls.length > 1) {
			if (this.loading && this.request)
				this.killRequest();
			else
				this.stop();
			this.urlIndex = this.urlIndex >= this.urls.length - 1 ? 0 : this.urlIndex + 1;
			this.loadUrl(this.urls[this.urlIndex]);
		}
	};

	GIFPlayer.prototype.loadPrevious = function(){
		if (this.urls.length > 1) {
			if (this.loading && this.request)
				this.killRequest();
			else
				this.stop();
			this.urlIndex = this.urlIndex <= 0 ? this.urls.length - 1 : this.urlIndex - 1;
			this.loadUrl(this.urls[this.urlIndex]);
		}
	};

	GIFPlayer.prototype.loadUpdate = function(progress){
		var self = this;
		var percent = Math.min(100, Math.max(0, Math.round(100 * progress)));
		this.elements.loader.style['backgroundPositionX'] = 0;
		self.elements.loader.style['backgroundImage'] = 
			'-webkit-linear-gradient(0deg, #999 '+percent+'%, #555 '+percent+'%)';
		this.emit(GIFPlayer.LOAD_PROGRESS, progress);
	};

	GIFPlayer.prototype.loadComplete = function(gif){

		this.gif = gif;

		if (this.gif.images.length < 2 && this.urls.length > 1) {
			// Not a GIF animation, skip.
			// TODO: Test/fix/tweak this.
			this.setStatus('Not a GIF animation, skipping...<br/>'+this.urls[this.urlIndex]);
			this.loading = false;
			GIFUtils.elementAddClass(this.elements.container, 'error');
			GIFUtils.elementRemoveClass(this.elements.container, 'loading');
			this.autoSkipTimer = setTimeout((function(self){
				return function(){
					self.autoSkipTimer = null;
					self.loadNext();
				};
			})(this), 2000);
			return;
		}

		this.elements.info.innerHTML =
			'<p id="gifplayer-info-url"><a href="'+this.urls[this.urlIndex]+'">'+this.urls[this.urlIndex]+'</a></p>'+
			'<p id="gifplayer-info-size">'+this.gif.header.width+' x '+this.gif.header.height+', '+GIFUtils.humanReadableBytes(this.gif.data.byteLength)+', '+this.gif.images.length+' frames</p>';
		this.elements.canvas.width = this.gif.header.width;
		this.elements.canvas.height = this.gif.header.height;
		this.canvasContext = this.elements.canvas.getContext('2d');
		this.canvasImageData = this.canvasContext.getImageData(0, 0, this.gif.header.width, this.gif.header.height);

		this.resize();

		while (this.frames.length < this.gif.images.length) {
			var frame = this.initFrame(this.gif, this.frames.length);
			this.frames.push(frame.frameImage);
			this.frameDelay.push(frame.frameDelay);
		}

		this.playing = false;
		this.playLastFrame = 0;
		this.setReverse(false);
		this.setLoopMode(GIFPlayer.LOOP_NORMAL);
		
		this.frame = 0;
		this.setFrame(0);
		this.setSpeed(this.playSpeed);
		// this.setSize(this.canvasSize);
		this.setLoopMode(GIFPlayer.LOOP_NORMAL);
		this.loading = false;
		
		GIFUtils.elementRemoveClass(this.elements.container, 'loading');

		this.emit(GIFPlayer.LOAD_COMPLETE);
		this.play();
	};

	GIFPlayer.prototype.initFrame = function(gif, frame){

		var getDisposalMethod = function(frame){
			var gce = gif.images[frame].gce;
			return gce ? gce.disposalMethod : null;
		};
		var frameImageData = new ArrayBuffer(gif.header.width * gif.header.height * 4);
		var frameImageView = new Uint32Array(frameImageData);

		var gifImage = gif.images[frame];
		var gifImageView = new Uint8Array(gifImage.data);
		var gifHeader = gif.header ? gif.header : {};
		var gifGce = gifImage.gce ? gifImage.gce : {};
		var gifColorTableData = gifImage.localColorTableFlag ?
			gifImage.localColorTable :
			gifHeader.globalColorTable;
		var gifColorTable = new Uint32Array(gifColorTableData);
		var gifTransparentColorIndex = gifGce.transparentColorFlag ? gifGce.transparentColorIndex : -1;
		var gifFrameDelay = gifGce.delayTime ? Math.max(1000/60, gifGce.delayTime * 10) : 1000/60;

		var srcOffset, dstOffset;
		var previousFrame = this.frames[frame - 1];
		var previousDisposalMethod = frame == 0 ? 0 : getDisposalMethod(frame - 1);

		switch (previousDisposalMethod) {
			default:
			case 0:
				// No disposal specified. The decoder is not required to take any action.
				if (frame == 0)
					break;
			case 1:
				// Do not dispose. The graphic is to be left in place.
				frameImageView.set(new Uint32Array(previousFrame));
				break;
			case 2:
				// Restore to background color. The area used by the graphic must be
				// restored to the background color.
				// TODO: This should really only cover the area of
				//       gifImage.height * gifImage.width, and not the whole image.
				var offset;
				if (frame != 0) {
					offset = 0;
					var previousFrameView = new Uint32Array(previousFrame);
					for (var y = 0; y < gifHeader.height; ++y) {
						for (var x = 0; x < gifHeader.width; ++x, ++offset) {
							frameImageView[offset] = previousFrameView[offset];
						}
					}
				}
				var backgroundColor = gifColorTable[gifHeader.backgroundColorIndex];
				if (gifHeader.backgroundColorIndex == gifTransparentColorIndex)
					backgroundColor = backgroundColor & 0x00ffffff;
				offset = gifImage.top * gifHeader.width + gifImage.left;
				for (var y = 0; y < gifImage.height; ++y) {
					for (var x = 0; x < gifImage.width; ++x, ++offset) {
						frameImageView[offset] = backgroundColor;
					}
				}
				break;
			case 3:
				// Restore to previous. The decoder is required to restore the area
				// overwritten by the graphic with what was there prior to rendering
				// the graphic.
				// TODO: Fix this.
				frameImageView.set(new Uint32Array(previousFrame));
				break;
		}

		srcOffset = 0;
		dstOffset = gifImage.top * gifHeader.width + gifImage.left;

		for (var y = 0; y < gifImage.height; ++y, dstOffset += gifHeader.width) {
			for (var x = 0; x < gifImage.width; ++x, srcOffset++) {
				var colorIndex = gifImageView[srcOffset];
				if (colorIndex != gifTransparentColorIndex) {
					frameImageView[dstOffset + x] = gifColorTable[colorIndex];
				}
			}
		}
		return {
			frameImage: frameImageData,
			frameDelay: gif.images.length > 1 ? gifFrameDelay : -1
		};
	};

	GIFPlayer.prototype.resize = function() {
		if (this.gif) {
			var windowWidth = window.innerWidth;
			var windowHeight = window.innerHeight;
			var windowRatio = windowHeight / windowWidth;
			var gifRatio = this.gif.header.height / this.gif.header.width;
			if (windowRatio < gifRatio) {
    			GIFUtils.extendObject(this.elements.canvas.style, {height: '100%', width: 'auto', marginTop: 0}, true);
			} else {
				var height = gifRatio * windowWidth;
    			GIFUtils.extendObject(this.elements.canvas.style,  {height: 'auto', width: '100%', marginTop: Math.round((windowHeight - height) * 0.5)+'px'}, true);
			}
		}
	};

	GIFPlayer.prototype.mouseMove = function(e) {
		if (this.mouseMoveTimer)
			clearTimeout(this.mouseMoveTimer);
		GIFUtils.elementAddClass(this.elements.container, 'controls');
		this.mouseMoveTimer = setTimeout((function(self){
			return function(){
				self.mouseMoveTimer = null;
				GIFUtils.elementRemoveClass(self.elements.container, 'controls');
			};
		})(this), 1000);
	};

	GIFPlayer.prototype.play = function(){
		if (this.frames && this.frames.length > 1) {
			this.playing = true;
			this.playLastFrame = GIFUtils.timer();
			window.requestAnimFrame(GIFPlayer.prototype.step.bind(this));
			this.emit(GIFPlayer.GIF_EVENT_PLAY);
		}
	};

	GIFPlayer.prototype.step = function(time){
		if (!this.playing)
			return;
		var frameDelay = this.frameDelay[this.frame] / this.playSpeed;
		var deltaTime = time - this.playLastFrame - frameDelay;
		if (deltaTime >= 0) {
			// It's time to show the next frame.
			var frame = this.playReverse ? this.getPreviousFrame() : this.getNextFrame();
			this.setFrame(frame);
			if (this.isLastFrame()) {
				if (this.playLoop == GIFPlayer.LOOP_OFF) {
					this.playing = false;
					this.emit(GIFPlayer.GIF_EVENT_STOP);
				} else if (this.playLoop == GIFPlayer.LOOP_PING_PONG) {
					this.toggleReverse();
				}
			}
			// We subtract the difference between the supposed and actual frame delay
			// from the timestamp to continously stay in sync. Never keep a backlog
			// of more than 0.2s though.
			this.playLastFrame = GIFUtils.timer() - Math.min(deltaTime, 200);
		}
		window.requestAnimFrame(this.step.bind(this));
	};

	GIFPlayer.prototype.isLastFrame = function(){
		return this.playReverse ? this.frame == 0 : this.frame == this.frames.length - 1;
	};

	GIFPlayer.prototype.getNextFrame = function(){
		return this.frame + 1 >= this.frames.length ? 0 : this.frame + 1;
	};

	GIFPlayer.prototype.getPreviousFrame = function(){
		return this.frame > 0 ? this.frame - 1 : this.frames.length - 1;
	};

	GIFPlayer.prototype.setFrame = function(frame){
		this.frame = frame;
		this.canvasImageData.data.set(new Uint8Array(this.frames[frame]));
		this.canvasContext.putImageData(this.canvasImageData, 0, 0);
		this.emit(GIFPlayer.GIF_EVENT_SET_FRAME, frame);
	};

	GIFPlayer.prototype.showNextFrame = function(){
		this.setFrame(this.getNextFrame());
		this.emit(GIFPlayer.GIF_EVENT_NEXT_FRAME, this.frame);
	};

	GIFPlayer.prototype.showPreviousFrame = function(){
		this.setFrame(this.getPreviousFrame());
		this.emit(GIFPlayer.GIF_EVENT_PREVIOUS_FRAME, this.frame);
	};

	GIFPlayer.prototype.stop = function(){
		this.playing = false;
		if (this.frames &&
			this.frames.length > 0 &&
			this.elements.canvas &&
			this.canvasImageData &&
			this.canvasContext)
			this.setFrame(0);
		this.emit(GIFPlayer.GIF_EVENT_STOP);
	};

	GIFPlayer.prototype.pause = function(){
		this.playing = false;
		this.emit(GIFPlayer.GIF_EVENT_PAUSE);
	};

	GIFPlayer.prototype.togglePlay = function(){
		if (this.playing)
			this.pause();
		else
			this.play();
	};

	GIFPlayer.prototype.toggleReverse = function(){
		this.setReverse(!this.playReverse);
	};

	GIFPlayer.prototype.setReverse = function(reverse){
		this.playReverse = reverse;
		this.emit(GIFPlayer.GIF_EVENT_REVERSE, this.playReverse);
	};

	GIFPlayer.prototype.toggleLoopMode = function(){
		var nextLoopMode = {};
		nextLoopMode[GIFPlayer.LOOP_OFF] = GIFPlayer.LOOP_NORMAL;
		nextLoopMode[GIFPlayer.LOOP_NORMAL] = GIFPlayer.LOOP_PING_PONG;
		nextLoopMode[GIFPlayer.LOOP_PING_PONG] = GIFPlayer.LOOP_OFF;
		this.setLoopMode(nextLoopMode[this.playLoop]);
	};

	GIFPlayer.prototype.setLoopMode = function(mode){
		switch (mode) {
			case GIFPlayer.LOOP_OFF:
			case GIFPlayer.LOOP_PING_PONG:
				this.playLoop = mode;
				break;
			default:
			case GIFPlayer.LOOP_NORMAL:
				this.playLoop = GIFPlayer.LOOP_NORMAL;
				break;
		}
		this.emit(GIFPlayer.GIF_EVENT_LOOP, this.playLoop);
	};

	GIFPlayer.prototype.setSpeed = function(speed){
		this.playSpeed = Math.min(Math.max(0.1, speed), 8);
		this.emit(GIFPlayer.GIF_EVENT_SPEED, this.playSpeed);
	};

	GIFPlayer.prototype.getSpeed = function(){ return this.playSpeed; };

	GIFPlayer.prototype.setSize = function(size){
		this.canvasSize = Math.min(Math.max(0.1, Math.round(size * 100) * 0.01), 1);
		this.elements.canvas.style.webkitTransform = 'scale('+this.canvasSize+')';
		this.emit(GIFPlayer.GIF_EVENT_SIZE, this.canvasSize);
	};

	GIFPlayer.prototype.getSize = function(){ return this.canvasSize; };

	GIFPlayer.prototype.close = function(){
		this.emit(GIFPlayer.GIF_EVENT_CLOSE);
		this.elements.container.parentNode.style.overflow = 'auto';
		this.elements.container.parentNode.removeChild(this.elements.container);
	};

	GIFPlayer.prototype.addUrl = function(url) {
		if (this.urls.indexOf(url) == -1)
			this.urls.push(url);
		if (this.urls.length > 1) {
			this.elements.previous.style['visibility'] = 'visible';
			this.elements.next.style['visibility'] = 'visible';
		}
	};

	GIFPlayer.prototype.removeUrl = function(index) {
		this.urls.splice(index, 1);
		if (this.urls.length > 1) {
			this.elements.previous.style['visibility'] = 'visible';
			this.elements.next.style['visibility'] = 'visible';
		}
	};

	GIFPlayer.prototype.setStatus = function(html){
		this.elements.status.innerHTML = html;
	};

	GIFPlayer.prototype.setAction = function(str){
		this.elements.action.innerText = str;
		this.elements.action.style.opacity = 1;
		if (this.actionTimer)
			clearTimeout(this.actionTimer);
		this.actionTimer = setTimeout((function(self){
			return function(){
				self.actionTimer = null;
				self.elements.action.style.opacity = 0;
			};
		})(this), 1000);
	};

	GIFPlayer.prototype.setupElements = function(){
		// Create elements.
		this.elements = {};
		this.elements.canvas = GIFUtils.elementCreate('canvas', { id: 'gifplayer-canvas' });
		this.elements.previous = GIFUtils.elementCreate('A', {
			id: 'gifplayer-previous',
			href: '#',
			title: 'Previous GIF (shift + left arrow)'
		});
		this.elements.next = GIFUtils.elementCreate('A', {
			id: 'gifplayer-next',
			href: '#',
			title: 'Next GIF (shift + right arrow)'
		});
		this.elements.loader = GIFUtils.elementCreate('DIV', { id: 'gifplayer-loader' });
		this.elements.status = GIFUtils.elementCreate('DIV', { id: 'gifplayer-status' });
		this.elements.action = GIFUtils.elementCreate('DIV', { id: 'gifplayer-action' });
		this.elements.info = GIFUtils.elementCreate('DIV', { id: 'gifplayer-info' });
		this.elements.container = GIFUtils.elementCreate('DIV', { id: 'gifplayer' }, undefined, [
			this.elements.canvas,
			this.elements.loader,
			this.elements.previous,
			this.elements.next,
			this.elements.status,
			this.elements.action,
			this.elements.info
		]);
		var body = document.getElementsByTagName('BODY')[0];
		if (body) {
			body.appendChild(this.elements.container);
			body.style.overflow = 'hidden';
		}
		// Add eventlisteners.
		var self = this;
		window.onresize = function(event) {
			self.resize();
		};
		window.onmousemove = function(event) {
			self.mouseMove();
		};
		this.elements.canvas.onclick = function(){
			if (!self.loading)
				self.togglePlay();
			return false;
		};
		this.elements.next.onclick = function(){
			self.loadNext();
			return false;
		};
		this.elements.previous.onclick = function(){
			self.loadPrevious();
			return false;
		};
	};
	
	global.GIFPlayer = global.GIFPlayer || GIFPlayer;

})(this);
