/* hangul.js — 두벌식(KS X 5002) 한글 오토마타 + 키맵 + 손가락 배열
   - OS 한글 IME에 의존하지 않고, 물리 키(event.code)를 직접 한글로 조합한다.
   - 타깃 문자열을 표준 두벌식 자모 키 시퀀스로 분해(textToKeystrokes)하고,
     compose(tokens)가 그 시퀀스를 다시 한글로 합친다. 두 함수는 라운드트립으로 검증됨.
   검증: compose(textToKeystrokes(s)) === s  (모든 모범답안에 대해 통과) */
(function (root) {
  'use strict';

  // ===== 1) 두벌식 키맵: KeyboardEvent.code -> { base, shift? } =====
  // 자음=왼손, 모음=오른손. shift가 있는 키만 쌍자음/ㅒㅖ.
  var DUBEOL = {
    KeyQ: { base: 'ㅂ', shift: 'ㅃ' }, KeyW: { base: 'ㅈ', shift: 'ㅉ' },
    KeyE: { base: 'ㄷ', shift: 'ㄸ' }, KeyR: { base: 'ㄱ', shift: 'ㄲ' },
    KeyT: { base: 'ㅅ', shift: 'ㅆ' }, KeyY: { base: 'ㅛ' }, KeyU: { base: 'ㅕ' },
    KeyI: { base: 'ㅑ' }, KeyO: { base: 'ㅐ', shift: 'ㅒ' }, KeyP: { base: 'ㅔ', shift: 'ㅖ' },
    KeyA: { base: 'ㅁ' }, KeyS: { base: 'ㄴ' }, KeyD: { base: 'ㅇ' }, KeyF: { base: 'ㄹ' },
    KeyG: { base: 'ㅎ' }, KeyH: { base: 'ㅗ' }, KeyJ: { base: 'ㅓ' }, KeyK: { base: 'ㅏ' },
    KeyL: { base: 'ㅣ' }, KeyZ: { base: 'ㅋ' }, KeyX: { base: 'ㅌ' }, KeyC: { base: 'ㅊ' },
    KeyV: { base: 'ㅍ' }, KeyB: { base: 'ㅠ' }, KeyN: { base: 'ㅜ' }, KeyM: { base: 'ㅡ' }
  };

  // jamo -> { code, shift:boolean }
  var JAMO_TO_KEY = {};
  Object.keys(DUBEOL).forEach(function (code) {
    var v = DUBEOL[code];
    if (!(v.base in JAMO_TO_KEY)) JAMO_TO_KEY[v.base] = { code: code, shift: false };
    if (v.shift) JAMO_TO_KEY[v.shift] = { code: code, shift: true };
  });

  // ===== 2) 손가락 배열 (표준 터치타이핑) =====
  // code -> { hand:'L'|'R', finger:'pinky'|'ring'|'middle'|'index'|'thumb' }
  var FINGER = {};
  function setF(codes, hand, finger) { codes.forEach(function (c) { FINGER[c] = { hand: hand, finger: finger }; }); }
  setF(['Backquote', 'Digit1', 'KeyQ', 'KeyA', 'KeyZ', 'Tab', 'CapsLock', 'ShiftLeft'], 'L', 'pinky');
  setF(['Digit2', 'KeyW', 'KeyS', 'KeyX'], 'L', 'ring');
  setF(['Digit3', 'KeyE', 'KeyD', 'KeyC'], 'L', 'middle');
  setF(['Digit4', 'Digit5', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB'], 'L', 'index');
  setF(['Digit6', 'Digit7', 'KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyN', 'KeyM'], 'R', 'index');
  setF(['Digit8', 'KeyI', 'KeyK', 'Comma'], 'R', 'middle');
  setF(['Digit9', 'KeyO', 'KeyL', 'Period'], 'R', 'ring');
  setF(['Digit0', 'Minus', 'Equal', 'KeyP', 'Semicolon', 'Quote', 'Slash',
        'BracketLeft', 'BracketRight', 'Backslash', 'Backspace', 'Enter', 'ShiftRight'], 'R', 'pinky');
  setF(['Space'], 'L', 'thumb');

  var FINGER_LABEL = {
    ko: { pinky: '새끼손가락', ring: '약지', middle: '가운뎃손가락', index: '검지', thumb: '엄지' },
    zh: { pinky: '小指', ring: '无名指', middle: '中指', index: '食指', thumb: '拇指' },
    vi: { pinky: 'ngón út', ring: 'ngón áp út', middle: 'ngón giữa', index: 'ngón trỏ', thumb: 'ngón cái' },
    th: { pinky: 'นิ้วก้อย', ring: 'นิ้วนาง', middle: 'นิ้วกลาง', index: 'นิ้วชี้', thumb: 'นิ้วโป้ง' }
  };
  var HAND_LABEL = {
    ko: { L: '왼손', R: '오른손' }, zh: { L: '左手', R: '右手' },
    vi: { L: 'tay trái', R: 'tay phải' }, th: { L: 'มือซ้าย', R: 'มือขวา' }
  };

  // ===== 3) 한글 조합 테이블 (유니코드) =====
  var CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  var JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  var JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  var CHO_IDX = {}, JUNG_IDX = {}, JONG_IDX = {};
  CHO.forEach(function (c, i) { CHO_IDX[c] = i; });
  JUNG.forEach(function (c, i) { JUNG_IDX[c] = i; });
  JONG.forEach(function (c, i) { if (c) JONG_IDX[c] = i; });

  var JUNG_COMBINE = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
  var JONG_COMBINE = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
  var JUNG_SPLIT = {}, JONG_SPLIT = {};
  Object.keys(JUNG_COMBINE).forEach(function (k) { JUNG_SPLIT[JUNG_COMBINE[k]] = [k[0], k[1]]; });
  Object.keys(JONG_COMBINE).forEach(function (k) { JONG_SPLIT[JONG_COMBINE[k]] = [k[0], k[1]]; });

  function isVowel(j) { return JUNG_IDX[j] !== undefined; }
  function isCons(j) { return CHO_IDX[j] !== undefined; }

  // ===== 4) 텍스트 -> 키스트로크 토큰 =====
  // token: {type:'jamo',jamo,ci} | {type:'space',ci} | {type:'enter',ci} | {type:'literal',ch,ci}
  function syllableToJamos(ch) {
    var code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return null;
    var cho = Math.floor(code / 588);
    var jung = Math.floor((code % 588) / 28);
    var jong = code % 28;
    var out = [CHO[cho]];
    var jv = JUNG[jung];
    if (JUNG_SPLIT[jv]) { out.push(JUNG_SPLIT[jv][0], JUNG_SPLIT[jv][1]); } else { out.push(jv); }
    if (jong > 0) {
      var jc = JONG[jong];
      if (JONG_SPLIT[jc]) { out.push(JONG_SPLIT[jc][0], JONG_SPLIT[jc][1]); } else { out.push(jc); }
    }
    return out;
  }

  // 타이핑용 정규화: 곡선 따옴표/특수문자를 표준 ASCII로
  function sanitize(text) {
    return String(text)
      .replace(/ /g, ' ')
      .replace(/[“”″]/g, '"')
      .replace(/[‘’′]/g, "'")
      .replace(/…/g, '...')
      .replace(/[–—]/g, '-')
      .replace(/\t/g, ' ');
  }

  function textToKeystrokes(text) {
    var toks = [];
    var s = sanitize(text);
    var ci = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      var jamos = syllableToJamos(ch);
      if (jamos) {
        for (var k = 0; k < jamos.length; k++) toks.push({ type: 'jamo', jamo: jamos[k], ci: ci });
      } else if (ch === ' ') {
        toks.push({ type: 'space', ci: ci });
      } else if (ch === '\n') {
        toks.push({ type: 'enter', ci: ci });
      } else if (/[ㄱ-ㅎㅏ-ㅣ]/.test(ch)) {
        // 호환 자모 단독(자리연습): 조합 자모면 분해
        if (JONG_SPLIT[ch]) { toks.push({ type: 'jamo', jamo: JONG_SPLIT[ch][0], ci: ci }, { type: 'jamo', jamo: JONG_SPLIT[ch][1], ci: ci }); }
        else if (JUNG_SPLIT[ch]) { toks.push({ type: 'jamo', jamo: JUNG_SPLIT[ch][0], ci: ci }, { type: 'jamo', jamo: JUNG_SPLIT[ch][1], ci: ci }); }
        else { toks.push({ type: 'jamo', jamo: ch, ci: ci }); }
      } else {
        toks.push({ type: 'literal', ch: ch, ci: ci });
      }
      ci++;
    }
    return toks;
  }

  // ===== 5) 키스트로크 토큰 -> 한글 (두벌식 오토마타) =====
  function compose(tokens) {
    var out = '';
    var cho = null, jung = null, jong = null;
    function flush() {
      if (cho !== null) {
        if (jung !== null) out += String.fromCharCode(0xAC00 + (cho * 21 + jung) * 28 + (jong || 0));
        else out += CHO[cho];
      } else if (jung !== null) {
        out += JUNG[jung];
      }
      cho = jung = jong = null;
    }
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.type !== 'jamo') { flush(); out += (t.type === 'space' ? ' ' : t.type === 'enter' ? '\n' : t.ch); continue; }
      var j = t.jamo;
      if (isVowel(j)) {
        if (cho !== null && jung === null) {
          jung = JUNG_IDX[j];
        } else if (cho !== null && jung !== null && jong === null) {
          var comb = JUNG_COMBINE[JUNG[jung] + j];
          if (comb !== undefined) { jung = JUNG_IDX[comb]; }
          else { flush(); jung = JUNG_IDX[j]; }
        } else if (cho !== null && jung !== null && jong !== null) {
          // 종성이 다음 글자의 초성으로 넘어감 (감 + ㅏ -> 가 + 마)
          var jc = JONG[jong];
          if (JONG_SPLIT[jc]) {
            jong = JONG_IDX[JONG_SPLIT[jc][0]];
            var movedCho = JONG_SPLIT[jc][1];
            flush();
            cho = CHO_IDX[movedCho]; jung = JUNG_IDX[j]; jong = null;
          } else {
            var moved = jc; jong = null; flush();
            cho = CHO_IDX[moved]; jung = JUNG_IDX[j]; jong = null;
          }
        } else { // 초성 없음
          if (jung !== null) { var c2 = JUNG_COMBINE[JUNG[jung] + j]; if (c2 !== undefined) jung = JUNG_IDX[c2]; else { flush(); jung = JUNG_IDX[j]; } }
          else { flush(); jung = JUNG_IDX[j]; }
        }
      } else { // 자음
        if (cho === null && jung === null) {
          if (CHO_IDX[j] !== undefined) cho = CHO_IDX[j]; else out += j;
        } else if (cho !== null && jung === null) {
          flush(); cho = CHO_IDX[j];
        } else if (cho !== null && jung !== null && jong === null) {
          if (JONG_IDX[j] !== undefined) jong = JONG_IDX[j];
          else { flush(); cho = CHO_IDX[j]; }
        } else { // 종성 존재 -> 겹받침 시도
          var cb = JONG_COMBINE[JONG[jong] + j];
          if (cb !== undefined) { jong = JONG_IDX[cb]; }
          else { flush(); if (CHO_IDX[j] !== undefined) cho = CHO_IDX[j]; else out += j; }
        }
      }
    }
    flush();
    return out;
  }

  // ===== 6) 키 입력 판정 =====
  // event(code, shiftKey) 에서 실제로 나오는 jamo
  function producedJamo(code, shift) {
    var v = DUBEOL[code];
    if (!v) return null;
    return shift && v.shift ? v.shift : v.base;
  }

  // 토큰이 기대하는 키 (가상 키보드 하이라이트용): {code, shift}
  function tokenKey(tok) {
    if (!tok) return null;
    if (tok.type === 'space') return { code: 'Space', shift: false };
    if (tok.type === 'enter') return { code: 'Enter', shift: false };
    if (tok.type === 'jamo') return JAMO_TO_KEY[tok.jamo] || null;
    if (tok.type === 'literal') return LITERAL_KEY[tok.ch] || null;
    return null;
  }

  // literal(구두점/숫자) -> {code, shift}  (US 배열 기준)
  var LITERAL_KEY = (function () {
    var m = {};
    function add(ch, code, shift) { m[ch] = { code: code, shift: !!shift }; }
    '0123456789'.split('').forEach(function (d) { add(d, 'Digit' + d, false); });
    add(')', 'Digit0', true); add('!', 'Digit1', true); add('@', 'Digit2', true); add('#', 'Digit3', true);
    add('$', 'Digit4', true); add('%', 'Digit5', true); add('^', 'Digit6', true); add('&', 'Digit7', true);
    add('*', 'Digit8', true); add('(', 'Digit9', true);
    add('-', 'Minus', false); add('_', 'Minus', true); add('=', 'Equal', false); add('+', 'Equal', true);
    add('[', 'BracketLeft', false); add('{', 'BracketLeft', true);
    add(']', 'BracketRight', false); add('}', 'BracketRight', true);
    add('\\', 'Backslash', false); add('|', 'Backslash', true);
    add(';', 'Semicolon', false); add(':', 'Semicolon', true);
    add("'", 'Quote', false); add('"', 'Quote', true);
    add(',', 'Comma', false); add('<', 'Comma', true);
    add('.', 'Period', false); add('>', 'Period', true);
    add('/', 'Slash', false); add('?', 'Slash', true);
    add('`', 'Backquote', false); add('~', 'Backquote', true);
    return m;
  })();

  // literal 입력 시 실제로 나오는 글자
  function producedLiteral(code, shift) {
    for (var ch in LITERAL_KEY) {
      if (LITERAL_KEY[ch].code === code && LITERAL_KEY[ch].shift === shift) return ch;
    }
    return null;
  }

  // 한 키 입력이 기대 토큰과 맞는지
  function matches(tok, code, shift) {
    if (!tok) return false;
    if (tok.type === 'space') return code === 'Space';
    if (tok.type === 'enter') return code === 'Enter';
    if (tok.type === 'jamo') return producedJamo(code, shift) === tok.jamo;
    if (tok.type === 'literal') return producedLiteral(code, shift) === tok.ch;
    return false;
  }

  var HG = {
    DUBEOL: DUBEOL, JAMO_TO_KEY: JAMO_TO_KEY, FINGER: FINGER,
    FINGER_LABEL: FINGER_LABEL, HAND_LABEL: HAND_LABEL,
    CHO: CHO, JUNG: JUNG, JONG: JONG, LITERAL_KEY: LITERAL_KEY,
    sanitize: sanitize, syllableToJamos: syllableToJamos,
    textToKeystrokes: textToKeystrokes, compose: compose,
    producedJamo: producedJamo, producedLiteral: producedLiteral,
    tokenKey: tokenKey, matches: matches, isVowel: isVowel, isCons: isCons
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = HG;
  root.HG = HG;
})(typeof window !== 'undefined' ? window : this);
