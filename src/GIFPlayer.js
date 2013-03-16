(function(){

	var GIFPlayer = EventEmitter.extend({

		init : function(gif, canvas){

			this.gif = gif;

			this.canvas = canvas;
			this.canvas.width = this.gif.header.width;
			this.canvas.height = this.gif.header.height;
			this.canvasContext = this.canvas.getContext('2d');
			this.canvasImageData = this.canvasContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
			
			this.frame = 0;
			this.frames = [];
			this.frameDelay = new Int32Array(this.gif.images.length);

			this.playing = false;
			this.playLastFrame = 0;
			this.playSpeed = 1.0;
			this.setReverse(false);
			this.setLoopMode(GIFPlayer.LOOP_NORMAL);

			for (var i = 0; i < this.gif.images.length; ++i) {
				var frame = this.initFrame(i);
				this.frames.push(frame.frameImage);
				this.frameDelay[i] = frame.frameDelay;
			}

			this.emit(GIFPlayer.GIF_EVENT_INIT);
			this.setFrame(0);
		},

		initFrame : function(frame){

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
			var previousFrame = this.gif.images[frame - 1];
			var previousDisposalMethod = frame == 0 ? 0 : getDisposalMethod(frame - 1);

			switch (previousDisposalMethod) {
				default:
				case 0:
					// No disposal specified. The decoder is not required to take any action.
					break;
				case 1:
					// Do not dispose. The graphic is to be left in place.
					frameImageView.set(new Uint32Array(this.frames[frame - 1]));
					break;
				case 2:
					// Restore to background color. The area used by the graphic must be
					// restored to the background color.
					// TODO: This should really only cover the area of
					//       gifImage.height * gifImage.width, and not the whole image.
					var offset = 0;
					var backgroundColor = gifColorTable[gifHeader.backgroundColorIndex];
					if (gifHeader.backgroundColorIndex == gifTransparentColorIndex)
						backgroundColor = backgroundColor & 0x00ffffff;
					for (var y = 0; y < gifHeader.height; ++y) {
						for (var x = 0; x < gifHeader.width; ++x, ++offset) {
							frameImageView[offset] = backgroundColor;
						}
					}
					break;
				case 3:
					// Restore to previous. The decoder is required to restore the area
					// overwritten by the graphic with what was there prior to rendering
					// the graphic.
					// TODO: Fix this.
					frameImageView.set(new Uint32Array(this.frames[frame - 1]));
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
		},

		play : function(){
			if (this.frames.length > 1) {
				this.playing = true;
				this.playLastFrame = performance.now();
				window.requestAnimationFrame(this.step.bind(this));
				this.emit(GIFPlayer.GIF_EVENT_PLAY);
			}
		},

		step : function(time){
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
				this.playLastFrame = performance.now() - Math.min(deltaTime, 200);
			}
			window.requestAnimationFrame(this.step.bind(this));
		},

		isLastFrame : function(){
			return this.playReverse ? this.frame == 0 : this.frame == this.frames.length - 1;
		},

		getNextFrame : function(){
			return this.frame + 1 >= this.frames.length ? 0 : this.frame + 1;
		},

		getPreviousFrame : function(){
			return this.frame > 0 ? this.frame - 1 : this.frames.length - 1;
		},

		setFrame : function(frame){
			this.frame = frame;
			this.canvasImageData.data.set(new Uint8Array(this.frames[frame]));
			this.canvasContext.putImageData(this.canvasImageData, 0, 0);
			this.emit(GIFPlayer.GIF_EVENT_SET_FRAME, frame);
		},

		showNextFrame : function(){
			this.setFrame(this.getNextFrame());
			this.emit(GIFPlayer.GIF_EVENT_NEXT_FRAME, this.frame);
		},

		showPreviousFrame : function(){
			this.setFrame(this.getPreviousFrame());
			this.emit(GIFPlayer.GIF_EVENT_PREVIOUS_FRAME, this.frame);
		},

		stop : function(){
			this.playing = false;
			this.setFrame(0);
			this.emit(GIFPlayer.GIF_EVENT_STOP);
		},

		pause : function(){
			this.playing = false;
			this.emit(GIFPlayer.GIF_EVENT_PAUSE);
		},

		togglePlay : function(){
			if (this.playing)
				this.pause();
			else
				this.play();
		},

		toggleReverse : function(){
			this.setReverse(!this.playReverse);
		},

		setReverse : function(reverse){
			this.playReverse = reverse;
			this.emit(GIFPlayer.GIF_EVENT_REVERSE, this.playReverse);
		},

		toggleLoopMode : function(){
			var nextLoopMode = {};
			nextLoopMode[GIFPlayer.LOOP_OFF] = GIFPlayer.LOOP_NORMAL;
			nextLoopMode[GIFPlayer.LOOP_NORMAL] = GIFPlayer.LOOP_PING_PONG;
			nextLoopMode[GIFPlayer.LOOP_PING_PONG] = GIFPlayer.LOOP_OFF;
			this.setLoopMode(nextLoopMode[this.playLoop]);
		},

		setLoopMode : function(mode){
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
		},

		setSpeed : function(speed){
			this.playSpeed = Math.min(Math.max(0.1, speed), 8);
			this.emit(GIFPlayer.GIF_EVENT_SPEED, this.playSpeed);
		}

	});
	
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
	GIFPlayer.GIF_EVENT_INIT = 'init';
	GIFPlayer.GIF_EVENT_REVERSE = 'reverse';
	GIFPlayer.GIF_EVENT_LOOP = 'loop';
	GIFPlayer.GIF_EVENT_SPEED = 'speed';
	
	this.GIFPlayer = this.GIFPlayer || GIFPlayer;

})();