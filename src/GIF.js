(function(){

	/**
	 * GIF parser. Partially based on jsgif by shachaf:
	 * http://slbkbs.org/jsgif/
	 * 
	 * @param ArrayBuffer data Raw GIF data.
	 */
	var GIF = function(data) {

		this.data = null;
		this.stream = null;
		this.header = null;
		this.images = null;
		this.extensions = null;

		if (data && (data instanceof ArrayBuffer))
			this.parse(data);
	};

	GIF.bitArrayToNum = function(bitArray) {
		return bitArray.reduce(function(p, n) { return p * 2 + n; }, 0);
	};
	GIF.byteToBitArray = function(byte) {
		var arr = [];
		for (var i = 7; i >= 0; i--)
			arr.push(!!(byte & (1 << i)));
		return arr;
	};

	GIF.prototype = {

		parse : function(arrayBuffer){

			if (!(arrayBuffer instanceof ArrayBuffer))
				throw new Error('GIF: Indata not an ArrayBuffer.');

			console.log('GIF: Parsing GIF file ('+ Math.round(arrayBuffer.byteLength/1024,1) +' kb)...');
			var startTimeInMs = performance.now();

			this.data = arrayBuffer;
			this.stream = new DataStream(arrayBuffer, 0, DataStream.LITTLE_ENDIAN);
			this.header = this.parseHeader();
			this.images = [];
			this.extensions = [];

			var lastGce = null;

			var eof = false;
			while (!eof) {
				var sentinel = this.stream.readUint8();
				switch (sentinel) {
					case 0x21: // '!'
						var extension = this.parseExtension();
						this.extensions.push(extension);
						switch (extension.extType) {
							case 'gce':
								lastGce = extension;
								break;
							case 'app':
								if (extension.applicationIdentifier == 'NETSCAPE')
									this.netscapeExtension = extension;
								break;
						}
						break;
					case 0x2C: // ','
						var image = this.parseImage();
						this.images.push(image);
						if (lastGce !== null)
							image.gce = lastGce;
						lastGce = null;
						break;
					case 0x3B: // ';'
						eof = true;
						break;
					default:
						throw new Error('GIF: Invalid GIF file. Unknown block type.');
				}
			}

			var timeTakenInMs = Math.round((performance.now() - startTimeInMs)*100)*0.01;
			console.log('GIF: Parsing complete in', timeTakenInMs, 'ms.');
		},

		parseHeader : function(){

			var header = {};
			header.signature = this.stream.readString(3);

			if (header.signature !== 'GIF')
				throw new Error('GIF: Invalid GIF file. Malformed header.');

			header.version = this.stream.readString(3);
			header.width = this.stream.readUint16();
			header.height = this.stream.readUint16();
			header.packed = this.stream.readUint8();

			var packed = GIF.byteToBitArray(header.packed);
			header.globalColorTableFlag = packed.shift();
			header.colorResolution = GIF.bitArrayToNum(packed.splice(0, 3));
			header.sortFlag = packed.shift();
			header.globalColorTableSize = GIF.bitArrayToNum(packed.splice(0, 3));
			header.backgroundColorIndex = this.stream.readUint8();
			header.pixelAspectRatio = this.stream.readUint8(); // if not 0, aspectRatio = (pixelAspectRatio + 15) / 64
			header.globalColorTable = header.globalColorTableFlag ?
				this.parseColorTable(1 << (header.globalColorTableSize + 1)) : null;

			return header;
		},

		parseSubBlocks : function(){

			var blocks = [],
				offsets = [],
				totalSize = 0,
				size = this.stream.readUint8();
			while (size) {
				blocks.push(this.stream.readUint8Array(size));
				offsets.push(totalSize);
				totalSize += size;
				size = this.stream.readUint8();
			}
			var data = new ArrayBuffer(totalSize);
			var array = new Uint8Array(data);
			for (var i = 0; i < blocks.length; i++)
				array.set(blocks[i], offsets[i]);
			return data;
		},

		parseColorTable : function(length){

			var table = [], rgb;
			for (var i = 0; i < length; i++) {
				rgb = this.stream.readUint8Array(3);
				table.push(rgb[0] + (rgb[1]<<8) + (rgb[2]<<16) + (0xff<<24));
			}
			return table;
		},

		parseExtension : function(){

			var self = this;
		    var parseGraphicsControlExtension = function(block) {
				var blockSize = self.stream.readUint8(); // Always 4.
				var packed = GIF.byteToBitArray(self.stream.readUint8());
				block.reserved = packed.splice(0, 3); // Reserved (should be 000.)
				block.disposalMethod = GIF.bitArrayToNum(packed.splice(0, 3));
				block.userInputFlag = packed.shift();
				block.transparentColorFlag = packed.shift();
				block.delayTime = self.stream.readUint16();
				block.transparentColorIndex = self.stream.readUint8();
				block.terminator = self.stream.readUint8();
		    };
		    var parseCommentExtension = function(block) {
		    	var data = self.parseSubBlocks();
				block.comment = String.fromCharCode.apply(null, new Uint8Array(data));
		    }
		    var parseApplicationExtension = function(block) {
				var parseNetscapeExt = function(block) {
					var blockSize = self.stream.readUint8(); // Always 3. (Length of Data Sub-Block.)
					var unknown = self.stream.readUint8(); // Always 1. ಠ_ಠ
					block.iterations = self.stream.readUint16();
					var blockTerminator = self.stream.readUint8();
				};
				var parseUnknownAppExt = function(block) {
		        	block.data = self.parseSubBlocks();
				};
				var blockSize = self.stream.readUint8(); // Always 11
				var appIdentifier = self.stream.readUint8Array(8);
				var appIdentifierString = String.fromCharCode.apply(null, appIdentifier);
				var appAuthentication = self.stream.readUint8Array(3);
				var appAuthenticationString = String.fromCharCode.apply(null, appAuthentication);
				block.applicationIdentifier = appIdentifierString;
				block.applicationAuthentication = appAuthenticationString;
				switch (appIdentifierString) {
					case 'NETSCAPE':
						parseNetscapeExt(block);
						break;
					default:
						parseUnknownAppExt(block);
						break;
				}
		    }
		    var parsePlainTextExtension = function(block) {
				var blockSize = self.stream.readUint8(); // Always 0x0c.
				block.header = self.stream.readBytes(12);
				block.data = self.parseSubBlocks();
		    }
		    var parseUnknownExtension = function(block) {
		        block.data = self.parseSubBlocks();
		    }
			var block = {};
		    block.label = this.stream.readUint8();
		    switch (block.label) {
				case 0x01:
					block.extType = 'pte';
					parsePlainTextExtension(block);
					break;
				case 0xF9:
					block.extType = 'gce';
					parseGraphicsControlExtension(block);
					break;
				case 0xFE:
					block.extType = 'com';
					parseCommentExtension(block);
					break;
				case 0xFF:
					block.extType = 'app';
					parseApplicationExtension(block);
					break;
				default:
					block.extType ='unknown';
					parseUnknownExtension(block);
					break;
			}
			return block;
		},

		parseImage : function(){

			var deinterlace = function(input, width, height) {
				var result = new ArrayBuffer(input.byteLength);
				var resultView = new Uint8Array(result);
				var inputView = new Uint8Array(input);
				var offsets = [0,4,2,1];
				var steps   = [8,8,4,2];
				var fromRow = 0;
				for (var pass = 0; pass < 4; pass++) {
					for (var toRow = offsets[pass]; toRow < height; toRow += steps[pass], fromRow++) {
						var fromOffset = fromRow * width;
						var toOffset = toRow * width;
						resultView.set(inputView.subarray(fromOffset, fromOffset + width), toOffset);
					}
				}
				return result;
			};

			var image = {};
			image.left = this.stream.readUint16();
			image.top = this.stream.readUint16();
			image.width = this.stream.readUint16();
			image.height = this.stream.readUint16();

			var packed = GIF.byteToBitArray(this.stream.readUint8());
			image.localColorTableFlag = packed.shift();
			image.interlaceFlag = packed.shift();
			image.sortFlag = packed.shift();
			image.reserved = packed.splice(0, 2);
			image.localColorTableSize = GIF.bitArrayToNum(packed.splice(0, 3));

			if (image.localColorTableFlag)
				image.localColorTable = this.parseColorTable(1 << (image.localColorTableSize + 1))


			var lzwMinCodeSize = this.stream.readUint8();
			var lzwData = this.parseSubBlocks();

			image.data = new ArrayBuffer(image.width * image.height);
			LZW.decode(lzwMinCodeSize, lzwData, image.data);

			if (image.interlaceFlag)
			 	image.data = deinterlace(image.data, image.width, image.height);

			return image;
		}
	};

	this.GIF = this.GIF || GIF;
})()