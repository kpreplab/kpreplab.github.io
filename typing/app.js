/* =====================================================================
   공유 비밀번호 잠금 — 본 앱(../)과 같은 키·해시를 쓴다.
   한쪽에서 한 번 풀면 이 기기는 양쪽 다 열린다. 암호화가 아니라 초대 장치다.
   ===================================================================== */
(function () {
  var KEY = 'nq_gate';
  var HASH = '114c7254931234f33ea9796f12d2add601b4a235be570ff587826bad4915c935';
  var ALT = 'Z3dpaHVh';
  var gate = function () { return document.getElementById('gate'); };
  function unlocked() { try { return localStorage.getItem(KEY) === HASH; } catch (e) { return false; } }
  function open() { var el = gate(); if (el) el.classList.add('hidden'); }
  async function ok(v) {
    var s = (v || '').trim();
    if (!s) return false;
    if (window.crypto && crypto.subtle && window.isSecureContext) {
      try {
        var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
        var hex = Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        return hex === HASH;
      } catch (e) {}
    }
    try { return btoa(s) === ALT; } catch (e) { return false; }
  }
  function wire() {
    if (unlocked()) { open(); return; }
    var form = document.getElementById('gateForm');
    var input = document.getElementById('gateInput');
    var err = document.getElementById('gateErr');
    if (!form || !input) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (await ok(input.value)) {
        try { localStorage.setItem(KEY, HASH); } catch (e2) {}
        err.classList.add('hidden');
        open();
      } else {
        err.classList.remove('hidden');
        input.value = '';
        input.focus();
      }
    });
    setTimeout(function () { input.focus(); }, 60);
  }
  if (unlocked()) open();   // 이미 푼 기기에는 잠금 화면이 비치지 않게 즉시 처리
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

