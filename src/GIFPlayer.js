(function(){
	
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
		this.elements.status.innerText = error;
		this.loading = false;
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
			var request = new XMLHttpRequest();
			if (request) {
				var progress = 0;
				var size = 10;
				request.onprogress = function(event){
					if (event.lengthComputable) {
						var percent = Math.min(100, Math.max(0, Math.round(100 * event.loaded / event.total)));
						self.elements.loader.style['backgroundImage'] = 
							'-webkit-linear-gradient(0deg, #444 '+percent+'%, transparent '+percent+'%)';
					} else {
						progress = (progress+1)%size;
						self.elements.loader.style['backgroundPositionX'] = progress;
						self.elements.loader.style['backgroundImage'] = 
							'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAARUlEQVQYV2OcOXPm//T0dEYGNAASRxZihAkQUgxXCNKNTzGKQnyKMRTiUgz2BLrDsSmG+5aQYpRgwaeYYPjBnIGhEJebAfePMf05Jj0DAAAAAElFTkSuQmCC)';
					}
				};
				request.onreadystatechange = function(){
					if (request.readyState == 4) {
						// if (request.status == 200 && request.response) {
						var requestEnd = GIFUtils.timer();
						var requestTime = Math.round((requestEnd - requestStart)*100)*0.01;
						var requestSize = Math.round(request.response.byteLength*100 / 1024)*0.01;
						var requestSpeed = Math.round(10 * (request.response.byteLength / 1024) * 1000 / (requestEnd - requestStart)) * 0.1;
						GIF.log('GIF: Fetched', requestSize, 'kb of data in', requestTime, 'ms ('+requestSpeed+' kb/s).');
						var gif = new GIF(request.response,
							function(gif){
								self.loadComplete(gif);
							},
							function(progressAmount, totalBytes, readBytes){
								self.loadUpdate(progressAmount);
							},
							function(error){
								self.error(error ? error : 'Unknown error.')
							}
						);
					}
				};
				GIF.log('GIF: Fetching GIF...');
				requestStart = GIFUtils.timer();
				request.open("GET", url, true);
				request.responseType = 'arraybuffer';
				// TODO: Work out cache control, force load from cache?
				// request.setRequestHeader('Cache-Control', 'public');
				try {
					request.send(null);
				} catch (e) {
					throw new Error('GIFPlayer: Error while making XMLHttpRequest.');
				}
			} else {
				throw new Error('GIFPlayer: Could not create XMLHttpRequest.');
			}
		} catch (e) {
			this.loadAbort();
			this.elements.status.innerText = e || 'Unknown error.';
			throw e;
		}
	};

	GIFPlayer.prototype.loadInit = function(){
		this.emit(GIFPlayer.LOAD_START);
		this.loading = true;
		this.elements.container.className = 'loading';
		this.elements.loader.style['backgroundPositionX'] = 0;
		this.elements.loader.style['backgroundImage'] = 'none';
		this.elements.status.innerText = 'Fetching "'+this.urls[this.urlIndex]+'"...';
	};

	GIFPlayer.prototype.loadStart = function(){
		this.elements.loader.style['backgroundPositionX'] = 0;
		this.elements.status.innerText = 'Decoding "'+self.urls[self.urlIndex]+'"...';
	};

	GIFPlayer.prototype.loadNext = function(){
		if (this.urls.length > 1 && !this.loading) {
			this.stop();
			this.urlIndex = this.urlIndex >= this.urls.length - 1 ? 0 : this.urlIndex + 1;
			this.loadUrl(this.urls[this.urlIndex]);
		}
	};

	GIFPlayer.prototype.loadPrevious = function(){
		if (this.urls.length > 1 && !this.loading) {
			this.stop();
			this.urlIndex = this.urlIndex <= 0 ? this.urls.length - 1 : this.urlIndex - 1;
			this.loadUrl(this.urls[this.urlIndex]);
		}
	};

	GIFPlayer.prototype.loadAbort = function(){
		var body = document.getElementsByTagName('BODY')[0];
		if (body && this.elements.container) {
			body.removeChild(this.elements.container);
		}
	};

	GIFPlayer.prototype.loadUpdate = function(progress){
		var self = this;
		var percent = Math.min(100, Math.max(0, Math.round(100 * progress)));
		this.elements.loader.style['backgroundPositionX'] = 0;
		self.elements.loader.style['backgroundImage'] = 
			'-webkit-linear-gradient(0deg, #999 '+percent+'%, #444 '+percent+'%)';
		this.emit(GIFPlayer.LOAD_PROGRESS, progress);
	};

	GIFPlayer.prototype.loadComplete = function(gif){

		this.gif = gif;

		if (this.gif.images.length < 2 && this.urls.length > 1) {
			// Not a GIF animation, skip.
			// TODO: Test/fix/tweak this.
			this.elements.status.innerText = 'Not a GIF animation, skipping...';
			setTimeout((function(self){
				console.log('wut');
				self.loading = false;
				self.loadNext();
			})(this), 500);
			return;
		}

		this.elements.container.focus();

		this.elements.canvas.width = this.gif.header.width;
		this.elements.canvas.height = this.gif.header.height;
		this.canvasContext = this.elements.canvas.getContext('2d');
		this.canvasImageData = this.canvasContext.getImageData(0, 0, this.gif.header.width, this.gif.header.height);
		
		this.elements.container.className = '';
		this.resize();
		
		this.frame = 0;
		this.frames = [];
		this.frameDelay = new Int32Array(this.gif.images.length);

		this.playing = false;
		this.playLastFrame = 0;
		this.setReverse(false);
		this.setLoopMode(GIFPlayer.LOOP_NORMAL);

		for (var i = 0; i < this.gif.images.length; ++i) {
			var frame = this.initFrame(i);
			this.frames.push(frame.frameImage);
			this.frameDelay[i] = frame.frameDelay;
		}
		
		this.setFrame(0);
		this.setSpeed(this.playSpeed);
		// this.setSize(this.canvasSize);
		this.setLoopMode(GIFPlayer.LOOP_NORMAL);
		this.loading = false;

		this.emit(GIFPlayer.LOAD_COMPLETE);
		this.play();
	};

	GIFPlayer.prototype.initFrame = function(frame){

		var self = this;
		var getDisposalMethod = function(frame){
			var gce = self.gif.images[frame].gce;
			return gce ? gce.disposalMethod : null;
		};
		var frameImageData = new ArrayBuffer(this.gif.header.width * this.gif.header.height * 4);
		var frameImageView = new Uint32Array(frameImageData);

		var gifImage = this.gif.images[frame];
		var gifImageView = new Uint8Array(gifImage.data);
		var gifHeader = this.gif.header ? this.gif.header : {};
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
			frameDelay: this.gif.images.length > 1 ? gifFrameDelay : -1
		};
	};

	GIFPlayer.prototype.resize = function() {
		if (this.gif) {
			var windowWidth = window.innerWidth;
			var windowHeight = window.innerHeight;
			var windowRatio = windowHeight / windowWidth;
			var gifRatio = this.gif.header.height / this.gif.header.width;
			if (windowRatio < gifRatio) {
				GIFUtils.elementApplyStyles(this.elements.canvas, {height: '100%', width: 'auto', marginTop: 0});
			} else {
				var height = gifRatio * windowWidth;
				GIFUtils.elementApplyStyles(this.elements.canvas, {height: 'auto', width: '100%', marginTop: Math.round((windowHeight - height) * 0.5)+'px'});
			}
		}
	};

	GIFPlayer.prototype.mouseMove = function(e) {
		if (this.mouseMoveTimer)
			clearTimeout(this.mouseMoveTimer);
		if (!this.loading) {
			this.elements.container.className = 'controls';
		}
		this.mouseMoveTimer = setTimeout((function(self){
			return function(){
				self.mouseMoveTimer = null;
				if (!self.loading) {
					self.elements.container.className = '';
				}
			};
		})(this), 1000);
	};

	GIFPlayer.prototype.play = function(){
		if (this.frames.length > 1) {
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
		this.elements.container.parentNode.removeChild(this.elements.container);
	};

	GIFPlayer.prototype.addUrl = function(url) {
		this.urls.push(url);
		this.elements.previous.style['visibility'] = 'visible';
		this.elements.next.style['visibility'] = 'visible';
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
		this.elements.previous = GIFUtils.elementCreate('A',
			{
				id: 'gifplayer-previous',
				href: '#',
				title: 'Previous GIF (shift + left arrow)'
			},
			{
				position:		'fixed',
				top:			'50%',
				left:			'20px',
				bottom:			'auto',
				right:			'auto',
				width:			'0',
				height:			'0',
				borderStyle: 	'solid',
				borderWidth: 	'40px 20px 40px 0',
				margin:			'-40px 0'
			}
		);
		this.elements.next = GIFUtils.elementCreate('A',
			{
				id: 'gifplayer-next',
				href: '#',
				title: 'Next GIF (shift + right arrow)'
			},
			{
				position:		'fixed',
				top:			'50%',
				right:			'20px',
				bottom:			'auto',
				left:			'auto',
				width:			'0',
				height:			'0',
				borderStyle: 	'solid',
				borderWidth: 	'40px 0 40px 20px',
				margin:			'-40px 0'
			}
		);
		this.elements.loader = GIFUtils.elementCreate('DIV',
			{ id: 'gifplayer-loader' },
			{
				position:		'fixed',
				top:			'50%',
				left:			'50%',
				bottom:			'auto',
				right:			'auto',
				border:			'2px solid #999',
				borderRadius:	'7px',
				width:			'50%',
				height:			'10px',
				background:		'transparent',
				margin:			'-5px -25%'
			}
		);
		this.elements.status = GIFUtils.elementCreate('DIV',
			{ id: 'gifplayer-status' },
			{
				position:	'absolute',
				top:		'auto',
				left:		'50%',
				bottom:		'60%',
				right:		'auto',
				textAlign:	'center',
				fontFamily:	'"Helvetica Neue", Helvetica, sans-serif',
				fontWeight:	'normal',
				fontSize:	'16px',
				lineHeight:	'1.25em',
				width:		'50%',
				margin:		'0px -25%',
				color: 		'#ccc',
				wordBreak:	'break-all'
			}
		);
		this.elements.action = GIFUtils.elementCreate('DIV',
			{ id: 'gifplayer-action' },
			{
				position:	'absolute',
				top:		'20px',
				right:		'30px',
				bottom:		'auto',
				left:		'auto',
				textAlign:	'left',
				fontFamily:	'"Helvetica Neue", Helvetica, sans-serif',
				fontWeight:	'normal',
				fontSize:	'32px',
				color: 		'#fff',
				opacity:	0,
				textShadow: 'black 2px 2px 0px',
				webkitTransition: 'opacity 0.2s ease-out',
				webkitUserSelect: 'none'
			}
		);
		this.elements.container = GIFUtils.elementCreate('DIV',
			{ id: 'gifplayer' },
			{
				position:	'fixed',
				top:		0,
				left:		0,
				bottom:		'auto',
				right:		'auto',
				zIndex:		2147483647,
				border:		'none',
				width:		'100%',
				height:		'100%',
				background:	'black',
				textAlign:	'center'
			},
			[
				this.elements.canvas,
				this.elements.loader,
				this.elements.previous,
				this.elements.next,
				this.elements.status,
				this.elements.action
			]
		);
		var body = document.getElementsByTagName('BODY')[0];
		if (body)
			body.appendChild(this.elements.container);
		// Add eventlisteners.
		var self = this;
		window.onresize = function(event) {
			self.resize();
		};
		window.onmousemove = function(event) {
			self.mouseMove();
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
	
	this.GIFPlayer = this.GIFPlayer || GIFPlayer;

})();