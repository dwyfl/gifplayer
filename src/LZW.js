(function(global){

	// According to GIF spec.
	var LZW_MAX_CODE_SIZE = 12;

	/**
	 * View for an ArrayBuffer that extracts data on bit level.
	 **/
	var BitStream = function(arrayBuffer) {
		this.buffer = arrayBuffer;
		this.byteBuffer = new Uint8Array(arrayBuffer);
		this.position = 0;
		this.bytePosition = 0;
	};
	BitStream.prototype = {

		reset : function(){
			this.position = 0;
		},

		peekBit : function() {
			var byteValue = this.byteBuffer[this.position >> 3];
			var byteOffset = this.position & 0x07;
			return (byteValue >> byteOffset) & 1;
		},

		peekBits : function(length) {
			var position = this.position;
			var value = 0;
			var shift = 0;
			while (shift < length) {
				value = value | (this.peekBit() << shift++);
				this.position++;
			}
			this.position = position;
			return value;
		},

		read : function(length) {
			if (this.bytePosition >= this.byteBuffer.byteLength)
				return null;
			var value = 0;
			var bitsRead = 0;
			var bitsOffset = this.position & 0x07;
			var bytePositionTemp = this.bytePosition;
			while (bitsRead < bitsOffset + length) {
				value = value | (this.byteBuffer[bytePositionTemp++] << bitsRead);
				bitsRead += 8;
			}
			value = value >> bitsOffset;
			value = value & ((1 << length) - 1);
			this.position += length;
			this.bytePosition = this.position >> 3;
			return value;
		}
	};

	/**
	 * The LZW dictionary. For now, we allocate a fixed amount of space for the
	 * entries, as 12 bits is the max code size in LZW for GIF.
	 **/
	var LZWDictionary = function(){
		// The dictionary data
		this.data = new Uint8Array(1 << LZW_MAX_CODE_SIZE);
		// This array contains the index of trailing bytes for each data entry.
		this.prev = new Uint16Array(1 << LZW_MAX_CODE_SIZE);
		// This array is used for temporarily chaining indices when resolving a code to bytes.
		this.back = new Uint16Array(1 << LZW_MAX_CODE_SIZE);
	};
	LZWDictionary.prototype = {

		init : function(size){
			this.size = size;
		},
		clear : function(){
			for (var i = 0; i < this.data.length; ++i) {
				this.data[i] = 0;
				this.prev[i] = 0;
				this.back[i] = 0;
			}
			for (var i = 0; i < this.size; ++i) {
				this.data[i] = i;
			}
		}
	};

	/**
	 * LZW decoder class. Primarily based on C-code from rosettacode.org:
	 * http://rosettacode.org/wiki/LZW_compression#C
	 **/
	var LZW = function(){};

	LZW.dictionary = new LZWDictionary();

	LZW.decode = function(minCodeSize, encoded, decoded){

		// Codes

		var K_CLR = 1 << minCodeSize;
		var K_EOD = K_CLR + 1;
		var K_NEW = K_EOD + 1;
		var K_EOF = null;

		// In- and out streams

		var inStream = new BitStream(encoded);
		var outStream = new Uint8Array(decoded);
		var outPosition = 0;

		// Dictionary

		var dictionary = LZW.dictionary;
		dictionary.init(1 << minCodeSize);

		// Other

		var nextShift;
		var nextCode;
		var bits;
		var code, c, t;

		var clearDictionary = function(){
			dictionary.clear();
			bits = minCodeSize + 1;
			nextCode = K_NEW;
			nextShift = 1 << bits;
		};
		clearDictionary();

		while (true) {

			code = inStream.read(bits);

			if (code == K_EOF) {
				// If we were strict we'd throw an error, but let's just move
				// along and see what happens. Some GIFs are just corrupt.
				// throw new Error('LZW: Unexpected end of stream.');
				break;
			}
			if (code == K_EOD)
				break;
			if (code == K_CLR) {
				clearDictionary();
				continue;
			}
			if (code >= nextCode)
				throw new Error('LZW: Bad sequence.');

			dictionary.prev[nextCode] = code;
			c = code;
			while (c >= K_CLR) {
				t = dictionary.prev[c];
				dictionary.back[t] = c;
				c = t;
			}
			dictionary.data[nextCode - 1] = c;
			while (dictionary.back[c]) {
				outStream[outPosition++] = dictionary.data[c];
				t = dictionary.back[c];
				dictionary.back[c] = 0;
				c = t;
			}
			outStream[outPosition++] = dictionary.data[c];

			if (nextCode++ >= nextShift) {
				if (bits < LZW_MAX_CODE_SIZE)
					bits++;
				nextShift = nextShift << 1;
			}
		}
	};

	global.LZW = global.LZW || LZW;

})(this);