/* app.js — 한글 타자 연습 (두벌식)
   모드: 자리연습 / 낱글자 / 단문 / 귀화 작문(장문)
   입력은 hangul.js 오토마타로 처리(OS IME 불필요). 정답은 키스트로크 단위 비교.
   언어: ko/zh/vi/th (귀화앱과 동일). 귀화앱이 고른 언어(nq_lang)를 물려받음. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var LANG_NAME = { ko: '한국어', zh: '中文', vi: 'Tiếng Việt', th: 'ภาษาไทย' };
  var LANG_FLAG = { ko: '🇰🇷', zh: '🇨🇳', vi: '🇻🇳', th: '🇹🇭' };
  var LANG_ORDER = ['ko', 'zh', 'vi', 'th'];
  var LINE_BUDGET = 28; // 장문 줄바꿈 기준(글자 수)

  // ===== I18N (ko / zh / vi / th) =====
  var I18N = {
    ko: {
      'app.title': '한글 타자 연습', 'app.toQuiz': '귀화앱',
      'home.lead': '한글 자판이 손에 익을 때까지, 한 단계씩 천천히 연습해요.',
      'home.imeTip': '컴퓨터 입력기를 한글로 바꾸지 않아도 됩니다. 화면이 알려주는 키를 그대로 누르세요.',
      'home.hint': '개인용 연습 도구 · 점수는 이 기기에만 저장됩니다.',
      'mode.position.t': '자리 연습', 'mode.position.s': 'ㅎ ㅁ ㅂ ㅕ · 자판 위치와 손가락 익히기',
      'mode.syllable.t': '낱글자 연습', 'mode.syllable.s': '자음+모음을 모아 한 글자씩 완성',
      'mode.short.t': '단문 연습', 'mode.short.s': '짧은 문장 따라 치기',
      'mode.long.t': '귀화 작문 연습', 'mode.long.s': '작문 모범답안(200자) 따라 치기',
      'common.home': '홈', 'common.list': '목록', 'common.retry': '다시', 'common.next': '다음 →',
      'stat.time': '시간', 'stat.speed': '타수', 'stat.acc': '정확도', 'stat.miss': '오타',
      'next.this': '이 자리', 'next.char': '다음', 'next.space': '스페이스', 'next.enter': '엔터',
      'next.shift': 'Shift 함께', 'done.title': '잘했어요! 완성', 'done.best': '최고 기록 경신!',
      'done.speed': '타/분', 'done.acc': '정확도', 'done.time': '걸린 시간',
      'done.nextHint': 'Enter로 다음', 'done.listHint': 'Enter로 목록',
      'list.position': '단계를 골라 시작하세요. 처음에는 ‘기본 자리’부터.',
      'list.syllable': '쉬운 글자부터 한 글자씩 완성해 보세요.',
      'list.short': '짧은 문장을 따라 치며 손을 풀어요.',
      'list.long': '귀화 작문 시험에 나오는 주제의 모범답안입니다. 의미를 보며 따라 치세요.',
      'sec.sec': '초', 'best.label': '최고', 'topic.label': '주제', 'echo.label': '내가 친 것',
      'mode.word.t': '낱말 연습', 'mode.word.s': '비슷한 낱말을 빠르게 구별하며 치기',
      'list.word': '비슷하게 생긴 낱말을 빠르게 알아보고 정확히 치는 연습이에요.',
      'sound.on': '소리 켜짐', 'sound.off': '소리 듣기',
      // A1 정확도 게이트
      'gate.msg': '정확도 95% 이상일 때 기록으로 인정됩니다.',
      // A2 성장
      'delta.label': '지난 판 대비', 'delta.speed': '타수', 'delta.acc': '정확도',
      'mini.week': '이번 주', 'mini.games': '판', 'mini.avgspeed': '평균 타수', 'mini.acc': '정확도',
      // A3 약한 키
      'weak.title': '자주 틀리는 키', 'weak.drill': '약한 키 보충 연습',
      'weak.pracTitle': '약한 키 보충', 'weak.none': '이번 판은 다 잘 쳤어요!',
      // A4 온보딩
      'ob.eyebrow': '시작하기 전에', 'ob.title': '30초만 읽어 주세요',
      'ob.s1': '<b>왼손은 자음, 오른손은 모음</b>이에요. 자판을 안 외워도 화면이 알려줍니다.',
      'ob.s2': '한 글자는 자모의 조합이에요. 예를 들어 ',
      'ob.s2b': ' 는 ', 'ob.s2c': ' 를 차례로 누르면 완성돼요.',
      'ob.s3': '<b>화면이 알려주는 키</b>를 그대로 누르면 됩니다. 천천히 시작해요.',
      'ob.start': '시작하기',
      // A5 홈 배지
      'badge.best': '최고', 'badge.empty': '아직 연습 안 함',
      // A6 실전 쓰기
      'list.freewrite': '실전 쓰기', 'list.follow': '따라 치기',
      'fw.badge': '실전', 'fw.ph': '여기에 자유롭게 답안을 쓰세요.',
      'fw.showModel': '완료 · 모범답안 보기', 'fw.modelLabel': '모범답안 (스스로 비교해 보세요)',
      'fw.selfQ': '스스로 평가하면?', 'fw.good': '잘함', 'fw.ok': '보통', 'fw.poor': '부족',
      'fw.done': '수고했어요! 스스로 대조해 보세요.', 'fw.guide': '작성 도움말', 'fw.chars': '글자',
      'sec.min': '분'
    },
    zh: {
      'app.title': '韩文打字练习', 'app.toQuiz': '入籍App',
      'home.lead': '在熟悉韩文键盘之前，一步一步慢慢练习。',
      'home.imeTip': '不需要把电脑输入法切换成韩文。直接按屏幕提示的键即可。',
      'home.hint': '个人练习工具 · 成绩仅保存在本设备。',
      'mode.position.t': '指位练习', 'mode.position.s': 'ㅎ ㅁ ㅂ ㅕ — 熟悉键位与手指',
      'mode.syllable.t': '单字练习', 'mode.syllable.s': '辅音+元音，一个字一个字组合',
      'mode.short.t': '短句练习', 'mode.short.s': '跟着打短句子',
      'mode.long.t': '入籍作文练习', 'mode.long.s': '跟着打作文范文（200字）',
      'common.home': '主页', 'common.list': '列表', 'common.retry': '重来', 'common.next': '下一个 →',
      'stat.time': '时间', 'stat.speed': '速度', 'stat.acc': '准确率', 'stat.miss': '错字',
      'next.this': '此键', 'next.char': '下一个', 'next.space': '空格', 'next.enter': '回车',
      'next.shift': '同时按 Shift', 'done.title': '做得好！完成', 'done.best': '刷新最佳成绩！',
      'done.speed': '键/分', 'done.acc': '准确率', 'done.time': '用时',
      'done.nextHint': '按 Enter 继续', 'done.listHint': '按 Enter 回列表',
      'list.position': '选择一个阶段开始。第一次请从“基本键位”开始。',
      'list.syllable': '从简单的字开始，一个字一个字完成。',
      'list.short': '跟着打短句子，活动手指。',
      'list.long': '这些是入籍作文考试主题的范文。看着意思跟着打。',
      'sec.sec': '秒', 'best.label': '最佳', 'topic.label': '主题', 'echo.label': '我打的',
      'mode.word.t': '单词练习', 'mode.word.s': '快速辨别相似的词并打出',
      'list.word': '快速识别外形相似的词并准确打出。',
      'sound.on': '声音开', 'sound.off': '听发音',
      'gate.msg': '准确率达到95%以上才会记为成绩。',
      'delta.label': '与上一局相比', 'delta.speed': '速度', 'delta.acc': '准确率',
      'mini.week': '本周', 'mini.games': '局', 'mini.avgspeed': '平均速度', 'mini.acc': '准确率',
      'weak.title': '经常打错的键', 'weak.drill': '薄弱键补充练习',
      'weak.pracTitle': '薄弱键补充', 'weak.none': '这一局都打得很好！',
      'ob.eyebrow': '开始之前', 'ob.title': '请花30秒读一下',
      'ob.s1': '<b>左手是辅音，右手是元音</b>。不用背键位，屏幕会提示你。',
      'ob.s2': '一个字是字母的组合。比如 ',
      'ob.s2b': ' 就是按顺序按 ', 'ob.s2c': ' 就能组成。',
      'ob.s3': '照着<b>屏幕提示的键</b>按就行。慢慢开始吧。',
      'ob.start': '开始',
      'badge.best': '最佳', 'badge.empty': '还没练习',
      'list.freewrite': '实战书写', 'list.follow': '跟着打',
      'fw.badge': '实战', 'fw.ph': '请在这里自由书写你的答案。',
      'fw.showModel': '完成 · 查看范文', 'fw.modelLabel': '范文（请自行对照）',
      'fw.selfQ': '自我评价？', 'fw.good': '很好', 'fw.ok': '一般', 'fw.poor': '不足',
      'fw.done': '辛苦了！请自行对照。', 'fw.guide': '写作提示', 'fw.chars': '字',
      'sec.min': '分'
    },
    vi: {
      'app.title': 'Luyện gõ tiếng Hàn', 'app.toQuiz': 'App nhập tịch',
      'home.lead': 'Luyện từng bước cho đến khi quen bàn phím tiếng Hàn.',
      'home.imeTip': 'Không cần chuyển bộ gõ máy tính sang tiếng Hàn. Chỉ cần bấm đúng phím màn hình chỉ.',
      'home.hint': 'Công cụ luyện tập cá nhân · Điểm chỉ lưu trên thiết bị này.',
      'mode.position.t': 'Luyện vị trí phím', 'mode.position.s': 'ㅎ ㅁ ㅂ ㅕ — làm quen vị trí phím và ngón tay',
      'mode.syllable.t': 'Luyện từng chữ', 'mode.syllable.s': 'Ghép phụ âm + nguyên âm thành từng chữ',
      'mode.short.t': 'Luyện câu ngắn', 'mode.short.s': 'Gõ theo câu ngắn',
      'mode.long.t': 'Luyện viết bài nhập tịch', 'mode.long.s': 'Gõ theo bài văn mẫu (200 chữ)',
      'common.home': 'Trang chủ', 'common.list': 'Danh sách', 'common.retry': 'Làm lại', 'common.next': 'Tiếp →',
      'stat.time': 'Thời gian', 'stat.speed': 'Tốc độ', 'stat.acc': 'Chính xác', 'stat.miss': 'Lỗi',
      'next.this': 'Phím này', 'next.char': 'Tiếp', 'next.space': 'Phím cách', 'next.enter': 'Enter',
      'next.shift': 'Bấm kèm Shift', 'done.title': 'Giỏi lắm! Hoàn thành', 'done.best': 'Phá kỷ lục!',
      'done.speed': 'phím/phút', 'done.acc': 'Chính xác', 'done.time': 'Thời gian',
      'done.nextHint': 'Nhấn Enter để tiếp', 'done.listHint': 'Nhấn Enter về danh sách',
      'list.position': 'Chọn một bước để bắt đầu. Lần đầu hãy bắt đầu từ “phím cơ bản”.',
      'list.syllable': 'Bắt đầu từ chữ dễ, hoàn thành từng chữ một.',
      'list.short': 'Gõ theo câu ngắn để làm nóng tay.',
      'list.long': 'Đây là bài văn mẫu cho các chủ đề thi viết nhập tịch. Vừa xem nghĩa vừa gõ theo.',
      'sec.sec': ' giây', 'best.label': 'Tốt nhất', 'topic.label': 'Chủ đề', 'echo.label': 'Tôi đã gõ',
      'mode.word.t': 'Luyện từ', 'mode.word.s': 'Phân biệt nhanh các từ giống nhau và gõ',
      'list.word': 'Nhận diện nhanh các từ trông giống nhau và gõ chính xác.',
      'sound.on': 'Bật âm', 'sound.off': 'Nghe âm',
      'gate.msg': 'Chỉ ghi nhận kỷ lục khi độ chính xác từ 95% trở lên.',
      'delta.label': 'So với lần trước', 'delta.speed': 'Tốc độ', 'delta.acc': 'Chính xác',
      'mini.week': 'Tuần này', 'mini.games': 'lượt', 'mini.avgspeed': 'Tốc độ TB', 'mini.acc': 'Chính xác',
      'weak.title': 'Phím hay gõ sai', 'weak.drill': 'Luyện bù phím yếu',
      'weak.pracTitle': 'Luyện bù phím yếu', 'weak.none': 'Lượt này bạn gõ đúng hết rồi!',
      'ob.eyebrow': 'Trước khi bắt đầu', 'ob.title': 'Đọc trong 30 giây nhé',
      'ob.s1': '<b>Tay trái là phụ âm, tay phải là nguyên âm</b>. Không cần thuộc phím, màn hình sẽ chỉ.',
      'ob.s2': 'Một chữ là sự ghép các chữ cái. Ví dụ ',
      'ob.s2b': ' là bấm lần lượt ', 'ob.s2c': ' sẽ thành.',
      'ob.s3': 'Cứ bấm đúng <b>phím màn hình chỉ</b> là được. Bắt đầu từ từ thôi.',
      'ob.start': 'Bắt đầu',
      'badge.best': 'Tốt nhất', 'badge.empty': 'Chưa luyện',
      'list.freewrite': 'Viết thực chiến', 'list.follow': 'Gõ theo',
      'fw.badge': 'Thực chiến', 'fw.ph': 'Hãy tự do viết bài của bạn ở đây.',
      'fw.showModel': 'Xong · Xem bài mẫu', 'fw.modelLabel': 'Bài mẫu (hãy tự đối chiếu)',
      'fw.selfQ': 'Tự đánh giá?', 'fw.good': 'Tốt', 'fw.ok': 'Bình thường', 'fw.poor': 'Chưa đạt',
      'fw.done': 'Làm tốt lắm! Hãy tự đối chiếu.', 'fw.guide': 'Gợi ý viết', 'fw.chars': 'chữ',
      'sec.min': ' phút'
    },
    th: {
      'app.title': 'ฝึกพิมพ์ภาษาเกาหลี', 'app.toQuiz': 'แอปแปลงสัญชาติ',
      'home.lead': 'ฝึกทีละขั้นจนกว่าจะคุ้นกับแป้นพิมพ์ภาษาเกาหลี',
      'home.imeTip': 'ไม่ต้องเปลี่ยนตัวพิมพ์ในเครื่องเป็นภาษาเกาหลี แค่กดปุ่มตามที่หน้าจอบอก',
      'home.hint': 'เครื่องมือฝึกส่วนตัว · คะแนนบันทึกเฉพาะในเครื่องนี้',
      'mode.position.t': 'ฝึกตำแหน่งแป้น', 'mode.position.s': 'ㅎ ㅁ ㅂ ㅕ — คุ้นเคยกับตำแหน่งแป้นและนิ้ว',
      'mode.syllable.t': 'ฝึกตัวอักษร', 'mode.syllable.s': 'รวมพยัญชนะ+สระให้เป็นตัวอักษรทีละตัว',
      'mode.short.t': 'ฝึกประโยคสั้น', 'mode.short.s': 'พิมพ์ตามประโยคสั้น',
      'mode.long.t': 'ฝึกเขียนเรียงความแปลงสัญชาติ', 'mode.long.s': 'พิมพ์ตามเรียงความตัวอย่าง (200 ตัว)',
      'common.home': 'หน้าหลัก', 'common.list': 'รายการ', 'common.retry': 'เริ่มใหม่', 'common.next': 'ถัดไป →',
      'stat.time': 'เวลา', 'stat.speed': 'ความเร็ว', 'stat.acc': 'ความแม่นยำ', 'stat.miss': 'พิมพ์ผิด',
      'next.this': 'ปุ่มนี้', 'next.char': 'ถัดไป', 'next.space': 'เว้นวรรค', 'next.enter': 'Enter',
      'next.shift': 'กด Shift ด้วย', 'done.title': 'เยี่ยมมาก! เสร็จแล้ว', 'done.best': 'ทำลายสถิติ!',
      'done.speed': 'ปุ่ม/นาที', 'done.acc': 'ความแม่นยำ', 'done.time': 'เวลาที่ใช้',
      'done.nextHint': 'กด Enter เพื่อไปต่อ', 'done.listHint': 'กด Enter กลับรายการ',
      'list.position': 'เลือกขั้นเพื่อเริ่ม ครั้งแรกเริ่มจาก “แป้นพื้นฐาน”',
      'list.syllable': 'เริ่มจากตัวอักษรง่าย ๆ ทำให้เสร็จทีละตัว',
      'list.short': 'พิมพ์ตามประโยคสั้นเพื่ออุ่นเครื่องนิ้ว',
      'list.long': 'นี่คือเรียงความตัวอย่างของหัวข้อสอบเขียนแปลงสัญชาติ ดูความหมายแล้วพิมพ์ตาม',
      'sec.sec': ' วิ', 'best.label': 'ดีที่สุด', 'topic.label': 'หัวข้อ', 'echo.label': 'ที่ฉันพิมพ์',
      'mode.word.t': 'ฝึกคำศัพท์', 'mode.word.s': 'แยกแยะคำที่คล้ายกันอย่างรวดเร็วแล้วพิมพ์',
      'list.word': 'ฝึกจำคำที่หน้าตาคล้ายกันอย่างรวดเร็วและพิมพ์ให้ถูก',
      'sound.on': 'เปิดเสียง', 'sound.off': 'ฟังเสียง',
      'gate.msg': 'จะบันทึกเป็นสถิติเมื่อความแม่นยำ 95% ขึ้นไป',
      'delta.label': 'เทียบกับรอบก่อน', 'delta.speed': 'ความเร็ว', 'delta.acc': 'ความแม่นยำ',
      'mini.week': 'สัปดาห์นี้', 'mini.games': 'รอบ', 'mini.avgspeed': 'ความเร็วเฉลี่ย', 'mini.acc': 'ความแม่นยำ',
      'weak.title': 'ปุ่มที่พิมพ์ผิดบ่อย', 'weak.drill': 'ฝึกเสริมปุ่มที่อ่อน',
      'weak.pracTitle': 'ฝึกเสริมปุ่มที่อ่อน', 'weak.none': 'รอบนี้พิมพ์ถูกหมดเลย!',
      'ob.eyebrow': 'ก่อนเริ่ม', 'ob.title': 'อ่านสัก 30 วินาทีนะ',
      'ob.s1': '<b>มือซ้ายคือพยัญชนะ มือขวาคือสระ</b> ไม่ต้องจำแป้น หน้าจอจะบอกเอง',
      'ob.s2': 'หนึ่งตัวอักษรคือการผสมพยัญชนะสระ เช่น ',
      'ob.s2b': ' คือกดตามลำดับ ', 'ob.s2c': ' ก็จะได้',
      'ob.s3': 'แค่กด<b>ปุ่มที่หน้าจอบอก</b>ก็พอ ค่อย ๆ เริ่มนะ',
      'ob.start': 'เริ่มเลย',
      'badge.best': 'ดีที่สุด', 'badge.empty': 'ยังไม่ฝึก',
      'list.freewrite': 'เขียนจริง', 'list.follow': 'พิมพ์ตาม',
      'fw.badge': 'เขียนจริง', 'fw.ph': 'เขียนคำตอบของคุณได้อย่างอิสระที่นี่',
      'fw.showModel': 'เสร็จ · ดูตัวอย่าง', 'fw.modelLabel': 'เรียงความตัวอย่าง (ลองเทียบด้วยตัวเอง)',
      'fw.selfQ': 'ประเมินตัวเอง?', 'fw.good': 'ดี', 'fw.ok': 'พอใช้', 'fw.poor': 'ยังไม่พอ',
      'fw.done': 'เก่งมาก! ลองเทียบด้วยตัวเองนะ', 'fw.guide': 'คำแนะนำการเขียน', 'fw.chars': 'ตัว',
      'sec.min': ' นาที'
    }
  };
  function readInheritedLang() {
    var own = localStorage.getItem('typing_lang');
    if (own && LANG_NAME[own]) return own;
    try { var p = JSON.parse(localStorage.getItem('nq_lang') || 'null'); if (p && LANG_NAME[p]) return p; } catch (e) {}
    return 'ko';
  }
  var lang = readInheritedLang();
  function t(k) { return (I18N[lang] && I18N[lang][k]) || I18N.ko[k] || k; }
  function L(o) { return (o && (o[lang] || o.ko)) || ''; }

  // ===== 콘텐츠 =====
  var POSITION_STEPS = [
    { title: { ko: '기본 자리 (가운뎃줄)', zh: '基本键位（中排）', vi: 'Phím cơ bản (hàng giữa)', th: 'แป้นพื้นฐาน (แถวกลาง)' }, set: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'] },
    { title: { ko: '윗줄', zh: '上排', vi: 'Hàng trên', th: 'แถวบน' }, set: ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'] },
    { title: { ko: '아랫줄', zh: '下排', vi: 'Hàng dưới', th: 'แถวล่าง' }, set: ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'] },
    { title: { ko: '쌍자음·이중모음 (Shift)', zh: '双辅音·复元音（Shift）', vi: 'Phụ âm đôi · nguyên âm đôi (Shift)', th: 'พยัญชนะคู่·สระประสม (Shift)' }, set: ['ㅃ', 'ㅉ', 'ㄸ', 'ㄲ', 'ㅆ', 'ㅒ', 'ㅖ'] },
    { title: { ko: '전체 섞어서', zh: '全部混合', vi: 'Trộn tất cả', th: 'รวมทั้งหมด' }, set: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ', 'ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅕ', 'ㅐ', 'ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅜ', 'ㅡ'] }
  ];
  var SYLLABLE_STEPS = [
    { title: { ko: '기본 글자 (자음·모음 조합)', zh: '基本字（辅音·元音组合）', vi: 'Chữ cơ bản (ghép phụ âm·nguyên âm)', th: 'ตัวอักษรพื้นฐาน (ผสมพยัญชนะ·สระ)' }, gen: 'cv', text: '가 요 누 툐 머 디 보 챠 르 케 새 데 …' },
    { title: { ko: '받침이 있는 글자', zh: '带收音的字', vi: 'Chữ có patchim', th: 'ตัวอักษรที่มีตัวสะกด' }, text: '강 산 물 밤 곰 집 발 손 눈 별 꽃 옷' },
    { title: { ko: '쉬운 낱말', zh: '简单词语', vi: 'Từ đơn giản', th: 'คำง่าย ๆ' }, text: '한국 사랑 가족 친구 학교 감사 행복 우리 사람 음식 한글 나라' }
  ];
  // 비슷하게 생긴 낱말 변별 — 전부 실재 한국어 낱말
  var WORD_STEPS = [
    { title: { ko: '비슷한 모음 (머·마·미)', zh: '相似元音（머·마·미）', vi: 'Nguyên âm giống nhau (머·마·미)', th: 'สระคล้ายกัน (머·마·미)' }, text: '마리 머리 미리 모래 무리 아마 어머니 이미 머루 마루 미로' },
    { title: { ko: '받침 ㄹ 낱말', zh: '收音ㄹ的词', vi: 'Từ có patchim ㄹ', th: 'คำที่มีตัวสะกด ㄹ' }, text: '물 불 풀 굴 술 줄 글 길 김 들 달 별' },
    { title: { ko: '된소리 변별', zh: '紧音辨别', vi: 'Phân biệt âm căng', th: 'แยกเสียงหนัก' }, text: '자다 짜다 차다 사다 싸다 타다 따다 가다 까다 하다 파다' },
    { title: { ko: '비슷한 두 글자', zh: '相似的两字词', vi: 'Từ hai chữ giống nhau', th: 'คำสองพยางค์ที่คล้ายกัน' }, text: '나무 너무 노래 누나 나비 너비 모자 모기 바다 바지 가방 가족' },
    { title: { ko: '받침 변별 (ㄴ·ㅇ·ㅁ)', zh: '收音辨别（ㄴ·ㅇ·ㅁ）', vi: 'Phân biệt patchim (ㄴ·ㅇ·ㅁ)', th: 'แยกตัวสะกด (ㄴ·ㅇ·ㅁ)' }, text: '간 강 감 산 상 삼 반 방 밤 손 솔 솜' },
    { title: { ko: '헷갈리는 낱말', zh: '容易混淆的词', vi: 'Từ dễ nhầm lẫn', th: 'คำที่สับสนง่าย' }, text: '의사 이사 시계 세계 사람 사랑 친구 친척 학교 학생 가게 가계' }
  ];
  var CURATED_SHORT = [
    { text: '안녕하세요.', trans: { zh: '你好。', vi: 'Xin chào.', th: 'สวัสดีค่ะ' } },
    { text: '만나서 반갑습니다.', trans: { zh: '很高兴见到你。', vi: 'Rất vui được gặp bạn.', th: 'ยินดีที่ได้รู้จัก' } },
    { text: '저는 외국에서 왔어요.', trans: { zh: '我来自外国。', vi: 'Tôi đến từ nước ngoài.', th: 'ฉันมาจากต่างประเทศ' } },
    { text: '한국 생활이 즐거워요.', trans: { zh: '韩国生活很愉快。', vi: 'Cuộc sống ở Hàn Quốc rất vui.', th: 'ชีวิตในเกาหลีสนุกดี' } },
    { text: '한국어를 열심히 배워요.', trans: { zh: '我努力学习韩语。', vi: 'Tôi chăm chỉ học tiếng Hàn.', th: 'ฉันตั้งใจเรียนภาษาเกาหลี' } },
    { text: '오늘도 좋은 하루 보내세요.', trans: { zh: '今天也祝你过得愉快。', vi: 'Chúc bạn một ngày tốt lành.', th: 'ขอให้วันนี้เป็นวันที่ดี' } }
  ];

  function topicOf(q) {
    if (!q) return '';
    var s = q.replace(/^다음 주제로[^:：]*[:：]\s*/, '').trim();
    s = s.replace(/<br\s*\/?>/gi, ' ').replace(/^["“”']|["“”'.]$/g, '').trim();
    return s;
  }
  function cleanPrompt(q) { return (q || '').replace(/<br\s*\/?>/gi, ' / '); }
  function transOf(d) { return { zh: d.model_zh || '', vi: d.model_vi || '', th: d.model_th || '' }; }
  function guideOf(d) { return { ko: d.guide || '', zh: d.guide_zh || '', vi: d.guide_vi || '', th: d.guide_th || '' }; }

  var DATA = [];
  var NAT = [];
  var PRE = [];
  var SHORT_ITEMS = [];
  var LONG_ITEMS = [];
  var typingDataLoaded = false;
  var pendingMemberAction = null;

  function rebuildWritingData(data) {
    DATA = Array.isArray(data) ? data : [];
    NAT = DATA.filter(function (d) { return (d.exam || 'nat') === 'nat'; });
    PRE = DATA.filter(function (d) { return d.exam === 'pre'; });
    SHORT_ITEMS = CURATED_SHORT.map(function (c) { return { text: c.text, trans: c.trans, kind: 'text' }; })
      .concat(PRE.map(function (d) {
        return { text: (d.model || '').trim(), trans: transOf(d), topic: cleanPrompt(d.q), kind: 'text' };
      }).filter(function (x) { return x.text; }));
    LONG_ITEMS = NAT.map(function (d) {
      return { text: (d.model || '').trim(), trans: transOf(d), topic: topicOf(d.q), guide: guideOf(d), kind: 'text', id: d.id };
    }).filter(function (x) { return x.text; });
    if (MODES && MODES.short) MODES.short.items = SHORT_ITEMS;
    if (MODES && MODES.long) MODES.long.items = LONG_ITEMS;
  }

  var MODES = {
    position: { kind: 'position', title: { ko: '자리 연습', zh: '指位练习', vi: 'Luyện vị trí phím', th: 'ฝึกตำแหน่งแป้น' }, desc: 'list.position', items: POSITION_STEPS },
    syllable: { kind: 'text', title: { ko: '낱글자 연습', zh: '单字练习', vi: 'Luyện từng chữ', th: 'ฝึกตัวอักษร' }, desc: 'list.syllable', items: SYLLABLE_STEPS },
    word: { kind: 'text', title: { ko: '낱말 연습', zh: '单词练习', vi: 'Luyện từ', th: 'ฝึกคำศัพท์' }, desc: 'list.word', items: WORD_STEPS },
    short: { kind: 'text', title: { ko: '단문 연습', zh: '短句练习', vi: 'Luyện câu ngắn', th: 'ฝึกประโยคสั้น' }, desc: 'list.short', items: SHORT_ITEMS },
    long: { kind: 'text', title: { ko: '귀화 작문 연습', zh: '入籍作文练习', vi: 'Luyện viết bài nhập tịch', th: 'ฝึกเขียนเรียงความแปลงสัญชาติ' }, desc: 'list.long', items: LONG_ITEMS }
  };
  rebuildWritingData([]);

  // ===== 가상 키보드 레이아웃 =====
  var PUNCT = {
    Backquote: ['`', '~'], Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'], Digit4: ['4', '$'],
    Digit5: ['5', '%'], Digit6: ['6', '^'], Digit7: ['7', '&'], Digit8: ['8', '*'], Digit9: ['9', '('],
    Digit0: ['0', ')'], Minus: ['-', '_'], Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
    Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'], Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?']
  };
  var KB_ROWS = [
    ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', { code: 'Backspace', label: '⌫', cls: 'special wide' }],
    [{ code: 'Tab', label: 'Tab', cls: 'special wide' }, 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
    [{ code: 'CapsLock', label: 'Caps', cls: 'special wider' }, 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', { code: 'Enter', label: '↵', cls: 'special wider' }],
    [{ code: 'ShiftLeft', label: 'Shift', cls: 'special widest' }, 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', { code: 'ShiftRight', label: 'Shift', cls: 'special widest' }],
    [{ code: 'Space', label: '', cls: 'spacekey' }]
  ];
  var keyEls = {};

  function buildKeyboard() {
    var kb = $('#keyboard');
    kb.innerHTML = '';
    keyEls = {};
    KB_ROWS.forEach(function (row) {
      var r = document.createElement('div');
      r.className = 'kbd-row';
      row.forEach(function (cell) {
        var code = typeof cell === 'string' ? cell : cell.code;
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'key';
        el.dataset.code = code;
        if (typeof cell === 'object') {
          el.className += ' ' + (cell.cls || '');
          var m = document.createElement('span'); m.className = 'key__main'; m.textContent = cell.label; el.appendChild(m);
        } else if (HG.DUBEOL[code]) {
          var f = HG.FINGER[code]; if (f) el.className += ' f-' + f.finger;
          if (code === 'KeyF' || code === 'KeyJ') el.className += ' homedot';
          var main = document.createElement('span'); main.className = 'key__main'; main.textContent = HG.DUBEOL[code].base; el.appendChild(main);
          if (HG.DUBEOL[code].shift) { var sh = document.createElement('span'); sh.className = 'key__shift'; sh.textContent = HG.DUBEOL[code].shift; el.appendChild(sh); }
          var lat = document.createElement('span'); lat.className = 'key__lat'; lat.textContent = code.replace('Key', '').toLowerCase(); el.appendChild(lat);
        } else if (PUNCT[code]) {
          var f2 = HG.FINGER[code]; if (f2) el.className += ' f-' + f2.finger;
          var m2 = document.createElement('span'); m2.className = 'key__main'; m2.textContent = PUNCT[code][0]; el.appendChild(m2);
          var s2 = document.createElement('span'); s2.className = 'key__shift'; s2.textContent = PUNCT[code][1]; el.appendChild(s2);
        }
        el.addEventListener('click', function () { onVirtualKey(code); });
        keyEls[code] = el;
        r.appendChild(el);
      });
      kb.appendChild(r);
    });
  }

  // ===== 상태 =====
  var state = null;
  var timerId = null;
  var soundOn = (localStorage.getItem('typing_sound') !== '0'); // 기본 켜짐 — 사용자가 끈 적 있을 때만 꺼짐

  // ===== 발음(소리) — 자음은 +ㅡ(므·느), 모음은 ㅇ+(아·어). 검증된 조합 오토마타 재사용 =====
  function jamoToSyllable(j) {
    if (HG.isCons(j)) return HG.compose([{ type: 'jamo', jamo: j }, { type: 'jamo', jamo: 'ㅡ' }]);
    if (HG.isVowel(j)) return HG.compose([{ type: 'jamo', jamo: 'ㅇ' }, { type: 'jamo', jamo: j }]);
    return '';
  }
  // 가장 또렷한 한국어 음성 고르기 — 신경망/네트워크 음성(특히 Chrome의 Google 음성) 우선
  var koVoice = null;
  function pickKoVoice() {
    if (!('speechSynthesis' in window)) return;
    var vs = window.speechSynthesis.getVoices() || [];
    var ko = vs.filter(function (v) { return /^ko/i.test(v.lang || ''); });
    if (!ko.length) { koVoice = null; return; }
    var PREF = ['google', 'sunhi', 'sun-hi', 'seoyeon', 'yuna', 'injoon', 'jimin', 'heami', 'natural', 'neural', 'wavenet'];
    function score(v) {
      var n = (v.name || '').toLowerCase(), s = 0;
      if (n.indexOf('google') > -1) s += 100;       // Chrome의 Google 한국어(신경망) = 가장 또렷
      for (var i = 0; i < PREF.length; i++) { if (n.indexOf(PREF[i]) > -1) { s += 50; break; } }
      if (!v.localService) s += 40;                  // 네트워크 음성이 대체로 더 명확
      if (v.default) s += 5;
      return s;
    }
    ko.sort(function (a, b) { return score(b) - score(a); });
    koVoice = ko[0];
  }
  if ('speechSynthesis' in window) {
    pickKoVoice();
    try { window.speechSynthesis.addEventListener('voiceschanged', pickKoVoice); } catch (e) {}
  }
  function speakJamo(j) {
    if (!soundOn || !j) return;
    if (!('speechSynthesis' in window)) return;
    var syl = jamoToSyllable(j); if (!syl) return;
    try {
      window.speechSynthesis.cancel();
      if (!koVoice) pickKoVoice();
      var u = new SpeechSynthesisUtterance(syl);
      u.lang = 'ko-KR'; u.rate = 0.72; u.pitch = 1.0;
      if (koVoice) u.voice = koVoice;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function updateSoundToggle() {
    var b = $('#soundToggle'); if (!b) return;
    b.innerHTML = iconSvg(soundOn ? 'sound' : 'mute', 'sound-toggle__ico') + '<span>' + esc(soundOn ? t('sound.on') : t('sound.off')) + '</span>';
    b.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  }
  function toggleSound() {
    soundOn = !soundOn;
    try { localStorage.setItem('typing_sound', soundOn ? '1' : '0'); } catch (e) {}
    updateSoundToggle();
    if (soundOn) { var exp = currentExpected(); if (exp && exp.jamo) speakJamo(exp.jamo); }
  }

  function newState(mode, idx) {
    var cfg = MODES[mode];
    var item = cfg.items[idx];
    var s = { mode: mode, kind: cfg.kind, idx: idx, item: item, correct: 0, errors: 0, startTime: 0, running: false, finished: false, weakSession: {} };
    if (cfg.kind === 'position') {
      s.seq = buildDrill(item.set);
      s.posIdx = 0;
      s.total = s.seq.length;
    } else {
      var txt;
      if (item.gen === 'cv') {
        // 매 세션 무작위 음절 생성(고정 목록 반복 대신)
        txt = genSyllables(MIN_SYL.syllable || 140);
      } else if (mode === 'short') {
        // 같은 문장 반복 대신 연속된 4문장을 이어붙여 분량을 늘림(끝에서는 앞으로 순환)
        var items = cfg.items, n = items.length, parts = [];
        for (var k = 0; k < 4 && k < n; k++) parts.push(items[(idx + k) % n].text);
        txt = parts.join(' ');
      } else {
        txt = expandText(item.text, mode);
      }
      s.target = txt;
      s.tokens = HG.textToKeystrokes(txt);
      s.chars = HG.sanitize(txt).split('');
      s.lines = wrapLines(s.chars);
      s.pos = 0;
      s.typed = [];   // 실제로 친 자모/문자 토큰(오답 포함) — 백스페이스로 되돌림
      s.total = s.tokens.length;
    }
    return s;
  }

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  // 자리연습: 한 세션을 충분히 길게(~180회) — 세트 단위로 섞어 이어붙임
  function buildDrill(set) { var out = set.slice(); while (out.length < 175) out = out.concat(shuffle(set)); return out; }
  // 텍스트 모드: 음절 최소치까지 통째로 반복 (낱글자·낱말). 단문은 newState에서 여러 문장 이어붙임. 귀화작문(long)은 제외.
  var MIN_SYL = { syllable: 330, word: 300 };
  function sylCount(text) { return (String(text).match(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g) || []).length; }
  function expandText(text, mode) {
    var min = MIN_SYL[mode] || 0; if (!min) return text;
    var base = String(text).trim(), out = base, g = 0;
    while (sylCount(out) < min && g++ < 80) out += ' ' + base;
    return out;
  }
  // 무작위 음절 생성(자음+모음, 받침 없음) — '가 요 누 툐'처럼 매번 다르게 섞이도록
  var GEN_CONS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  var GEN_VOW = ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ', 'ㅐ', 'ㅔ'];
  function randSyllable() {
    var cho = HG.CHO.indexOf(GEN_CONS[Math.floor(Math.random() * GEN_CONS.length)]);
    var jung = HG.JUNG.indexOf(GEN_VOW[Math.floor(Math.random() * GEN_VOW.length)]);
    return String.fromCharCode(0xAC00 + (cho * 21 + jung) * 28);
  }
  function genSyllables(n) { var out = []; for (var i = 0; i < n; i++) out.push(randSyllable()); return out.join(' '); }

  // 단어(공백) 단위로 줄 분할 → 각 줄 = [start,end) 글자 인덱스(끝의 공백 제외)
  function wrapLines(chars) {
    var lines = [], n = chars.length, i = 0;
    var lineStart = -1, lineEnd = -1, lineLen = 0;
    while (i < n) {
      var j = i; while (j < n && chars[j] !== ' ') j++; // [i,j) = 한 단어
      var wlen = j - i;
      if (lineStart < 0) { lineStart = i; lineEnd = j; lineLen = wlen; }
      else if (lineLen + 1 + wlen <= LINE_BUDGET) { lineEnd = j; lineLen += 1 + wlen; }
      else { lines.push({ start: lineStart, end: lineEnd }); lineStart = i; lineEnd = j; lineLen = wlen; }
      i = (j < n) ? j + 1 : j; // 공백 건너뜀(줄바꿈)
    }
    if (lineStart >= 0) lines.push({ start: lineStart, end: lineEnd });
    return lines.length ? lines : [{ start: 0, end: n }];
  }

  // ===== 화면 전환 =====
  function show(view) { $$('.view').forEach(function (v) { v.classList.add('hidden'); }); $('#view-' + view).classList.remove('hidden'); window.scrollTo(0, 0); }

  function goHome() { stopTimer(); renderHome(); show('home'); }

  function memberStatus() {
    return window.GwiwhaMembership ? window.GwiwhaMembership.getStatus() : { configured: false, signedIn: false, active: false, reason: 'not_configured' };
  }
  function clearMemberCaches() {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      try { navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_MEMBER_CACHE' }); } catch (e) {}
    }
  }
  function memberMsg(reason) {
    if (reason === 'not_configured') return '회원 시스템 설정이 필요합니다.';
    if (reason === 'invalid_otp') return '인증번호가 올바르지 않습니다.';
    if (reason === 'not_member') return '등록된 회원이 아닙니다.\n결제 후 이용할 수 있습니다.';
    if (reason === 'inactive') return '현재 이용할 수 없는 계정입니다.\n관리자에게 문의해 주세요.';
    if (reason === 'email_required') return '이메일을 입력해 주세요.';
    if (reason === 'otp_required') return '인증번호를 입력해 주세요.';
    if (reason === 'network') return '네트워크 오류가 발생했습니다.\n다시 시도해 주세요.';
    return '회원 로그인 후 이용할 수 있습니다.';
  }
  function setMemberMessage(msg, kind) {
    var el = $('#memberMessage');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', kind === 'error');
    el.classList.toggle('is-ok', kind === 'ok');
  }
  function openMemberModal(reason) {
    var modal = $('#memberModal');
    if (!modal) return;
    var st = memberStatus();
    if (st.email) $('#memberEmail').value = st.email;
    $('#memberLogoutBtn').classList.toggle('hidden', !st.signedIn);
    setMemberMessage(reason ? memberMsg(reason) : '', reason ? 'error' : '');
    modal.classList.remove('hidden');
    setTimeout(function () { (st.signedIn ? $('#memberOtp') : $('#memberEmail')).focus(); }, 60);
  }
  function closeMemberModal() {
    $('#memberModal').classList.add('hidden');
    setMemberMessage('', '');
  }
  async function ensureTypingData() {
    if (typingDataLoaded) return true;
    if (!window.GwiwhaMembership) return false;
    try {
      var data = await window.GwiwhaMembership.fetchQuestions({ type: 'writing' });
      rebuildWritingData(data);
      typingDataLoaded = true;
      renderHome();
      return true;
    } catch (e) {
      setMemberMessage(memberMsg('network'), 'error');
      return false;
    }
  }
  async function requireMembership(action) {
    var st = window.GwiwhaMembership ? await window.GwiwhaMembership.refreshStatus() : memberStatus();
    if (st.active) {
      var ok = await ensureTypingData();
      if (ok && typeof action === 'function') action();
      return ok;
    }
    pendingMemberAction = action || null;
    openMemberModal(st.reason);
    return false;
  }
  async function runPendingMemberAction() {
    var action = pendingMemberAction;
    pendingMemberAction = null;
    if (typeof action === 'function') await requireMembership(action);
  }
  function bindMemberUi() {
    var cancel = $('#memberCancelBtn');
    if (cancel) cancel.addEventListener('click', function () { pendingMemberAction = null; closeMemberModal(); });
    var modal = $('#memberModal');
    if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) { pendingMemberAction = null; closeMemberModal(); } });
    var send = $('#memberSendOtpBtn');
    if (send) send.addEventListener('click', async function () {
      if (!window.GwiwhaMembership) { setMemberMessage(memberMsg('not_configured'), 'error'); return; }
      send.disabled = true;
      setMemberMessage('회원 정보를 확인하는 중입니다.', '');
      var res = await window.GwiwhaMembership.sendOtp($('#memberEmail').value);
      send.disabled = false;
      if (res.ok) {
        $('#memberEmail').value = res.email;
        setMemberMessage('이메일로 인증번호를 보냈습니다.', 'ok');
        $('#memberOtp').focus();
      } else setMemberMessage(memberMsg(res.reason), 'error');
    });
    var form = $('#memberOtpForm');
    if (form) form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!window.GwiwhaMembership) { setMemberMessage(memberMsg('not_configured'), 'error'); return; }
      $('#memberVerifyBtn').disabled = true;
      setMemberMessage('회원 정보를 확인하는 중입니다.', '');
      var res = await window.GwiwhaMembership.verifyOtp($('#memberEmail').value, $('#memberOtp').value);
      $('#memberVerifyBtn').disabled = false;
      if (!res.ok) {
        var reason = res.status ? res.status.reason : res.reason;
        setMemberMessage(memberMsg(reason), 'error');
        return;
      }
      var ok = await ensureTypingData();
      if (!ok) return;
      closeMemberModal();
      await runPendingMemberAction();
    });
    var logout = $('#memberLogoutBtn');
    if (logout) logout.addEventListener('click', async function () {
      if (window.GwiwhaMembership) await window.GwiwhaMembership.signOut();
      clearMemberCaches();
      typingDataLoaded = false;
      rebuildWritingData([]);
      pendingMemberAction = null;
      closeMemberModal();
      goHome();
    });
  }

  // A5: 홈 mode-card에 최고 기록 배지 / 미연습 표시
  // A2: 홈 상단 미니 요약 스트립
  function renderHome() {
    // 각 mode의 대표 최고기록(그 mode에서 가장 높은 속도의 rec)
    Object.keys(MODES).forEach(function (mode) {
      var el = $('.mode-card[data-mode="' + mode + '"] [data-badge="' + mode + '"]');
      if (!el) return;
      var n = MODES[mode].items.length, bestSpeed = 0, bestAcc = null;
      for (var i = 0; i < n; i++) {
        var r = getBestRec(mode, i);
        if (r && r.speed > bestSpeed) { bestSpeed = r.speed; bestAcc = r.acc; }
      }
      if (bestSpeed > 0) {
        el.className = 'mode-card__badge';
        el.textContent = t('badge.best') + ' ' + bestSpeed + (bestAcc != null ? ' · ' + bestAcc + '%' : '');
      } else {
        el.className = 'mode-card__badge mode-card__badge--empty';
        el.textContent = t('badge.empty');
      }
      el.classList.remove('hidden');
    });
    // 미니 스트립
    var strip = $('#miniStrip');
    var wk = weekSummary();
    if (wk) {
      strip.innerHTML =
        '<div class="mini-strip__item"><span class="mini-strip__label">' + t('mini.week') + '</span><span class="mini-strip__num">' + wk.games + '<span>' + t('mini.games') + '</span></span></div>' +
        '<div class="mini-strip__item"><span class="mini-strip__label">' + t('mini.avgspeed') + '</span><span class="mini-strip__num">' + wk.avgSpeed + '</span></div>' +
        (wk.avgAcc != null ? '<div class="mini-strip__item"><span class="mini-strip__label">' + t('mini.acc') + '</span><span class="mini-strip__num">' + wk.avgAcc + '<span>%</span></span></div>' : '');
      strip.classList.remove('hidden');
    } else {
      strip.classList.add('hidden');
    }
  }

  function goList(mode) {
    var cfg = MODES[mode];
    $('#listTitle').textContent = L(cfg.title);
    $('#listDesc').textContent = t(cfg.desc);
    var box = $('#listItems'); box.innerHTML = '';
    cfg.items.forEach(function (item, i) {
      var title, sub = '';
      if (cfg.kind === 'position') { title = L(item.title); sub = item.set.join(' '); }
      else if (mode === 'syllable' || mode === 'word') { title = L(item.title); sub = item.text; }
      else if (mode === 'long') { title = item.topic; sub = (lang === 'ko') ? item.text : ((item.trans && item.trans[lang]) || item.text); }
      else { title = item.text; sub = (lang === 'ko') ? '' : ((item.trans && item.trans[lang]) || ''); }
      var best = getBest(mode, i);

      if (mode === 'long') {
        // A6: 장문은 '따라 치기' + '실전 쓰기' 두 진입
        var wrap = document.createElement('div');
        wrap.className = 'long-item';
        wrap.innerHTML =
          '<div class="long-item__head"><span class="select-item__title">' + esc(title) + '</span>' +
          (best ? '<span class="select-item__best">' + t('best.label') + ' ' + best + '</span>' : '') + '</div>' +
          (sub ? '<div class="select-item__sub long-item__sub">' + esc(clip(sub, 90)) + '</div>' : '') +
          '<div class="long-item__acts">' +
          '<button class="btn btn--ghost btn--sm long-item__btn" data-act="follow">' + esc(t('list.follow')) + '</button>' +
          '<button class="btn btn--primary btn--sm long-item__btn" data-act="freewrite">' + esc(t('list.freewrite')) + '</button>' +
          '</div>';
        wrap.querySelector('[data-act="follow"]').addEventListener('click', function () { startPractice(mode, i); });
        wrap.querySelector('[data-act="freewrite"]').addEventListener('click', function () { startFreewrite(i); });
        box.appendChild(wrap);
        return;
      }

      var b = document.createElement('button');
      b.className = 'select-item';
      b.innerHTML = '<span class="select-item__main"><span class="select-item__title">' + esc(title) + '</span>' +
        (sub ? '<span class="select-item__sub">' + esc(clip(sub, 70)) + '</span>' : '') + '</span>' +
        (best ? '<span class="select-item__best">' + t('best.label') + ' ' + best + '</span>' : '');
      b.addEventListener('click', function () { startPractice(mode, i); });
      box.appendChild(b);
    });
    state = { mode: mode };
    show('list');
  }

  // ===== 연습 시작 =====
  function startPractice(mode, idx) {
    state = newState(mode, idx);
    var cfg = MODES[mode];
    var perItemTitle = (mode === 'position' || mode === 'syllable' || mode === 'word');
    $('#pracTitle').textContent = (perItemTitle && state.item.title) ? L(state.item.title) : L(cfg.title);
    // 발음 듣기 토글: 글자 단위 연습(자리·낱글자) + 낱말·단문·장문(음절 완성 시 읽기, A7)
    var soundModes = (state.kind === 'text' || mode === 'position');
    var stog = $('#soundToggle');
    if (stog) { stog.classList.toggle('hidden', !soundModes); updateSoundToggle(); }
    // 화면 요소 복구(실전 쓰기에서 돌아온 경우)
    $('#targetBox').classList.remove('hidden');
    $('#nextKey').classList.remove('hidden');
    $('#fwBox').classList.add('hidden');
    $('.kbd-wrap').classList.remove('hidden');
    // 장문 따라치기 뷰포트 핏 클래스
    $('#view-practice').classList.toggle('is-long', mode === 'long');
    var meta = $('#pracMeta');
    var tr = state.item.trans && state.item.trans[lang];
    if (state.kind === 'text' && (state.item.topic || (tr && lang !== 'ko'))) {
      if (mode === 'long') {
        // 장문 뷰포트 픽스: 주제 1줄 요약 + 펼치기(details)로 압축
        var body = '';
        if (tr && lang !== 'ko') body += '<div class="prac-meta__trans">' + esc(tr) + '</div>';
        meta.className = 'prac-meta prac-meta--fold';
        meta.innerHTML =
          '<details' + (body ? '' : ' open') + '><summary>' +
          '<span class="prac-meta__sumtopic">' + esc((t('topic.label') + ': ') + (state.item.topic || '')) + '</span>' +
          '<svg class="prac-meta__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
          '</summary>' + (body ? '<div class="prac-meta__body">' + body + '</div>' : '') + '</details>';
        meta.classList.remove('hidden');
      } else {
        meta.className = 'prac-meta';
        var html = '';
        if (state.item.topic) html += '<div class="prac-meta__topic">' + esc(state.item.topic) + '</div>';
        if (tr && lang !== 'ko') html += '<div class="prac-meta__trans">' + esc(tr) + '</div>';
        meta.innerHTML = html; meta.classList.remove('hidden');
      }
    } else { meta.className = 'prac-meta'; meta.classList.add('hidden'); }
    $('#pracDone').classList.add('hidden');
    show('practice');
    render();
    updateStats();
  }

  // ===== A6: 실전 쓰기(자유 타이핑) =====
  function startFreewrite(idx) {
    var item = LONG_ITEMS[idx];
    if (!item) return;
    state = {
      mode: 'long', kind: 'free', idx: idx, item: item,
      free: [], // 입력 토큰 배열(오토마타)
      correct: 0, errors: 0, startTime: 0, running: false, finished: false,
      weakSession: {}
    };
    $('#pracTitle').textContent = item.topic || t('mode.long.t');
    var stog = $('#soundToggle'); if (stog) stog.classList.add('hidden');
    // 주제 + 작성 도움말(가이드)을 prac-meta에 표시(펼침 없이 전부 보임 — 실전은 안내가 화면의 목적)
    var meta = $('#pracMeta');
    var guide = item.guide && (item.guide[lang] || item.guide.ko);
    var trans = item.trans && item.trans[lang];
    var html = '<div class="prac-meta__topic">' + t('topic.label') + ': ' + esc(item.topic || '') + '</div>';
    if (guide) html += '<div class="prac-meta__trans"><b>' + esc(t('fw.guide')) + ':</b> ' + esc(guide) + '</div>';
    else if (trans && lang !== 'ko') html += '<div class="prac-meta__trans">' + esc(trans) + '</div>';
    meta.className = 'prac-meta';
    meta.innerHTML = html; meta.classList.remove('hidden');
    // 화면 요소 토글: target-box 숨김 · fwBox 보임 · nextkey 숨김
    $('#targetBox').classList.add('hidden');
    $('#nextKey').classList.add('hidden');
    $('#fwBox').classList.remove('hidden');
    $('.kbd-wrap').classList.remove('hidden');
    $('#pracDone').classList.add('hidden');
    // 장문 뷰포트 핏 클래스는 실전에선 불필요(키보드+입력창만) — 유지해도 무방하나 제거
    $('#view-practice').classList.remove('is-long');
    show('practice');
    renderFree();
    updateFreeStats();
  }

  function renderFree() {
    var echo = $('#fwEcho');
    var str = HG.compose(state.free || []);
    echo.innerHTML = esc(str) + '<span class="caret"></span>';
    echo.setAttribute('data-ph', t('fw.ph'));
    if (!str) echo.innerHTML = '<span class="caret"></span>';
    // 게이지: 완성 글자수 / 200
    var count = HG.sanitize(str).replace(/\s/g, '').length;
    $('#fwCount').textContent = count;
    var pct = Math.min(100, Math.round(count / 200 * 100));
    var fill = $('#fwGauge');
    fill.style.width = pct + '%';
    fill.classList.toggle('is-full', count >= 200);
  }

  function handleFreeInput(code, shift) {
    if (!state || state.finished) return false;
    startTimerIfNeeded();
    var produced = producedToken(code, shift);
    if (!produced) return false;
    state.free.push(produced);
    state.correct++; // 자유 입력: 타수 측정만(오답 판정 없음)
    flashKey(code, 'pressed');
    if (soundOn) { /* 실전 쓰기는 조용히 — 토글 숨김 */ }
    renderFree(); updateFreeStats();
    return true;
  }

  function freeBackspace() {
    if (!state || state.finished) return;
    if (state.free && state.free.length) { state.free.pop(); state.correct = Math.max(0, state.correct - 1); }
    renderFree(); updateFreeStats();
  }

  function updateFreeStats() {
    var elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
    var str = HG.compose(state.free || []);
    var count = HG.sanitize(str).replace(/\s/g, '').length;
    $('#statTime').textContent = Math.floor(elapsed) + t('sec.sec');
    $('#statSpeed').textContent = elapsed >= 0.5 ? Math.round(state.correct / (elapsed / 60)) : 0;
    $('#statAcc').textContent = count; // 정확도 칸은 글자수로 대체 표기
    $('#statMiss').textContent = '–';
    var pf = $('#pracProgress'); if (pf) pf.style.width = Math.min(100, Math.round(count / 200 * 100)) + '%';
  }

  function finishFreewrite(selfRating) {
    stopTimer();
    state.finished = true;
    var elapsed = (Date.now() - state.startTime) / 1000;
    var str = HG.compose(state.free || []);
    var count = HG.sanitize(str).replace(/\s/g, '').length;
    var speed = elapsed >= 0.5 ? Math.round(state.correct / (elapsed / 60)) : 0;
    // A6: 로그에 mode:'freewrite'로 기록(오타 판정 없음 → a 생략, e 없음)
    pushLog({ m: 'freewrite', i: state.idx, s: speed, a: null, e: 0, d: new Date().toISOString(), c: count, self: selfRating || null });
    var item = state.item;
    var model = item.text;
    var d = $('#pracDone');
    d.innerHTML =
      '<div class="prac-done__title">' + t('fw.done') + '</div>' +
      '<div class="prac-done__stats">' +
      '<div class="prac-done__stat"><b>' + count + '</b><span>' + t('fw.badge') + ' · ' + t('fw.chars') + '</span></div>' +
      '<div class="prac-done__stat"><b>' + speed + '</b><span>' + t('done.speed') + '</span></div>' +
      '<div class="prac-done__stat"><b>' + Math.floor(elapsed) + t('sec.sec') + '</b><span>' + t('done.time') + '</span></div>' +
      '</div>' +
      '<div class="fw-model"><span class="fw-model__label">' + t('fw.modelLabel') + '</span>' +
      '<div class="fw-model__text">' + esc(model) + '</div></div>' +
      '<div class="fw-self"><div class="fw-self__q">' + t('fw.selfQ') + '</div>' +
      '<div class="fw-self__opts">' +
      '<button class="fw-self__opt" data-self="good">' + t('fw.good') + '</button>' +
      '<button class="fw-self__opt" data-self="ok">' + t('fw.ok') + '</button>' +
      '<button class="fw-self__opt" data-self="poor">' + t('fw.poor') + '</button>' +
      '</div></div>' +
      '<div class="prac-done__actions">' +
      '<button class="btn btn--ghost" id="doneRetry">↻ ' + t('common.retry') + '</button>' +
      '<button class="btn btn--primary" id="doneNext">' + t('common.list') + '</button>' +
      '</div>';
    d.classList.remove('hidden');
    $$('.fw-self__opt', d).forEach(function (opt) {
      opt.addEventListener('click', function () {
        $$('.fw-self__opt', d).forEach(function (o) { o.classList.remove('is-sel'); });
        opt.classList.add('is-sel');
        // 자가확인 값을 방금 로그의 마지막 freewrite 항목에 반영
        updateLastSelf(opt.getAttribute('data-self'));
      });
    });
    $('#doneRetry').addEventListener('click', function () { startFreewrite(state.idx); });
    $('#doneNext').addEventListener('click', function () { goList('long'); });
    d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function updateLastSelf(val) {
    var arr = logStore();
    for (var i = arr.length - 1; i >= 0; i--) { if (arr[i].m === 'freewrite') { arr[i].self = val; break; } }
    try { localStorage.setItem('typing_log_v1', JSON.stringify(arr)); } catch (e) {}
  }

  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } if (state) state.running = false; }
  function startTimerIfNeeded() {
    if (state.running || state.finished) return;
    state.running = true; state.startTime = Date.now();
    timerId = setInterval(function () { if (state && state.kind === 'free') updateFreeStats(); else updateStats(); }, 200);
  }

  // ===== 입력 처리 =====
  function currentExpected() {
    if (!state) return null;
    if (state.kind === 'position') {
      if (state.posIdx >= state.seq.length) return null;
      var jamo = state.seq[state.posIdx];
      return { type: 'jamo', jamo: jamo, key: HG.JAMO_TO_KEY[jamo] };
    } else {
      if (state.pos >= state.tokens.length) return null;
      var tok = state.tokens[state.pos];
      return { type: tok.type, jamo: tok.jamo, ch: tok.ch, key: HG.tokenKey(tok), tok: tok };
    }
  }

  // (code, shift) -> 실제로 나오는 입력 토큰
  function producedToken(code, shift) {
    if (code === 'Space') return { type: 'space' };
    if (code === 'Enter') return { type: 'enter' };
    var j = HG.producedJamo(code, shift); if (j) return { type: 'jamo', jamo: j };
    var ch = HG.producedLiteral(code, shift); if (ch != null) return { type: 'literal', ch: ch };
    return null;
  }
  function tokenMatch(exp, p) {
    if (!exp || !p || exp.type !== p.type) return false;
    if (p.type === 'jamo') return exp.jamo === p.jamo;
    if (p.type === 'literal') return exp.ch === p.ch;
    return true; // space/enter
  }

  function handleInput(code, shift) {
    if (!state || state.finished || ($('#view-practice').classList.contains('hidden'))) return false;
    var exp = currentExpected();
    if (!exp) return false;
    startTimerIfNeeded();

    if (state.kind === 'position') {
      // 자리 연습: 키 위치 찾기 드릴 — 맞아야 다음으로
      var okP = HG.producedJamo(code, shift) === exp.jamo;
      if (okP) {
        state.posIdx++; state.correct++;
        if (soundOn) speakJamo(exp.jamo);
        flashKey(code, 'pressed'); render(); updateStats();
        if (progressCount() >= state.total) finish();
      } else {
        state.errors++; flashKey(code, 'miss');
        recordWeak(exp.jamo);
        var ek = exp.key; if (ek && keyEls[ek.code]) { keyEls[ek.code].classList.add('miss'); setTimeout(function (e) { e.classList.remove('miss'); }, 300, keyEls[ek.code]); }
        updateStats();
      }
      return true;
    }

    // 텍스트 모드: 실제 타자 연습 — 오답도 입력되어 보이고(빨강), 백스페이스로 고침
    var produced = producedToken(code, shift);
    if (!produced) return false;
    var matched = tokenMatch(exp, produced);
    state.typed.push(produced);
    state.pos++;
    if (matched) { state.correct++; flashKey(code, 'pressed'); }
    else { state.errors++; flashKey(code, 'miss'); if (exp.type === 'jamo') recordWeak(exp.jamo); }
    // A7: 텍스트 모드 전반에서 음절 완성 시 TTS(자모 발음 재사용). 단, syllable은 자모 단위 발음 유지.
    if (soundOn && produced.type === 'jamo') {
      if (state.mode === 'syllable') speakJamo(produced.jamo);
      else speakOnSyllableComplete();
    }
    render(); updateStats();
    if (state.pos >= state.total) finish();
    return true;
  }

  // 오타 시 '정답이었어야 할 자모'를 세션+전역에 누적 (A3)
  function recordWeak(jamo) {
    if (!jamo || !HG.isCons(jamo) && !HG.isVowel(jamo)) return;
    if (state && state.weakSession) state.weakSession[jamo] = (state.weakSession[jamo] || 0) + 1;
    addWeak(jamo);
  }

  // A7: 새로 '완성된' 음절 하나가 늘어나는 순간에만 그 직전 음절을 읽어 줌 (낱말·단문·장문)
  // 판정: 조합 결과에서 '완성형 음절(가-힣) 중 마지막이 아닌 것'의 개수(=확정된 음절 수)가 늘면,
  // 방금 확정된 음절을 재생. (마지막 음절은 아직 자모가 더 붙을 수 있으므로 제외)
  function speakOnSyllableComplete() {
    if (!('speechSynthesis' in window) || !soundOn) return;
    var composed = HG.compose(state.typed || []);
    // 확정 음절 = 마지막 글자를 제외한 부분에서 완성형 음절만 셈
    var head = composed.slice(0, -1);
    var settled = (head.match(/[가-힣]/g) || []);
    var prevN = state._settledN || 0;
    if (settled.length > prevN) {
      var syl = settled[settled.length - 1];
      state._settledN = settled.length;
      try {
        window.speechSynthesis.cancel();
        if (!koVoice) pickKoVoice();
        var u = new SpeechSynthesisUtterance(syl);
        u.lang = 'ko-KR'; u.rate = 0.85; u.pitch = 1.0;
        if (koVoice) u.voice = koVoice;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    } else {
      state._settledN = settled.length;
    }
  }

  function progressCount() { return state.kind === 'position' ? state.posIdx : state.pos; }

  function backspace() {
    if (!state || state.finished) return;
    if (state.kind === 'position') { if (state.posIdx > 0) state.posIdx--; }
    else {
      if (state.pos > 0) { state.pos--; state.typed.pop(); }
      // TTS 확정 음절 카운트 재동기화(백스페이스로 되돌린 만큼)
      var head = HG.compose(state.typed || []).slice(0, -1);
      state._settledN = (head.match(/[가-힣]/g) || []).length;
    }
    render(); updateStats();
  }

  function flashKey(code, cls) {
    var el = keyEls[code]; if (!el) return;
    el.classList.add(cls); setTimeout(function () { el.classList.remove(cls); }, 120);
  }

  function onVirtualKey(code) {
    if (state && state.finished) { if (code === 'Enter' && state.kind !== 'free') goNext(); return; }
    // 실전 쓰기: 자유 입력(오토마타). 가상 키보드는 shift 상태를 알 수 없으므로 base 자모.
    if (state && state.kind === 'free') {
      if (code === 'Backspace') { freeBackspace(); return; }
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'CapsLock' || code === 'Tab') return;
      if (code === 'Enter') { handleFreeInput('Enter', false); return; }
      handleFreeInput(code, false);
      return;
    }
    var exp = currentExpected();
    var shift = (exp && exp.key && exp.key.code === code) ? !!exp.key.shift : false;
    if (code === 'Backspace') { backspace(); return; }
    if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'CapsLock' || code === 'Tab') return;
    handleInput(code, shift);
  }

  // 물리 키보드
  document.addEventListener('keydown', function (e) {
    if ($('#view-practice').classList.contains('hidden')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var code = e.code;
    // 완료 후 Enter = 다음(실전 쓰기 완료 화면은 Enter 라우팅 제외 — 자가확인 버튼 사용)
    if (state && state.finished) {
      if (code === 'Enter' && state.kind !== 'free') { e.preventDefault(); goNext(); }
      return;
    }
    // 실전 쓰기: 자유 입력
    if (state && state.kind === 'free') {
      if (code === 'Backspace') { e.preventDefault(); freeBackspace(); return; }
      if (code === 'Enter') { e.preventDefault(); handleFreeInput('Enter', e.shiftKey); return; }
      var freeKey = HG.DUBEOL[code] || PUNCT[code] || code === 'Space';
      if (!freeKey) return;
      e.preventDefault();
      handleFreeInput(code, e.shiftKey);
      return;
    }
    if (code === 'Backspace') { e.preventDefault(); backspace(); return; }
    if (code === 'Enter') {
      var exp = currentExpected();
      e.preventDefault();
      if (exp && exp.type === 'enter') handleInput(code, e.shiftKey);
      // 그 외 잘못 누른 Enter는 무시(오타 아님)
      return;
    }
    var typingKey = HG.DUBEOL[code] || PUNCT[code] || code === 'Space';
    if (!typingKey) return;
    e.preventDefault();
    handleInput(code, e.shiftKey);
  });

  function goNext() {
    if (!state) return;
    var hasNext = state.idx + 1 < MODES[state.mode].items.length;
    if (hasNext) startPractice(state.mode, state.idx + 1);
    else goList(state.mode);
  }

  // ===== 렌더 =====
  function render() {
    var box = $('#targetBox');
    highlightKeyboard();
    if (state.kind === 'position') renderPosition(box);
    else renderText(box);
    renderNextKey();
    var pct = state.total ? Math.round(progressCount() / state.total * 100) : 0;
    $('#pracProgress').style.width = pct + '%';
  }

  function renderPosition(box) {
    var seq = state.seq, i = state.posIdx;
    var html = '<div class="pos-stage"><div class="pos-queue">';
    for (var k = i - 2; k <= i + 4; k++) {
      if (k < 0 || k >= seq.length) { html += '<div class="pos-cell"></div>'; continue; }
      var cls = 'pos-cell' + (k === i ? ' is-current' : k < i ? ' is-done' : '');
      html += '<div class="' + cls + '">' + (k < i ? '✓' : esc(seq[k])) + '</div>';
    }
    html += '</div><div class="pos-progress">' + Math.min(i + 1, seq.length) + ' / ' + seq.length + '</div></div>';
    box.innerHTML = html;
  }

  function renderText(box) {
    var chars = state.chars, toks = state.tokens, pos = state.pos, lines = state.lines, typed = state.typed || [];
    var currentCi = pos < toks.length ? toks[pos].ci : chars.length;
    var html = '<div class="txt-lines">';
    for (var li = 0; li < lines.length; li++) {
      var ln = lines[li];
      // 원문(목표) 줄
      var tHtml = '';
      for (var c = ln.start; c < ln.end; c++) {
        var ch = chars[c];
        var st = c < currentCi ? 'done' : c === currentCi ? 'current' : 'pending';
        if (ch === ' ') tHtml += (c === currentCi) ? '<span class="ch current sp"> </span>' : '<span class="ch sp"> </span>';
        else tHtml += '<span class="ch ' + st + '">' + esc(ch) + '</span>';
      }
      // 입력(내가 친) 줄 — 실제 친 자모를 조합, 목표와 글자별 비교해 정(검정)/오(빨강)
      var lineTypedToks = [];
      for (var ti = 0; ti < typed.length; ti++) { if (toks[ti] && toks[ti].ci >= ln.start && toks[ti].ci < ln.end) lineTypedToks.push(typed[ti]); }
      var typedStr = HG.compose(lineTypedToks);
      var targetStr = chars.slice(ln.start, ln.end).join('');
      var eHtml = '';
      for (var ei = 0; ei < typedStr.length; ei++) {
        var cc = typedStr.charAt(ei);
        var good = cc === targetStr.charAt(ei);
        eHtml += '<span class="ech ' + (good ? 'ok' : 'bad') + (cc === ' ' ? ' sp' : '') + '">' + esc(cc) + '</span>';
      }
      var isCurrentLine = currentCi >= ln.start && currentCi <= ln.end;
      html += '<div class="tline' + (isCurrentLine ? ' is-current' : '') + '">' +
        '<div class="tline-target">' + tHtml + '</div>' +
        '<div class="tline-echo">' + eHtml + (isCurrentLine ? '<span class="caret"></span>' : '') + '</div>' +
        '</div>';
    }
    html += '</div>';
    box.innerHTML = html;
    // 현재 줄을 창 맨 위로 — 위 ~3줄만 보이고, 진행하면 아래 내용이 자동으로 올라옴
    var curLine = box.querySelector('.tline.is-current');
    var wrap = box.querySelector('.txt-lines');
    if (curLine && wrap) wrap.scrollTop = curLine.offsetTop;
  }

  function renderNextKey() {
    var exp = currentExpected();
    var nk = $('#nextKey');
    if (!exp) { nk.innerHTML = ''; return; }
    var label, big = '';
    if (state.kind === 'position') { label = t('next.this'); big = exp.jamo; }
    else if (exp.type === 'space') { label = t('next.char'); big = t('next.space'); }
    else if (exp.type === 'enter') { label = t('next.char'); big = t('next.enter'); }
    else if (exp.type === 'jamo') { label = t('next.char'); big = exp.jamo; }
    else { label = t('next.char'); big = exp.ch; }
    var html = '<b>' + esc(label) + '</b> <span class="nk-jamo">' + esc(big) + '</span>';
    var key = exp.key;
    if (key && HG.FINGER[key.code]) {
      var f = HG.FINGER[key.code];
      html += '<span class="nk-finger">' + esc(HG.HAND_LABEL[lang][f.hand] + ' ' + HG.FINGER_LABEL[lang][f.finger]) + '</span>';
    }
    if (key && key.shift) html += '<span class="nk-shift">⇧ ' + esc(t('next.shift')) + '</span>';
    nk.innerHTML = html;
  }

  function highlightKeyboard() {
    $$('.key.next, .key.next-shift').forEach(function (el) { el.classList.remove('next', 'next-shift'); });
    var exp = currentExpected();
    if (!exp || !exp.key) return;
    var key = exp.key;
    if (keyEls[key.code]) keyEls[key.code].classList.add('next');
    if (key.shift) {
      var f = HG.FINGER[key.code];
      var shiftCode = (f && f.hand === 'L') ? 'ShiftRight' : 'ShiftLeft';
      if (keyEls[shiftCode]) keyEls[shiftCode].classList.add('next-shift');
    }
  }

  // ===== 통계 =====
  function updateStats() {
    if (!state || state.kind === undefined) return;
    var elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
    var speed = elapsed >= 0.5 ? Math.min(9999, Math.round(state.correct / (elapsed / 60))) : 0;
    var attempts = state.correct + state.errors;
    var acc = attempts > 0 ? Math.round(state.correct / attempts * 100) : 100;
    $('#statTime').textContent = Math.floor(elapsed) + t('sec.sec');
    $('#statSpeed').textContent = speed;
    $('#statAcc').textContent = acc + '%';
    $('#statMiss').textContent = state.errors;
  }

  // ===== 완료 =====
  function finish() {
    stopTimer();
    state.finished = true;
    var elapsed = (Date.now() - state.startTime) / 1000;
    var speed = elapsed >= 0.5 ? Math.min(9999, Math.round(state.correct / (elapsed / 60))) : 0;
    var attempts = state.correct + state.errors;
    var acc = attempts > 0 ? Math.round(state.correct / attempts * 100) : 100;

    // A2: 세션 로그 append (보충 드릴 등 임시 판은 저장 안 함)
    var savable = !state.ephemeral;
    if (savable) {
      pushLog({ m: state.mode, i: state.idx, s: speed, a: acc, e: state.errors, d: new Date().toISOString() });
    }

    // A1: 최고기록 = 속도 경신 && 정확도 95% 이상. 임시 판은 저장 안 함.
    var prevBest = getBest(state.mode, state.idx);
    var speedBeat = speed > prevBest;
    var accPass = acc >= 95;
    var isBest = savable && speedBeat && accPass;
    if (isBest) setBest(state.mode, state.idx, speed, acc);

    // A2: 지난 판 대비(같은 mode 직전 기록) — 방금 push한 것 제외한 직전
    var prevLog = savable ? secondLastLogForMode(state.mode) : lastLogForMode(state.mode);
    var deltaHtml = '';
    if (prevLog) {
      var dSpeed = speed - (prevLog.s || 0);
      var dAcc = acc - (prevLog.a != null ? prevLog.a : acc);
      deltaHtml = '<div class="prac-done__delta">' + t('delta.label') + ': ' +
        t('delta.speed') + ' <b class="' + (dSpeed < 0 ? 'neg' : '') + '">' + (dSpeed >= 0 ? '+' : '') + dSpeed + '</b> · ' +
        t('delta.acc') + ' <b class="' + (dAcc < 0 ? 'neg' : '') + '">' + (dAcc >= 0 ? '+' : '') + dAcc + '%p</b></div>';
    }

    // A3: 약한 키(이번 판에서 틀린 자모 상위 5)
    var weak = sessionWeak(5);
    var weakHtml = '';
    if (weak.length) {
      var chips = weak.map(function (w) {
        return '<span class="weak-chip">' + esc(w.jamo) + '<small>' + w.count + '</small></span>';
      }).join('');
      weakHtml = '<div class="prac-done__weak">' +
        '<div class="prac-done__weak-label">' + iconSvg('target', 'prac-done__weak-ico') + t('weak.title') + '</div>' +
        '<div class="prac-done__weak-keys">' + chips + '</div>' +
        '<button class="btn btn--ghost btn--sm" id="doneWeakDrill">' + t('weak.drill') + '</button>' +
        '</div>';
    }

    var d = $('#pracDone');
    var hasNext = state.idx + 1 < MODES[state.mode].items.length;
    d.innerHTML =
      '<div class="prac-done__title">' + t('done.title') + '</div>' +
      (isBest ? '<div class="prac-done__best">' + iconSvg('star', 'prac-done__best-ico') + t('done.best') + '</div>' : '') +
      (savable && speedBeat && !accPass ? '<div class="prac-done__gate">' + t('gate.msg') + '</div>' : '') +
      deltaHtml +
      '<div class="prac-done__stats">' +
      '<div class="prac-done__stat"><b>' + speed + '</b><span>' + t('done.speed') + '</span></div>' +
      '<div class="prac-done__stat"><b>' + acc + '%</b><span>' + t('done.acc') + '</span></div>' +
      '<div class="prac-done__stat"><b>' + Math.floor(elapsed) + t('sec.sec') + '</b><span>' + t('done.time') + '</span></div>' +
      '</div>' + weakHtml +
      '<div class="prac-done__actions">' +
      '<button class="btn btn--ghost" id="doneRetry">↻ ' + t('common.retry') + '</button>' +
      '<button class="btn btn--primary" id="doneNext">' + (hasNext ? t('common.next') : t('common.list')) + '</button>' +
      '</div><div class="prac-done__hint">⏎ ' + (hasNext ? t('done.nextHint') : t('done.listHint')) + '</div>';
    d.classList.remove('hidden');
    $('#doneRetry').addEventListener('click', function () { startPractice(state.mode, state.idx); });
    $('#doneNext').addEventListener('click', function () {
      if (state.ephemeral) { goList(state.baseMode || state.mode); return; }
      goNext();
    });
    var wd = $('#doneWeakDrill'); if (wd) wd.addEventListener('click', startWeakDrill);
    d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // 같은 mode에서 방금 push한 것을 제외한 직전 기록
  function secondLastLogForMode(mode) {
    var arr = logStore(), seen = 0;
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i].m === mode) { seen++; if (seen === 2) return arr[i]; }
    }
    return null;
  }

  // A3: 약한 키 보충 드릴 — topWeak 자모들로 임시 position 판 즉석 실행(저장 안 함)
  function startWeakDrill() {
    var weak = sessionWeak(5);
    if (!weak.length) weak = topWeak(5);
    if (!weak.length) return;
    var set = weak.map(function (w) { return w.jamo; });
    var seq = buildDrill(set);
    var base = state ? (state.baseMode || state.mode) : 'position';
    state = {
      mode: 'position', kind: 'position', idx: 0,
      item: { title: { ko: t('weak.pracTitle'), zh: t('weak.pracTitle'), vi: t('weak.pracTitle'), th: t('weak.pracTitle') }, set: set },
      correct: 0, errors: 0, startTime: 0, running: false, finished: false,
      weakSession: {}, seq: seq, posIdx: 0, total: seq.length,
      ephemeral: true, baseMode: base
    };
    $('#pracTitle').textContent = t('weak.pracTitle');
    var stog = $('#soundToggle'); if (stog) { stog.classList.remove('hidden'); updateSoundToggle(); }
    $('#pracMeta').classList.add('hidden');
    $('#fwBox').classList.add('hidden');
    $('#targetBox').classList.remove('hidden');
    $('#nextKey').classList.remove('hidden');
    $('.kbd-wrap').classList.remove('hidden');
    $('#view-practice').classList.remove('is-long');
    $('#pracDone').classList.add('hidden');
    show('practice');
    render(); updateStats();
  }

  // ===== 저장 =====
  // A1: typing_best_v1 값은 {speed,acc,date} 객체. 옛 스키마(숫자)는 읽을 때 {speed:그값}으로 간주(하위호환).
  function bestStore() { try { return JSON.parse(localStorage.getItem('typing_best_v1') || '{}'); } catch (e) { return {}; } }
  function bestRec(mode, idx) {
    var v = bestStore()[mode + ':' + idx];
    if (v == null) return null;
    if (typeof v === 'number') return { speed: v, acc: null, date: null }; // 옛 숫자값 하위호환
    return v;
  }
  function getBest(mode, idx) { var r = bestRec(mode, idx); return r ? Math.min(9999, r.speed || 0) : 0; }
  function getBestRec(mode, idx) { return bestRec(mode, idx); }
  function setBest(mode, idx, speed, acc) {
    var s = bestStore();
    s[mode + ':' + idx] = { speed: speed, acc: acc, date: new Date().toISOString() };
    try { localStorage.setItem('typing_best_v1', JSON.stringify(s)); } catch (e) {}
  }

  // A2: 세션 로그 — 판 완료마다 append, 최대 300 FIFO
  function logStore() { try { return JSON.parse(localStorage.getItem('typing_log_v1') || '[]'); } catch (e) { return []; } }
  function pushLog(entry) {
    var arr = logStore();
    arr.push(entry);
    if (arr.length > 300) arr = arr.slice(arr.length - 300);
    try { localStorage.setItem('typing_log_v1', JSON.stringify(arr)); } catch (e) {}
  }
  // 같은 mode의 직전 기록(방금 넣은 것 제외한 마지막) 반환
  function lastLogForMode(mode) {
    var arr = logStore();
    for (var i = arr.length - 1; i >= 0; i--) { if (arr[i].m === mode) return arr[i]; }
    return null;
  }
  // 이번 주(최근 7일) 요약: {games, avgSpeed, avgAcc}
  function weekSummary() {
    var arr = logStore(), now = Date.now(), wk = 7 * 24 * 3600 * 1000;
    var g = 0, sp = 0, ac = 0, acN = 0;
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i], td = Date.parse(e.d || '');
      if (isNaN(td) || (now - td) > wk) continue;
      g++; sp += (e.s || 0);
      if (e.a != null) { ac += e.a; acN++; }
    }
    if (!g) return null;
    return { games: g, avgSpeed: Math.round(sp / g), avgAcc: acN ? Math.round(ac / acN) : null };
  }

  // A3: 약한 키(오타 시 정답이었어야 할 자모별 누적) {jamo:count}
  function weakStore() { try { return JSON.parse(localStorage.getItem('typing_weakkeys_v1') || '{}'); } catch (e) { return {}; } }
  function addWeak(jamo) {
    if (!jamo) return;
    var s = weakStore(); s[jamo] = (s[jamo] || 0) + 1;
    try { localStorage.setItem('typing_weakkeys_v1', JSON.stringify(s)); } catch (e) {}
  }
  // 상위 N개 약한 자모 [{jamo,count}]
  function topWeak(n) {
    var s = weakStore(), arr = [];
    for (var k in s) if (s.hasOwnProperty(k)) arr.push({ jamo: k, count: s[k] });
    arr.sort(function (a, b) { return b.count - a.count; });
    return arr.slice(0, n || 5);
  }
  // 이번 판에서 틀린 자모(세션 한정) — 완료 카드 표시용
  function sessionWeak(n) {
    if (!state || !state.weakSession) return [];
    var s = state.weakSession, arr = [];
    for (var k in s) if (s.hasOwnProperty(k)) arr.push({ jamo: k, count: s[k] });
    arr.sort(function (a, b) { return b.count - a.count; });
    return arr.slice(0, n || 5);
  }

  // ===== 유틸 =====
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // 인라인 SVG 아이콘 세트(단색 stroke) — 이모지 대체
  var ICONS = {
    star: '<path d="M12 3.5l2.5 5.3 5.8.8-4.2 4 1 5.7L12 16.6 6.9 19.3l1-5.7-4.2-4 5.8-.8Z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16 8.5a5 5 0 0 1 0 7"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16 9.5l4 5M20 9.5l-4 5"/>'
  };
  function iconSvg(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  // ===== 언어 =====
  function setLang(l) {
    if (!LANG_NAME[l]) return;
    lang = l;
    localStorage.setItem('typing_lang', l);
    try { localStorage.setItem('nq_lang', JSON.stringify(l)); } catch (e) {} // 귀화앱과 동기화
    applyI18n();
    if (!$('#view-list').classList.contains('hidden')) goList(state.baseMode || state.mode);
    else if (!$('#view-practice').classList.contains('hidden')) {
      if (state.kind === 'free') startFreewrite(state.idx);
      else if (state.ephemeral) { /* 보충 드릴은 언어 바꿔도 그대로 두기 위해 라벨만 갱신 */ $('#pracTitle').textContent = t('weak.pracTitle'); }
      else startPractice(state.mode, state.idx);
    }
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    var lbn = $('#langBtnName'); if (lbn) lbn.textContent = LANG_NAME[lang];
    updateSoundToggle();
    // 홈이 보이는 상태면 배지·요약도 갱신
    if ($('#view-home') && !$('#view-home').classList.contains('hidden')) renderHome();
  }

  // 언어 선택 picker (귀화앱 방식)
  function buildPicker() {
    var box = $('#langOpts'); box.innerHTML = '';
    LANG_ORDER.forEach(function (l) {
      var b = document.createElement('button');
      b.className = 'lang-opt' + (l === lang ? ' is-active' : '');
      b.type = 'button';
      b.innerHTML = '<span class="lang-opt__flag">' + LANG_FLAG[l] + '</span><span class="lang-opt__name">' + esc(LANG_NAME[l]) + '</span>';
      b.addEventListener('click', function () { closePicker(); setLang(l); });
      box.appendChild(b);
    });
  }
  function openPicker() { buildPicker(); $('#langPicker').classList.remove('hidden'); }
  function closePicker() { $('#langPicker').classList.add('hidden'); }

  // ===== A4: 첫 실행 온보딩(1장) =====
  function onboardSeen() { try { return localStorage.getItem('typing_onboard_v1') === '1'; } catch (e) { return false; } }
  function markOnboardSeen() { try { localStorage.setItem('typing_onboard_v1', '1'); } catch (e) {} }
  function renderOnboardCard() {
    var c = $('#onboardCard');
    c.innerHTML =
      '<div class="onboard__eyebrow">' + esc(t('ob.eyebrow')) + '</div>' +
      '<h2 class="onboard__title">' + esc(t('ob.title')) + '</h2>' +
      '<div class="onboard__step"><span class="onboard__num">1</span><div class="onboard__txt">' + t('ob.s1') + '</div></div>' +
      '<div class="onboard__step"><span class="onboard__num">2</span><div class="onboard__txt">' +
      esc(t('ob.s2')) + '“가”' + esc(t('ob.s2b')) + '“ㄱ, ㅏ”' + esc(t('ob.s2c')) +
      '<br><span class="onboard__demo">가 <span class="eq">=</span> ㄱ <span class="plus">+</span> ㅏ</span>' +
      '</div></div>' +
      '<div class="onboard__step"><span class="onboard__num">3</span><div class="onboard__txt">' + t('ob.s3') + '</div></div>' +
      '<button class="btn btn--primary onboard__btn" id="onboardStart">' + esc(t('ob.start')) + '</button>';
    $('#onboardStart').addEventListener('click', function () {
      markOnboardSeen();
      $('#onboard').classList.add('hidden');
    });
  }
  function maybeShowOnboarding() {
    if (onboardSeen()) return;
    renderOnboardCard();
    $('#onboard').classList.remove('hidden');
  }

  // ===== 딥링크 (#모드/번호) =====
  async function routeFromHash() {
    var m = (location.hash || '').replace(/^#/, '').split('/');
    var mode = m[0], idx = parseInt(m[1], 10);
    if (MODES[mode]) {
      await requireMembership(function () {
        if (idx >= 0 && idx < MODES[mode].items.length) startPractice(mode, idx);
      });
      return true;
    }
    return false;
  }

  // ===== 이벤트 =====
  function bind() {
    $('#homeBtn').addEventListener('click', goHome);
    $('#langBtn').addEventListener('click', openPicker);
    $('#langPicker').addEventListener('click', function (e) { if (e.target === this) closePicker(); });
    $$('.mode-card').forEach(function (c) {
      c.addEventListener('click', function () {
        var mode = c.dataset.mode;
        requireMembership(function () { goList(mode); });
      });
    });
    $$('[data-go]').forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.go === 'home') goHome(); }); });
    $('#pracBack').addEventListener('click', function () { stopTimer(); goList(state.baseMode || state.mode); });
    var stog = $('#soundToggle'); if (stog) stog.addEventListener('click', toggleSound);
    var fwb = $('#fwDone'); if (fwb) fwb.addEventListener('click', function () { if (state && state.kind === 'free' && !state.finished) finishFreewrite(null); });
  }

  // ===== 초기화 =====
  function init() {
    buildKeyboard();
    applyI18n();
    bindMemberUi();
    bind();
    renderHome();
    show('home');
    if (window.GwiwhaMembership) window.GwiwhaMembership.init().then(function () {});
    var routed = location.hash ? routeFromHash() : false;
    if (!routed) maybeShowOnboarding(); // 딥링크 진입 시엔 온보딩 생략
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
