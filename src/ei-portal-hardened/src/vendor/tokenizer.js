// Enterprise Intelligence byte-level BPE tokenizer. Ported verbatim from the box es5_tokenizer.js;
// UMD wrapper replaced with an ES module export.
var EITokenizer = (function () {

  'use strict';

  // GPT-2-style pretokenizer pattern: contractions, then optional-leading-
  // space runs of letters / digits / other-non-space, then whitespace.
  // Standard ES5 RegExp (no /u flag, no \p{} property escapes).
  var PRETOKEN_RE = /'s|'t|'re|'ve|'m|'ll|'d| ?[A-Za-z]+| ?[0-9]+| ?[^\sA-Za-z0-9]+|\s+(?!\S)|\s+/g;

  function utf8Encode(str) {
    var bytes = [];
    var i, code, next;
    for (i = 0; i < str.length; i++) {
      code = str.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
        next = str.charCodeAt(i + 1);
        if (next >= 0xDC00 && next <= 0xDFFF) {
          code = 0x10000 + (code - 0xD800) * 0x400 + (next - 0xDC00);
          i++;
        }
      }
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
      } else if (code < 0x10000) {
        bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
      } else {
        bytes.push(
          0xF0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3F),
          0x80 | ((code >> 6) & 0x3F),
          0x80 | (code & 0x3F)
        );
      }
    }
    return bytes;
  }

  function utf8Decode(bytes) {
    var out = '';
    var i = 0;
    var n = bytes.length;
    while (i < n) {
      var b0 = bytes[i];
      var cp, b1, b2, b3;
      if (b0 < 0x80) {
        cp = b0;
        i += 1;
      } else if ((b0 & 0xE0) === 0xC0 && i + 1 < n) {
        b1 = bytes[i + 1];
        cp = ((b0 & 0x1F) << 6) | (b1 & 0x3F);
        i += 2;
      } else if ((b0 & 0xF0) === 0xE0 && i + 2 < n) {
        b1 = bytes[i + 1];
        b2 = bytes[i + 2];
        cp = ((b0 & 0x0F) << 12) | ((b1 & 0x3F) << 6) | (b2 & 0x3F);
        i += 3;
      } else if ((b0 & 0xF8) === 0xF0 && i + 3 < n) {
        b1 = bytes[i + 1];
        b2 = bytes[i + 2];
        b3 = bytes[i + 3];
        cp = ((b0 & 0x07) << 18) | ((b1 & 0x3F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F);
        i += 4;
      } else {
        cp = 0xFFFD;
        i += 1;
      }
      if (cp > 0xFFFF) {
        cp -= 0x10000;
        out += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
      } else {
        out += String.fromCharCode(cp);
      }
    }
    return out;
  }

  function EITokenizer(data) {
    this.vocab = data.vocab; // token-string -> id
    this.idToToken = {};
    for (var tok in this.vocab) {
      if (Object.prototype.hasOwnProperty.call(this.vocab, tok)) {
        this.idToToken[this.vocab[tok]] = tok;
      }
    }
    this.specialTokens = data.special_tokens || {};
    this.unkId = this.specialTokens['<|unk|>'];

    // byte value (0-255) -> single unicode char used to represent it
    this.byteEncoder = {};
    this.byteDecoder = {};
    for (var bKey in data.byte_encoder) {
      if (Object.prototype.hasOwnProperty.call(data.byte_encoder, bKey)) {
        var ch = data.byte_encoder[bKey];
        this.byteEncoder[parseInt(bKey, 10)] = ch;
        this.byteDecoder[ch] = parseInt(bKey, 10);
      }
    }

    // merge rank: "leftright" -> priority (lower = merge earlier)
    this.mergeRank = {};
    var merges = data.merges;
    for (var m = 0; m < merges.length; m++) {
      this.mergeRank[merges[m][0] + '' + merges[m][1]] = m;
    }
  }

  EITokenizer.prototype._bytesToSymbols = function (bytes) {
    var symbols = [];
    for (var i = 0; i < bytes.length; i++) {
      symbols.push(this.byteEncoder[bytes[i]]);
    }
    return symbols;
  };

  // Greedy BPE merge over one pretokenized "word" (array of single-char
  // symbols already through the byte encoder). Repeatedly merges the
  // adjacent pair with the lowest trained rank until none remain.
  EITokenizer.prototype._bpeMerge = function (symbols) {
    if (symbols.length <= 1) return symbols;
    var word = symbols.slice();
    while (true) {
      var bestRank = Infinity;
      var bestIdx = -1;
      for (var i = 0; i < word.length - 1; i++) {
        var key = word[i] + '' + word[i + 1];
        var rank = this.mergeRank[key];
        if (rank !== undefined && rank < bestRank) {
          bestRank = rank;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      var merged = word[bestIdx] + word[bestIdx + 1];
      var next = word.slice(0, bestIdx);
      next.push(merged);
      next = next.concat(word.slice(bestIdx + 2));
      word = next;
    }
    return word;
  };

  EITokenizer.prototype.encode = function (text) {
    var ids = [];
    var words = text.match(PRETOKEN_RE);
    if (!words) return ids;
    for (var w = 0; w < words.length; w++) {
      var bytes = utf8Encode(words[w]);
      var symbols = this._bytesToSymbols(bytes);
      var merged = this._bpeMerge(symbols);
      for (var s = 0; s < merged.length; s++) {
        var tokenStr = merged[s];
        var id = Object.prototype.hasOwnProperty.call(this.vocab, tokenStr)
          ? this.vocab[tokenStr]
          : this.unkId;
        ids.push(id);
      }
    }
    return ids;
  };

  EITokenizer.prototype.decode = function (ids) {
    var chars = [];
    for (var i = 0; i < ids.length; i++) {
      var tok = this.idToToken[ids[i]];
      if (tok === undefined) continue;
      // skip special tokens in plain-text decode
      var isSpecial = false;
      for (var sKey in this.specialTokens) {
        if (this.specialTokens[sKey] === ids[i]) {
          isSpecial = true;
          break;
        }
      }
      if (isSpecial) continue;
      for (var c = 0; c < tok.length; c++) {
        chars.push(tok.charAt(c));
      }
    }
    var bytes = [];
    for (var j = 0; j < chars.length; j++) {
      var bd = this.byteDecoder[chars[j]];
      if (bd !== undefined) bytes.push(bd);
    }
    return utf8Decode(bytes);
  };

  EITokenizer.prototype.vocabSize = function () {
    var n = 0;
    for (var k in this.vocab) {
      if (Object.prototype.hasOwnProperty.call(this.vocab, k)) n++;
    }
    return n;
  };

  return EITokenizer;

})();
export default EITokenizer;
