/* =====================================================================
   귀화시험 종합평가 연습 앱  (순수 정적 PWA · 한국어/중국어 지원)
   - 공개 화면: question-catalog.json 으로 영역과 문항 수만 표시
   - 회원 콘텐츠: Supabase Auth + members RLS + questions RLS 로 읽기
   - 언어: 한국어(ko) / 중국어(zh). zh 모드에서는 한국어 + 중국어를 함께 표시
   ===================================================================== */

'use strict';

/* ---------- 저장소 키 ---------- */
const K = {
  bank: 'nq_bank', meta: 'nq_meta', wrong: 'nq_wrong',
  stats: 'nq_stats', history: 'nq_history', drafts: 'nq_drafts', lang: 'nq_lang',
  mockSave: 'nq_mocksave', practiceSave: 'nq_practicesave', exam: 'nq_exam',
  examdate: 'nq_examdate', catalog: 'nq_catalog',
};

/* ---------- 공개 폴백(민감한 문제 본문은 넣지 않는다) ---------- */
const FALLBACK = {
  version: 'catalog-fallback',
  questions: [],
};

/* ---------- 다국어 사전 ---------- */
let LANG = 'ko';
/* 언어별 카테고리명(ko=원문, 나머지는 주석 언어). vi/th는 빌드 외부 데이터로 주입 */
const CAT_TR = {
  zh: {
    '한국어': '韩国语', '사회': '社会', '문화': '文化', '정치': '政治', '경제': '经济', '교육': '教育', '법': '法律', '역사': '历史', '지리': '地理', '작문': '写作', '구술': '口试',
    '어휘': '词汇', '문법': '语法', '읽기·이해': '阅读理解', '대화': '对话', '한국문화': '韩国文化', '한국사회': '韩国社会',
  },
  vi: {}, th: {},
};
/* EXAMS·PRE_LEVELS의 {ko,zh} 객체에 vi/th가 없을 때 쓰는 한국어→번역 보조사전 */
const T2 = { vi: {}, th: {} };
/* 상단바 언어 버튼에 표시할 현재 언어 표식, 글자수 단위 */
const LANG_LABEL = { ko: '🇰🇷', zh: '🇨🇳', vi: '🇻🇳', th: '🇹🇭' };
const CHAR_UNIT = { ko: '자', zh: '字', vi: ' ký tự', th: ' ตัวอักษร' };
const I18N = {
  ko: {
    'app.title': '귀화시험 연습', 'app.sync': '동기화', 'lang.select': 'Select Language',
    'home.mock.t': '모의고사 보기', 'home.mock.s': '실제 시험처럼 풀기',
    'home.practice.t': '영역별 연습', 'home.practice.s': '9개 영역별로 풀기',
    'home.writing.t': '작문·구술 연습', 'home.writing.s': '주제별 말하기·쓰기',
    'home.typing.t': '타자 연습', 'home.typing.s': '작문 모범답안 따라 치기',
    'home.wrong.t': '오답 노트', 'home.stats.t': '학습 통계', 'home.stats.s': '정답률·기록 보기',
    'practice.title': '영역별 연습', 'practice.desc': '한 문제씩 풀고 바로 정답·해설을 확인합니다.', 'practice.all': '전체 무작위',
    'exam.org': '사회통합프로그램 (KIIP)', 'exam.title': '귀화용 종합평가', 'exam.subtitle': '필기시험 모의고사',
    'exam.name': '성 명', 'exam.namePh': '이름 입력', 'exam.no': '수험번호', 'exam.noticeTitle': '유의사항',
    'exam.n1': '귀화용 종합평가는 <b>객관식 36문항(65점) + 작문형(10점) + 구술(25점) = 100점</b>, <b>60점 이상이면 합격</b>입니다.',
    'exam.n2': '이 모의고사는 <b>필기(객관식+작문)를 60분 안에</b> 풀고, 이어서 <b>구술 문항</b>까지 연습합니다.',
    'exam.n3': '객관식은 ①②③④ 중 하나를 고르고, 작문은 <b>200자 이내</b>로 작성합니다.',
    'exam.n4': '객관식만 자동 채점되며, 작문·구술은 모범답안·도움말로 스스로 점검합니다.',
    'exam.n5': '실제 시험의 구술은 별도 10분 세션입니다. 사회통합프로그램 5단계 수료 + 합격 시 <b>귀화 면접심사 면제</b>가 가능합니다.',
    'common.cancel': '취소', 'common.home': '홈으로', 'exam.start': '시험 시작',
    'quiz.prev': '← 이전', 'quiz.next': '다음 →', 'quiz.result': '결과 보기', 'quiz.submit': '제출하고 채점',
    'writing.title': '작문·구술 연습', 'seg.writing': '작문', 'seg.oral': '구술',
    'result.title': '채점 결과', 'result.unit': '점', 'result.reviewHead': '문제 다시보기', 'result.retryWrong': '틀린 문제만 다시 풀기',
    'wrong.title': '오답 노트', 'wrong.desc': '틀렸던 문제가 모입니다. 맞히면 목록에서 사라집니다.', 'wrong.start': '오답 문제 풀기', 'wrong.clear': '오답노트 비우기',
    'stats.title': '학습 통계', 'stats.recentHead': '최근 모의고사 기록', 'stats.reset': '통계 초기화', 'writeCount.suffix': ' / 200자',
    'sync.ready': '준비 완료 · 총 {0}문항 (객관식 {1})', 'sync.never': '동기화를 누르면 최신 문제를 받아옵니다.',
    'sync.offline': '오프라인 · 마지막 동기화한 {0}문항으로 진행', 'sync.first': '아직 문제를 받지 못했습니다. 인터넷 연결 후 동기화를 눌러주세요.',
    'sync.synced': '최신 문제로 동기화됨 · 총 {0}문항',
    'toast.syncing': '최신 문제를 받는 중…', 'toast.syncDone': '동기화 완료! 총 {0}문항', 'toast.offline': '인터넷 연결을 확인하세요. 저장된 문제로 계속할 수 있어요.', 'toast.syncFail': '문제를 받지 못했습니다.',
    'bankInfo': '문제집 버전: {0} · 객관식 {1}문항 · 마지막 동기화: {2}', 'noSync': '없음',
    'credit.html': '<span class="cred-mission">사회통합프로그램 종합평가·사전평가 연습</span><span class="cred-links">법무부·한국이민재단의 공식 시험이 아니며, 개인이 만든 연습용 자료입니다.</span>',
    'wrongCount': '틀린 문제 {0}개', 'cat.count': '{0}문항',
    'banner.mc': '【객관식】  {0} / {1}', 'banner.writing': '【작문형】  {0} / {1}  ·  200자 이내', 'banner.oral': '【구술】  {0} / {1}  ·  소리 내어 말하기',
    'fb.correct': '정답입니다! ✅', 'fb.wrong': '오답입니다 ❌  정답: {0}',
    'write.phWrite': '여기에 답안을 작성하세요 (200자 이내)', 'write.phOral': '소리 내어 답해 보세요. (핵심을 메모해 두어도 됩니다 · 선택)',
    'result.frac': '객관식 {0}문항 중 {1}문항 정답', 'result.fracMore': ' · 작문·구술은 아래에서 직접 확인',
    'sg.head': '작문·구술 자가채점', 'sg.note': '작문·구술은 자유 서술이라 자동 채점이 어렵습니다. 모범답안과 비교해 직접 점수를 매기면 합계에 반영됩니다.', 'sg.prompt': '↓ 작문·구술을 직접 채점하면 점수에 반영됩니다', 'sg.good': '잘 씀', 'sg.mid': '보통', 'sg.poor': '부족', 'sg.ungraded': '미채점', 'bd.mc': '객관식', 'bd.writing': '작문', 'bd.oral': '구술', 'bd.total': '합계',
    'result.pass': '합격선(60점) 통과 🎉', 'result.fail': '합격선(60점)까지 조금 더!', 'result.practice': '연습 모드 결과입니다.',
    'result.estLevel': '예상 배정 단계: {0}',
    'result.levelDisclaimer': '※ 이 점수는 실제 배정 점수가 아니라 <b>연습용 예상치</b>입니다. 실제 사전평가는 <b>필기 75점(객관식 48문항 72점 + 작문 2문항 3점) + 구술 25점 = 100점</b>이며, 객관식과 작문은 여기서 자동 채점되지만 <b>구술은 직접 매겨야</b> 총점이 나옵니다. 또한 <b>구술이 3점 미만이면 0단계</b>로 배정됩니다. 정확한 단계는 시험 당일 점수로 정해집니다.',
    'result.paperScore': '필기(객관식+작문)',
    'result.paperOf': '{0} / {1}점',
    'result.wAuto': '작문 자동채점 반영',
    'sg.noteAuto': '작문은 답안 내용을 자동 채점했습니다. 구술은 자유 발화라 모범답안과 비교해 직접 매겨 주세요. 자동 점수가 마음에 들지 않으면 버튼으로 덮어쓸 수 있습니다.',
    'sg.headOverride': '직접 다시 매기기',
    'bd.autoTag': '자동',
    'auto.ok': '정답입니다 ✅',
    'auto.no': '오답입니다 ❌',
    'auto.empty': '작성한 답안이 없습니다 ❌',
    'result.oralFloor': '구술 3점 미만',
    'auto.task': '과제 수행 (①②③④ 각 2.5점)',
    'auto.checkHead': '점검 항목 (점수에 넣지 않음)',
    'auto.len': '분량',
    'auto.style': '문체',
    'auto.title': '제목',
    'auto.flow': '문장 연결',
    'auto.w.over': '200칸을 넘습니다',
    'auto.w.short': '조금 짧습니다',
    'auto.w.mixed': '문체가 섞였습니다',
    'auto.w.titled': '제목은 쓰지 않습니다',
    'auto.capped': '분량이 모자라 점수에 상한을 두었습니다. 네 갈래를 다 다루기에는 글이 너무 짧습니다.',
    'auto.noteNat': '※ 공식 배점은 <b>작문형 10점 = 4문항 × 2.5점</b>(법무부·한국이민재단 공개)이고, 그 안의 세부 채점 기준은 <b>법령상 비공개</b>입니다. 여기 점수는 네 갈래를 <b>다뤘는지만</b> 본 학습용 근사치이며, <b>어휘·문법의 정확성과 내용의 깊이는 채점하지 않았습니다</b>. 실제 시험은 감독관이 직접 읽고 채점합니다.',
    'auto.notePre': '※ 실제 사전평가의 단답형 주관식은 1문항 1.5점이며, 부분점수가 있는지는 공개되어 있지 않습니다. △는 연습용 표시입니다.',
    'auto.mid': '문법은 맞지만 표현이 아쉽습니다 △',
    'auto.w.choppy': '문장이 너무 적습니다',
    'auto.overNote': '200칸을 넘겼습니다. 실제 시험지는 200칸 원고지 1장뿐이라 넘긴 부분은 쓸 자리가 없습니다. 여기서도 앞 200칸까지만 채점했습니다.',
    'style.formal': '습니다체',
    'style.polite': '해요체',
    'style.plain': '문어체',
    'style.casual': '반말',
    'auto.w.banmal': '반말은 시험 답안에 쓰지 않습니다',
    'count.sent': '{0}문장',
    'track.nat': '귀화 종합평가', 'track.perm': '영주 종합평가', 'track.pre': '사회통합 사전평가',
    'review.unanswered': '선택 안 함', 'review.emptyWrite': '작성한 답안이 없습니다.', 'review.emptyOral': '메모한 내용이 없습니다.',
    'stats.total': '총 푼 문제', 'stats.acc': '전체 정답률', 'stats.noHistory': '아직 모의고사 기록이 없습니다.',
    'wrong.empty': '틀린 문제가 없습니다. 잘하고 있어요! 👏', 'writing.empty': '해당 유형의 문제가 없습니다.',
    'guide.show': '💡 도움말 보기', 'guide.hide': '💡 도움말 숨기기', 'writing.draftPh': '여기에 답을 작성해 보세요 (200자 이내)',
    'model.show': '📝 모범답안 보기', 'model.hide': '📝 모범답안 숨기기', 'review.model': '모범답안',
    'resume.banner': '📌 진행 중인 모의고사 이어서 풀기 ({0}/{1})', 'exam.resume': '이어서 풀기 ({0}/{1})',
    'confirm.discardMock': '진행 중인 모의고사 기록이 사라집니다. 새로 시작할까요?', 'toast.resumed': '이어서 풉니다.',
    'resume.practice': '📌 이어서 풀기 · {0} ({1}/{2})', 'practice.allLabel': '전체',
    'confirm.submit': '제출하고 채점할까요?', 'confirm.clearWrong': '오답노트를 모두 비울까요?', 'confirm.resetStats': '학습 통계와 기록을 모두 초기화할까요?',
    'toast.clearedWrong': '오답노트를 비웠습니다.', 'toast.resetStats': '초기화했습니다.', 'toast.noQ': '풀 수 있는 문제가 없습니다. 동기화를 먼저 해주세요.', 'toast.timeUp': '시간 종료! 자동 채점합니다.',
    'count.char': '{0}자',
    /* A2 오답노트 숙련 원장 */
    'wrong.desc2': '틀린 문제가 모입니다. <b>두 번 연속</b> 맞히면 목록에서 졸업합니다.',
    'wrong.miss': '{0}회 틀림', 'wrong.almost': '한 번 더 맞히면 졸업',
    /* F: 오답노트 — 답 가리고 다시 풀기 + 문항별 삭제 */
    'wrong.desc3': '틀린 문제가 모입니다. 답은 가려져 있고, 보기를 고르면 그 자리에서 채점합니다. <b>두 번 연속</b> 맞히면 목록에서 졸업합니다.',
    'wrong.del': '삭제', 'wrong.confirmDel': '이 문제를 오답노트에서 지울까요?', 'wrong.deleted': '오답노트에서 지웠습니다.',
    'wrong.grad': '졸업! 이 문제는 목록에서 빠집니다. 🎓', 'wrong.retry': '다시 풀기',
    /* G: 듣고 말하기 */
    'listen.head': '🎧 듣고 말하기', 'listen.play': '▶ 듣기', 'listen.replay': '↻ 다시 듣기', 'listen.stop': '■ 멈춤',
    'listen.script': '대본 보기', 'listen.scriptHide': '대본 숨기기',
    'listen.hint': '먼저 소리만 듣고 답해 보세요. 대본은 답한 뒤에 확인하는 것이 좋습니다.',
    'listen.no': '이 브라우저는 음성 재생을 지원하지 않습니다. 대본을 보고 연습하세요.',
    /* A3 시험일 카운트다운 */
    'examdate.title': '시험일 설정', 'examdate.set': '설정', 'examdate.clear': '지우기',
    'examdate.dday': 'D-{0}', 'examdate.today': 'D-DAY',
    'examdate.pace': '하루 권장: 문항 {0}개', 'examdate.left': '남은 문항 {0}개',
    'examdate.past': '시험일이 지났습니다. 새 시험일을 설정하세요',
    'examdate.hint': '시험 날짜를 정하면 하루 권장 학습량을 알려드립니다.',
    /* A4 결과 점수 분리 */
    'result.mcScore': '객관식', 'result.mcOf': '{0} / 65점',
    'result.estTotal': '자가채점 포함 추정 총점', 'result.estOf': '{0} / 100',
    'result.ungradedN': '미채점 {0}개 · 채점하면 총점이 나옵니다',
    'result.mcOnly': '객관식만으로 {0} / 65',
    /* A5 통계 → 연습 */
    'stats.practiceCat': '이 영역만 연습', 'practice.weak': '약점 우선', 'practice.weakSub': '틀린 영역을 더 자주',
    /* A6 구술 가리고 말하기 */
    'oral.recite': '모범답안을 가린 채로 소리 내어 답해 보세요.',
    'oral.reveal': '모범답안 보기', 'oral.hideModel': '모범답안 숨기기',
    'oral.selfHead': '스스로 평가', 'oral.good': '잘함', 'oral.mid': '보통', 'oral.poor': '부족',
    'oral.saved': '기록했습니다.',
    /* E: 원고지 작성법 가이드(종합평가 작문 전용) */
    'wongoji.title': '원고지 작성법 (실제 시험은 원고지에 씁니다)',
    'wongoji.body': '<ul><li>① 한글은 한 칸에 한 글자씩 쓴다.</li><li>② 두 자리 이상 숫자와 알파벳 소문자는 한 칸에 2자씩, 한 자리 숫자·대문자는 한 칸에 1자.</li><li>③ 글 첫머리와 새 문단은 첫 칸을 비우고 둘째 칸부터 쓴다.</li><li>④ 둘째 줄부터는 띄어쓰기와 관계없이 줄 맨 앞 칸부터 채워 쓴다.</li><li>⑤ 쉼표(,)·마침표(.) 뒤는 칸을 비우지 않고, 물음표(?)·느낌표(!) 뒤는 한 칸 비운다.</li><li>⑥ 문장부호는 줄 첫 칸에 쓰지 않고 앞 줄 끝 칸에 함께 쓴다.</li><li>⑦ \'수 있다/없다\', \'것 같다\', 한글 수와 단위 명사(\'세 명\') 등은 띄어 쓴다.</li></ul>',
  },
  zh: {
    'app.title': '归化考试练习', 'app.sync': '同步',
    'home.mock.t': '模拟考试', 'home.mock.s': '像真实考试一样作答',
    'home.practice.t': '分领域练习', 'home.practice.s': '按9个领域练习',
    'home.writing.t': '写作·口试练习', 'home.writing.s': '按主题说·写',
    'home.typing.t': '打字练习', 'home.typing.s': '跟着打作文范文',
    'home.wrong.t': '错题本', 'home.stats.t': '学习统计', 'home.stats.s': '查看正确率·记录',
    'practice.title': '分领域练习', 'practice.desc': '逐题作答，立即查看答案与解析。', 'practice.all': '全部随机',
    'exam.org': '社会统合项目 (KIIP)', 'exam.title': '归化用综合评价', 'exam.subtitle': '笔试模拟考试',
    'exam.name': '姓 名', 'exam.namePh': '输入姓名', 'exam.no': '准考证号', 'exam.noticeTitle': '注意事项',
    'exam.n1': '归化用综合评价为 <b>选择题36题(65分) + 写作(10分) + 口试(25分) = 100分</b>，<b>60分以上合格</b>。',
    'exam.n2': '本模拟考试 <b>笔试(选择题+写作)在60分钟内</b>完成，随后继续练习<b>口试题</b>。',
    'exam.n3': '选择题从①②③④中选一个，写作在<b>200字以内</b>完成。',
    'exam.n4': '仅选择题自动评分；写作·口试以参考答案·提示自我检查。',
    'exam.n5': '真实考试的口试为单独的10分钟环节。修完社会统合项目第5阶段并合格时，<b>可免除归化面试</b>。',
    'common.cancel': '取消', 'common.home': '返回主页', 'exam.start': '开始考试',
    'quiz.prev': '← 上一题', 'quiz.next': '下一题 →', 'quiz.result': '查看结果', 'quiz.submit': '提交并评分',
    'writing.title': '写作·口试练习', 'seg.writing': '写作', 'seg.oral': '口试',
    'result.title': '评分结果', 'result.unit': '分', 'result.reviewHead': '重新查看题目', 'result.retryWrong': '只重做错题',
    'wrong.title': '错题本', 'wrong.desc': '答错的题会汇集在这里，答对后将从列表中消失。', 'wrong.start': '做错题', 'wrong.clear': '清空错题本',
    'stats.title': '学习统计', 'stats.recentHead': '最近的模拟考试记录', 'stats.reset': '重置统计', 'writeCount.suffix': ' / 200字',
    'sync.ready': '准备完成 · 共{0}题 (选择题{1})', 'sync.never': '点击同步即可获取最新题目。',
    'sync.offline': '离线 — 使用上次同步的{0}题继续', 'sync.first': '尚未获取题目。请联网后点击同步。',
    'sync.synced': '已同步到最新题目 · 共{0}题',
    'toast.syncing': '正在获取最新题目…', 'toast.syncDone': '同步完成！共{0}题', 'toast.offline': '请检查网络连接。可使用已保存的题目继续。', 'toast.syncFail': '未能获取题目。',
    'bankInfo': '题库版本：{0} · 选择题{1}题 · 上次同步：{2}', 'noSync': '无',
    'credit.html': '<span class="cred-mission">社会统合项目 综合评价·事前评价 练习</span><span class="cred-links">非法务部·韩国移民财团的官方考试，为个人制作的练习资料。</span>',
    'wrongCount': '错题 {0} 道', 'cat.count': '{0}题',
    'banner.mc': '【选择题】  {0} / {1}', 'banner.writing': '【写作】  {0} / {1}  ·  200字以内', 'banner.oral': '【口试】  {0} / {1}  ·  请朗读作答',
    'fb.correct': '回答正确！✅', 'fb.wrong': '回答错误 ❌  正确答案：{0}',
    'write.phWrite': '请在此作答（200字以内）', 'write.phOral': '请朗读作答。（也可记下要点 — 可选）',
    'result.frac': '选择题{0}题中答对{1}题', 'result.fracMore': ' · 写作·口试请在下方自行确认',
    'sg.head': '写作·口试 自评', 'sg.note': '写作·口试是自由作答，难以自动评分。对照范文自己打分后会计入总分。', 'sg.prompt': '↓ 自评写作·口试后会计入分数', 'sg.good': '写得好', 'sg.mid': '一般', 'sg.poor': '不足', 'sg.ungraded': '未评分', 'bd.mc': '选择题', 'bd.writing': '写作', 'bd.oral': '口试', 'bd.total': '合计',
    'result.pass': '已达合格线（60分）🎉', 'result.fail': '距合格线（60分）还差一点！', 'result.practice': '这是练习模式的结果。',
    'result.estLevel': '预计分配阶段：{0}',
    'result.levelDisclaimer': '※ 此分数不是实际分配分数，而是 <b>练习用预估值</b>。实际事前评价为 <b>笔试75分（选择题48题72分 + 写作2题3分）+ 口试25分 = 100分</b>；选择题和写作在这里自动评分，但 <b>口试需要你自己打分</b>才能得出总分。另外 <b>口试不足3分则分配到0阶段</b>。准确阶段以考试当天分数为准。',
    'result.paperScore': '笔试(选择题+写作)',
    'result.paperOf': '{0} / {1}分',
    'result.wAuto': '已计入写作自动评分',
    'sg.noteAuto': '写作已按答案内容自动评分。口试是自由发挥，请对照参考答案自己打分。对自动分数不满意时，可以用按钮覆盖。',
    'sg.headOverride': '自己重新打分',
    'bd.autoTag': '自动',
    'auto.ok': '答对了 ✅',
    'auto.no': '答错了 ❌',
    'auto.empty': '没有作答 ❌',
    'result.oralFloor': '口试不足3分',
    'auto.task': '任务完成度 (①②③④ 各2.5分)',
    'auto.checkHead': '检查项 (不计入分数)',
    'auto.len': '篇幅',
    'auto.style': '文体',
    'auto.title': '标题',
    'auto.flow': '句子衔接',
    'auto.w.over': '超过200格',
    'auto.w.short': '略短',
    'auto.w.mixed': '文体混用',
    'auto.w.titled': '不要写标题',
    'auto.capped': '篇幅不足，分数已设上限。这么短的篇幅不可能把四个小点都写到。',
    'auto.noteNat': '※ 官方分值为 <b>写作10分 = 4题 × 2.5分</b>（法务部·韩国移民财团公开），其内部的细则评分标准 <b>依法不公开</b>。这里的分数只看四个小点 <b>有没有写到</b>，是练习用的近似值，<b>没有评判用词语法的准确性和内容的深度</b>。真实考试由监考官阅卷评分。',
    'auto.notePre': '※ 真实事前评价的简答主观题为每题1.5分，是否有部分分数并未公开。△ 是练习用的标记。',
    'auto.mid': '语法对了，但表达欠妥 △',
    'auto.w.choppy': '句子太少',
    'auto.overNote': '超过了200格。真实考试只有一张200格稿纸，超出部分没有地方可写。这里也只评了前200格。',
    'style.formal': '습니다体',
    'style.polite': '해요体',
    'style.plain': '书面体',
    'style.casual': '半语',
    'auto.w.banmal': '考试答案不用半语',
    'count.sent': '{0}句',
    'track.nat': '归化综合评价', 'track.perm': '永居综合评价', 'track.pre': '社会统合事前评价',
    'review.unanswered': '未作答', 'review.emptyWrite': '没有作答内容。', 'review.emptyOral': '没有记录内容。',
    'stats.total': '已做题数', 'stats.acc': '总正确率', 'stats.noHistory': '还没有模拟考试记录。',
    'wrong.empty': '没有错题，做得很好！👏', 'writing.empty': '没有该类型的题目。',
    'guide.show': '💡 查看提示', 'guide.hide': '💡 隐藏提示', 'writing.draftPh': '请在此作答（200字以内）',
    'model.show': '📝 查看范文', 'model.hide': '📝 隐藏范文', 'review.model': '范文',
    'resume.banner': '📌 继续上次的模拟考试 ({0}/{1})', 'exam.resume': '继续作答 ({0}/{1})',
    'confirm.discardMock': '正在进行的模拟考试记录将被删除。要重新开始吗？', 'toast.resumed': '继续作答。',
    'resume.practice': '📌 继续上次练习 — {0} ({1}/{2})', 'practice.allLabel': '全部',
    'confirm.submit': '要提交并评分吗？', 'confirm.clearWrong': '要清空错题本吗？', 'confirm.resetStats': '要重置所有学习统计和记录吗？',
    'toast.clearedWrong': '已清空错题本。', 'toast.resetStats': '已重置。', 'toast.noQ': '没有可作答的题目。请先同步。', 'toast.timeUp': '时间到！自动评分。',
    'count.char': '{0}字',
    /* A2 错题熟练度台账 */
    'wrong.desc2': '答错的题会汇集在这里。<b>连续两次</b>答对就从列表毕业。',
    'wrong.miss': '错{0}次', 'wrong.almost': '再答对一次就毕业',
    'wrong.desc3': '答错的题会汇集在这里。答案已隐藏，选择选项后当场评分。<b>连续两次</b>答对就从列表毕业。',
    'wrong.del': '删除', 'wrong.confirmDel': '要把这道题从错题本中删除吗？', 'wrong.deleted': '已从错题本删除。',
    'wrong.grad': '毕业！这道题将从列表中移除。🎓', 'wrong.retry': '再做一次',
    'listen.head': '🎧 听后说', 'listen.play': '▶ 播放', 'listen.replay': '↻ 再听一次', 'listen.stop': '■ 停止',
    'listen.script': '查看文本', 'listen.scriptHide': '隐藏文本',
    'listen.hint': '请先只听声音作答。文本最好在回答之后再确认。',
    'listen.no': '此浏览器不支持语音播放。请看文本进行练习。',
    /* A3 考试日倒计时 */
    'examdate.title': '设置考试日', 'examdate.set': '设置', 'examdate.clear': '清除',
    'examdate.dday': '倒数{0}天', 'examdate.today': '就是今天',
    'examdate.pace': '每天建议：{0}题', 'examdate.left': '剩余{0}题',
    'examdate.past': '考试日已过 — 请设置新的考试日',
    'examdate.hint': '设定考试日期后，会告诉你每天建议做多少题。',
    /* A4 成绩分开显示 */
    'result.mcScore': '选择题', 'result.mcOf': '{0} / 65分',
    'result.estTotal': '含自评的预估总分', 'result.estOf': '{0} / 100',
    'result.ungradedN': '还有{0}题未评分 — 评分后才能算出总分',
    'result.mcOnly': '仅选择题 {0} / 65',
    /* A5 统计 → 练习 */
    'stats.practiceCat': '只练这个领域', 'practice.weak': '弱项优先', 'practice.weakSub': '答错多的领域出得更频繁',
    /* A6 口试遮住作答 */
    'oral.recite': '请遮住范文，先出声作答一遍。',
    'oral.reveal': '查看范文', 'oral.hideModel': '隐藏范文',
    'oral.selfHead': '自我评价', 'oral.good': '答得好', 'oral.mid': '一般', 'oral.poor': '不足',
    'oral.saved': '已记录。',
    /* E: 答题纸书写规则（综合评价写作专用） */
    'wongoji.title': '答题纸书写规则（正式考试须书写在答题纸上）',
    'wongoji.body': '<ul><li>① 韩文每格写一个字。</li><li>② 两位数以上的数字和小写字母每格写2个字符，个位数数字和大写字母每格写1个字符。</li><li>③ 文章开头和新段落要空出第一格，从第二格开始写。</li><li>④ 从第二行开始，无论是否需要空格，都从行首格开始填满书写。</li><li>⑤ 逗号(,)和句号(.)后不空格，问号(?)和感叹号(!)后空一格。</li><li>⑥ 标点符号不写在行首格，而是与上一行末格一起书写。</li><li>⑦ “수 있다/없다”（能/不能）、“것 같다”（好像）、韩文数词与量词（如“세 명”）等要分开书写（空格）。</li></ul>',
  },
};
/* === vi/th UI 번역 주입(빌드 외부 데이터) === */
I18N.vi = {"app.title": "Luyện thi nhập tịch", "app.sync": "Đồng bộ", "home.mock.t": "Thi thử", "home.mock.s": "Làm bài như thi thật", "home.practice.t": "Luyện theo lĩnh vực", "home.practice.s": "Luyện theo 9 lĩnh vực", "home.writing.t": "Luyện viết · vấn đáp", "home.writing.s": "Nói · viết theo chủ đề", "home.typing.t": "Luyện gõ phím", "home.typing.s": "Gõ theo bài văn mẫu", "home.wrong.t": "Sổ câu sai", "home.stats.t": "Thống kê học tập", "home.stats.s": "Xem tỷ lệ đúng · lịch sử", "practice.title": "Luyện theo lĩnh vực", "practice.desc": "Làm từng câu rồi xem ngay đáp án · lời giải.", "practice.all": "Ngẫu nhiên toàn bộ", "exam.org": "Chương trình Hội nhập xã hội (KIIP)", "exam.title": "Đánh giá tổng hợp dùng cho nhập tịch", "exam.subtitle": "Thi thử phần thi viết", "exam.name": "Họ tên", "exam.namePh": "Nhập họ tên", "exam.no": "Số báo danh", "exam.noticeTitle": "Lưu ý", "exam.n1": "Đánh giá tổng hợp dùng cho nhập tịch gồm <b>trắc nghiệm 36 câu (65 điểm) + tự luận viết (10 điểm) + vấn đáp (25 điểm) = 100 điểm</b>, <b>đạt 60 điểm trở lên là đậu</b>.", "exam.n2": "Bài thi thử này làm <b>phần viết (trắc nghiệm + tự luận) trong 60 phút</b>, sau đó luyện tiếp <b>phần vấn đáp</b>.", "exam.n3": "Trắc nghiệm chọn một trong ①②③④, phần tự luận viết <b>trong 200 chữ</b>.", "exam.n4": "Chỉ trắc nghiệm được chấm tự động; phần viết · vấn đáp tự kiểm tra bằng đáp án mẫu · gợi ý.", "exam.n5": "Phần vấn đáp ở kỳ thi thật là một phiên riêng 10 phút. Khi hoàn thành giai đoạn 5 của Chương trình Hội nhập xã hội + thi đậu thì <b>có thể được miễn phỏng vấn nhập tịch</b>.", "common.cancel": "Hủy", "common.home": "Về trang chủ", "exam.start": "Bắt đầu thi", "quiz.prev": "← Câu trước", "quiz.next": "Câu sau →", "quiz.result": "Xem kết quả", "quiz.submit": "Nộp bài và chấm điểm", "writing.title": "Luyện viết · vấn đáp", "seg.writing": "Viết", "seg.oral": "Vấn đáp", "result.title": "Kết quả chấm điểm", "result.unit": " điểm", "result.reviewHead": "Xem lại câu hỏi", "result.retryWrong": "Làm lại chỉ những câu sai", "wrong.title": "Sổ câu sai", "wrong.desc": "Những câu đã làm sai sẽ được gom lại đây. Làm đúng thì câu đó biến khỏi danh sách.", "wrong.start": "Làm câu sai", "wrong.clear": "Xóa sổ câu sai", "stats.title": "Thống kê học tập", "stats.recentHead": "Lịch sử thi thử gần đây", "stats.reset": "Đặt lại thống kê", "writeCount.suffix": " / 200 chữ", "sync.ready": "Đã sẵn sàng · tổng {0} câu (trắc nghiệm {1})", "sync.never": "Nhấn Đồng bộ để tải về câu hỏi mới nhất.", "sync.offline": "Ngoại tuyến — tiếp tục với {0} câu đã đồng bộ lần cuối", "sync.first": "Bạn chưa tải về câu hỏi nào. Hãy kết nối Internet rồi nhấn Đồng bộ.", "sync.synced": "Đã đồng bộ về câu hỏi mới nhất · tổng {0} câu", "toast.syncing": "Đang tải câu hỏi mới nhất…", "toast.syncDone": "Đồng bộ xong! Tổng {0} câu", "toast.offline": "Hãy kiểm tra kết nối Internet. Bạn có thể tiếp tục với câu hỏi đã lưu.", "toast.syncFail": "Không tải được câu hỏi.", "bankInfo": "Phiên bản bộ câu hỏi: {0} · trắc nghiệm {1} câu · đồng bộ lần cuối: {2}", "noSync": "Không có", "wrongCount": "{0} câu sai", "cat.count": "{0} câu", "banner.mc": "【Trắc nghiệm】  {0} / {1}", "banner.writing": "【Tự luận viết】  {0} / {1}  ·  trong 200 chữ", "banner.oral": "【Vấn đáp】  {0} / {1}  ·  nói thành tiếng", "fb.correct": "Chính xác! ✅", "fb.wrong": "Sai rồi ❌  Đáp án: {0}", "write.phWrite": "Viết câu trả lời của bạn ở đây (trong 200 chữ)", "write.phOral": "Hãy trả lời thành tiếng. (Bạn có thể ghi chú ý chính — tùy chọn)", "result.frac": "Đúng {1}/{0} câu trắc nghiệm", "result.fracMore": " · Phần viết · vấn đáp hãy tự kiểm tra ở bên dưới", "sg.head": "Tự chấm viết · vấn đáp", "sg.note": "Phần viết · vấn đáp là tự luận nên khó chấm tự động. Tự chấm khi đối chiếu bài mẫu sẽ được tính vào tổng điểm.", "sg.prompt": "↓ Tự chấm viết · vấn đáp để tính vào điểm", "sg.good": "Tốt", "sg.mid": "Trung bình", "sg.poor": "Chưa đạt", "sg.ungraded": "Chưa chấm", "bd.mc": "Trắc nghiệm", "bd.writing": "Viết", "bd.oral": "Vấn đáp", "bd.total": "Tổng", "result.pass": "Đã vượt mốc đậu (60 điểm) 🎉", "result.fail": "Cố thêm chút nữa để đạt mốc đậu (60 điểm)!", "result.practice": "Đây là kết quả ở chế độ luyện tập.", "result.estLevel": "Giai đoạn xếp lớp dự kiến: {0}", "result.levelDisclaimer": "※ Điểm này không phải điểm xếp lớp thực tế mà là <b>ước tính dựa trên năng lực trắc nghiệm</b>. Đánh giá đầu vào thực tế gồm trắc nghiệm (75 điểm) + viết (2 câu) + vấn đáp (25 điểm) = 100 điểm, phần viết · vấn đáp do người chấm. Ngoài ra, <b>nếu vấn đáp dưới 3 điểm thì xếp giai đoạn 0</b>. Giai đoạn chính xác được quyết định theo điểm trong ngày thi.", "track.nat": "Đánh giá tổng hợp nhập tịch", "track.perm": "Đánh giá tổng hợp định cư", "track.pre": "Đánh giá đầu vào Hội nhập xã hội", "review.unanswered": "Chưa chọn", "review.emptyWrite": "Không có câu trả lời nào được viết.", "review.emptyOral": "Không có nội dung ghi chú nào.", "stats.total": "Tổng số câu đã làm", "stats.acc": "Tỷ lệ đúng tổng thể", "stats.noHistory": "Chưa có lịch sử thi thử nào.", "wrong.empty": "Không có câu sai nào. Bạn đang làm rất tốt! 👏", "writing.empty": "Không có câu hỏi thuộc loại này.", "guide.show": "💡 Xem gợi ý", "guide.hide": "💡 Ẩn gợi ý", "writing.draftPh": "Thử viết câu trả lời ở đây (trong 200 chữ)", "model.show": "📝 Xem đáp án mẫu", "model.hide": "📝 Ẩn đáp án mẫu", "review.model": "Đáp án mẫu", "resume.banner": "📌 Tiếp tục bài thi thử đang dở ({0}/{1})", "exam.resume": "Làm tiếp ({0}/{1})", "confirm.discardMock": "Bản ghi bài thi thử đang dở sẽ bị mất. Bắt đầu lại từ đầu chứ?", "toast.resumed": "Làm tiếp.", "resume.practice": "📌 Làm tiếp — {0} ({1}/{2})", "practice.allLabel": "Toàn bộ", "confirm.submit": "Nộp bài và chấm điểm chứ?", "confirm.clearWrong": "Xóa toàn bộ sổ câu sai chứ?", "confirm.resetStats": "Đặt lại toàn bộ thống kê và lịch sử học tập chứ?", "toast.clearedWrong": "Đã xóa sổ câu sai.", "toast.resetStats": "Đã đặt lại.", "toast.noQ": "Không có câu hỏi nào để làm. Hãy đồng bộ trước.", "toast.timeUp": "Hết giờ! Tự động chấm điểm.", "count.char": "{0} chữ", "wrong.desc2": "Những câu làm sai sẽ gom lại đây. Làm đúng <b>hai lần liên tiếp</b> thì câu đó tốt nghiệp khỏi danh sách.", "wrong.miss": "Sai {0} lần", "wrong.almost": "Đúng thêm một lần nữa là tốt nghiệp", "wrong.desc3": "Những câu làm sai sẽ gom lại đây. Đáp án được che đi; chọn phương án là chấm ngay tại chỗ. Đúng <b>hai lần liên tiếp</b> thì câu đó tốt nghiệp khỏi danh sách.", "wrong.del": "Xóa", "wrong.confirmDel": "Xóa câu này khỏi sổ câu sai chứ?", "wrong.deleted": "Đã xóa khỏi sổ câu sai.", "wrong.grad": "Tốt nghiệp! Câu này sẽ rời khỏi danh sách. 🎓", "wrong.retry": "Làm lại", "listen.head": "🎧 Nghe và nói", "listen.play": "▶ Nghe", "listen.replay": "↻ Nghe lại", "listen.stop": "■ Dừng", "listen.script": "Xem lời thoại", "listen.scriptHide": "Ẩn lời thoại", "listen.hint": "Hãy chỉ nghe âm thanh rồi trả lời trước. Nên xem lời thoại sau khi đã trả lời.", "listen.no": "Trình duyệt này không hỗ trợ phát giọng nói. Hãy xem lời thoại để luyện tập.", "examdate.title": "Đặt ngày thi", "examdate.set": "Đặt", "examdate.clear": "Xóa", "examdate.dday": "Còn {0} ngày", "examdate.today": "Đúng hôm nay", "examdate.pace": "Đề nghị mỗi ngày: {0} câu", "examdate.left": "Còn {0} câu", "examdate.past": "Ngày thi đã qua — hãy đặt ngày thi mới", "examdate.hint": "Đặt ngày thi để biết mỗi ngày nên làm bao nhiêu câu.", "result.mcScore": "Trắc nghiệm", "result.mcOf": "{0} / 65 điểm", "result.estTotal": "Tổng điểm ước tính (gồm tự chấm)", "result.estOf": "{0} / 100", "result.ungradedN": "Còn {0} câu chưa chấm — chấm xong mới ra tổng điểm", "result.mcOnly": "Chỉ trắc nghiệm {0} / 65", "stats.practiceCat": "Chỉ luyện lĩnh vực này", "practice.weak": "Ưu tiên điểm yếu", "practice.weakSub": "Lĩnh vực hay sai sẽ ra nhiều hơn", "oral.recite": "Hãy che đáp án mẫu và trả lời thành tiếng trước.", "oral.reveal": "Xem đáp án mẫu", "oral.hideModel": "Ẩn đáp án mẫu", "oral.selfHead": "Tự đánh giá", "oral.good": "Tốt", "oral.mid": "Trung bình", "oral.poor": "Chưa đạt", "oral.saved": "Đã ghi lại.", "wongoji.title": "Cách viết trên giấy có ô (bài thi thật viết trên giấy có ô)", "wongoji.body": "<ul><li>① Chữ Hàn viết mỗi ô một chữ.</li><li>② Số có từ hai chữ số trở lên và chữ cái thường viết mỗi ô 2 ký tự; số có một chữ số và chữ in hoa viết mỗi ô 1 ký tự.</li><li>③ Đầu bài và đoạn văn mới để trống ô đầu tiên, bắt đầu viết từ ô thứ hai.</li><li>④ Từ dòng thứ hai trở đi, viết kín từ ô đầu dòng, bất kể quy tắc cách chữ.</li><li>⑤ Sau dấu phẩy (,) và dấu chấm (.) không để trống ô, sau dấu chấm hỏi (?) và dấu chấm than (!) để trống một ô.</li><li>⑥ Không viết dấu câu ở ô đầu dòng mà viết cùng ô cuối của dòng trước.</li><li>⑦ Các cách diễn đạt như '수 있다/없다' (có thể/không thể), '것 같다' (hình như), số đếm tiếng Hàn với danh từ đơn vị (ví dụ '세 명')... đều phải cách chữ (để trống ô).</li></ul>", "result.paperScore": "Phần viết (trắc nghiệm + tự luận)", "result.paperOf": "{0} / {1} điểm", "result.wAuto": "Đã tính điểm tự luận chấm tự động", "sg.noteAuto": "Phần viết đã được chấm tự động theo nội dung bài làm. Phần vấn đáp là nói tự do nên hãy tự chấm khi đối chiếu bài mẫu. Nếu không hài lòng với điểm tự động, bạn có thể ghi đè bằng các nút bên dưới.", "sg.headOverride": "Tự chấm lại", "bd.autoTag": "tự động", "auto.ok": "Chính xác ✅", "auto.mid": "Đúng ngữ pháp nhưng cách diễn đạt chưa ổn △", "auto.no": "Sai rồi ❌", "auto.empty": "Không có bài làm ❌", "auto.task": "Thực hiện yêu cầu (①②③④ mỗi ý 2,5 điểm)", "auto.len": "Độ dài", "auto.style": "Văn phong", "result.oralFloor": "Vấn đáp dưới 3 điểm", "auto.checkHead": "Mục kiểm tra (không tính điểm)", "auto.title": "Tiêu đề", "auto.flow": "Liên kết câu", "auto.w.over": "Vượt quá 200 ô", "auto.w.short": "Hơi ngắn", "auto.w.mixed": "Lẫn lộn văn phong", "auto.w.titled": "Không viết tiêu đề", "auto.capped": "Bài quá ngắn nên điểm đã bị giới hạn. Với độ dài này không thể viết đủ bốn ý.", "auto.noteNat": "※ Thang điểm chính thức là <b>tự luận viết 10 điểm = 4 câu × 2,5 điểm</b> (Bộ Tư pháp · Quỹ Di trú Hàn Quốc công bố), còn tiêu chí chấm chi tiết bên trong thì <b>không được công khai theo quy định</b>. Điểm ở đây chỉ xét bạn <b>có đề cập</b> đủ bốn ý hay không, là giá trị gần đúng để luyện tập, <b>không chấm độ chính xác của từ vựng · ngữ pháp và chiều sâu nội dung</b>. Kỳ thi thật do giám thị trực tiếp đọc và chấm.", "auto.notePre": "※ Câu tự luận ngắn của kỳ đánh giá đầu vào thật là 1,5 điểm mỗi câu, và việc có điểm thành phần hay không thì không được công bố. Dấu △ chỉ là ký hiệu dùng khi luyện tập.", "auto.w.choppy": "Quá ít câu", "auto.overNote": "Bạn đã viết quá 200 ô. Bài thi thật chỉ có một tờ giấy ô 200 ô nên phần vượt quá không có chỗ để viết. Ở đây cũng chỉ chấm đến ô thứ 200.", "style.formal": "Thể -seumnida", "style.polite": "Thể -haeyo", "style.plain": "Thể viết", "style.casual": "Thể thân mật", "auto.w.banmal": "Không dùng thể thân mật trong bài thi", "count.sent": "{0} câu", "credit.html": "<span class=\"cred-mission\">Luyện thi Đánh giá tổng hợp · Đánh giá đầu vào (KIIP)</span><span class=\"cred-links\">Đây không phải kỳ thi chính thức của Bộ Tư pháp hay Quỹ Di trú Hàn Quốc, mà là tài liệu luyện tập do cá nhân biên soạn.</span>"};
I18N.th = {"app.title": "ฝึกสอบแปลงสัญชาติ", "app.sync": "ซิงค์", "home.mock.t": "ทำข้อสอบจำลอง", "home.mock.s": "ทำเหมือนสอบจริง", "home.practice.t": "ฝึกแยกตามหมวด", "home.practice.s": "ฝึกตาม 9 หมวด", "home.writing.t": "ฝึกเขียน·พูด", "home.writing.s": "พูด·เขียนตามหัวข้อ", "home.typing.t": "ฝึกพิมพ์", "home.typing.s": "พิมพ์ตามเรียงความตัวอย่าง", "home.wrong.t": "สมุดข้อผิด", "home.stats.t": "สถิติการเรียน", "home.stats.s": "ดูอัตราถูก·ประวัติ", "practice.title": "ฝึกแยกตามหมวด", "practice.desc": "ทำทีละข้อแล้วดูเฉลย·คำอธิบายได้ทันที", "practice.all": "สุ่มทั้งหมด", "exam.org": "โครงการบูรณาการสังคม (KIIP)", "exam.title": "การประเมินรวมเพื่อแปลงสัญชาติ", "exam.subtitle": "ข้อสอบจำลองภาคข้อเขียน", "exam.name": "ชื่อ", "exam.namePh": "กรอกชื่อ", "exam.no": "เลขที่นั่งสอบ", "exam.noticeTitle": "ข้อควรทราบ", "exam.n1": "การประเมินรวมเพื่อแปลงสัญชาติคือ <b>ปรนัย 36 ข้อ (65 คะแนน) + เขียน (10 คะแนน) + พูด (25 คะแนน) = 100 คะแนน</b>, <b>ได้ 60 คะแนนขึ้นไปถือว่าผ่าน</b>", "exam.n2": "ข้อสอบจำลองนี้ให้ทำ <b>ภาคข้อเขียน (ปรนัย+เขียน) ภายใน 60 นาที</b> แล้วฝึก <b>ข้อสอบพูด</b> ต่อ", "exam.n3": "ปรนัยให้เลือกหนึ่งข้อจาก ①②③④ ส่วนการเขียนให้เขียน <b>ไม่เกิน 200 ตัวอักษร</b>", "exam.n4": "ตรวจคะแนนอัตโนมัติเฉพาะปรนัย ส่วนเขียน·พูดให้ตรวจสอบด้วยตนเองจากคำตอบตัวอย่าง·คำแนะนำ", "exam.n5": "การพูดในสอบจริงเป็นช่วงแยกต่างหาก 10 นาที เมื่อจบโครงการบูรณาการสังคมระดับ 5 + สอบผ่าน จะ <b>ได้รับการยกเว้นการสัมภาษณ์แปลงสัญชาติ</b>", "common.cancel": "ยกเลิก", "common.home": "กลับหน้าหลัก", "exam.start": "เริ่มสอบ", "quiz.prev": "← ก่อนหน้า", "quiz.next": "ถัดไป →", "quiz.result": "ดูผล", "quiz.submit": "ส่งและตรวจคะแนน", "writing.title": "ฝึกเขียน·พูด", "seg.writing": "เขียน", "seg.oral": "พูด", "result.title": "ผลการตรวจคะแนน", "result.unit": "คะแนน", "result.reviewHead": "ดูข้อสอบอีกครั้ง", "result.retryWrong": "ทำเฉพาะข้อที่ผิดอีกครั้ง", "wrong.title": "สมุดข้อผิด", "wrong.desc": "ข้อที่ตอบผิดจะถูกรวบรวมไว้ที่นี่ เมื่อตอบถูกจะหายไปจากรายการ", "wrong.start": "ทำข้อที่ผิด", "wrong.clear": "ล้างสมุดข้อผิด", "stats.title": "สถิติการเรียน", "stats.recentHead": "ประวัติข้อสอบจำลองล่าสุด", "stats.reset": "รีเซ็ตสถิติ", "writeCount.suffix": " / 200 ตัวอักษร", "sync.ready": "พร้อมแล้ว · ทั้งหมด {0} ข้อ (ปรนัย {1})", "sync.never": "กดซิงค์เพื่อรับข้อสอบล่าสุด", "sync.offline": "ออฟไลน์ — ดำเนินการด้วย {0} ข้อจากการซิงค์ครั้งล่าสุด", "sync.first": "ยังไม่ได้รับข้อสอบ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วกดซิงค์", "sync.synced": "ซิงค์เป็นข้อสอบล่าสุดแล้ว · ทั้งหมด {0} ข้อ", "toast.syncing": "กำลังรับข้อสอบล่าสุด…", "toast.syncDone": "ซิงค์เสร็จแล้ว! ทั้งหมด {0} ข้อ", "toast.offline": "กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต คุณสามารถทำต่อด้วยข้อสอบที่บันทึกไว้ได้", "toast.syncFail": "ไม่สามารถรับข้อสอบได้", "bankInfo": "เวอร์ชันคลังข้อสอบ: {0} · ปรนัย {1} ข้อ · ซิงค์ล่าสุด: {2}", "noSync": "ไม่มี", "wrongCount": "ข้อที่ผิด {0} ข้อ", "cat.count": "{0} ข้อ", "banner.mc": "【ปรนัย】  {0} / {1}", "banner.writing": "【เขียน】  {0} / {1}  ·  ไม่เกิน 200 ตัวอักษร", "banner.oral": "【พูด】  {0} / {1}  ·  พูดออกเสียง", "fb.correct": "ตอบถูก! ✅", "fb.wrong": "ตอบผิด ❌  คำตอบที่ถูก: {0}", "write.phWrite": "เขียนคำตอบของคุณที่นี่ (ไม่เกิน 200 ตัวอักษร)", "write.phOral": "ลองพูดตอบออกเสียงดู (จะจดประเด็นสำคัญไว้ก็ได้ — ไม่บังคับ)", "result.frac": "ตอบถูก {1} ข้อ จากปรนัย {0} ข้อ", "result.fracMore": " · เขียน·พูดให้ตรวจสอบเองด้านล่าง", "sg.head": "ประเมินตนเอง เขียน·พูด", "sg.note": "เขียน·พูดเป็นการตอบอิสระ จึงให้คะแนนอัตโนมัติได้ยาก ประเมินตนเองโดยเทียบกับคำตอบตัวอย่างแล้วจะรวมในคะแนนรวม", "sg.prompt": "↓ ประเมินเขียน·พูดเองเพื่อรวมในคะแนน", "sg.good": "ดี", "sg.mid": "พอใช้", "sg.poor": "ยังไม่ดี", "sg.ungraded": "ยังไม่ประเมิน", "bd.mc": "ปรนัย", "bd.writing": "เขียน", "bd.oral": "พูด", "bd.total": "รวม", "result.pass": "ผ่านเกณฑ์ (60 คะแนน) 🎉", "result.fail": "อีกนิดเดียวก็ถึงเกณฑ์ (60 คะแนน)!", "result.practice": "นี่คือผลในโหมดฝึก", "result.estLevel": "ระดับที่คาดว่าจะได้รับการจัด: {0}", "result.levelDisclaimer": "※ คะแนนนี้ไม่ใช่คะแนนจัดระดับจริง แต่เป็น <b>ค่าประมาณตามความสามารถปรนัย</b> การประเมินเบื้องต้นจริงคือ ปรนัย (75 คะแนน)+เขียน (2 ข้อ)+พูด (25 คะแนน)=100 คะแนน โดยเขียน·พูดตรวจโดยคน นอกจากนี้ <b>หากพูดได้ต่ำกว่า 3 คะแนนจะถูกจัดเป็นระดับ 0</b> ระดับที่แน่นอนจะกำหนดจากคะแนนในวันสอบ", "track.nat": "การประเมินรวมแปลงสัญชาติ", "track.perm": "การประเมินรวมถิ่นที่อยู่ถาวร", "track.pre": "การประเมินเบื้องต้นบูรณาการสังคม", "review.unanswered": "ไม่ได้เลือก", "review.emptyWrite": "ไม่มีคำตอบที่เขียนไว้", "review.emptyOral": "ไม่มีเนื้อหาที่จดไว้", "stats.total": "ข้อที่ทำทั้งหมด", "stats.acc": "อัตราถูกรวม", "stats.noHistory": "ยังไม่มีประวัติข้อสอบจำลอง", "wrong.empty": "ไม่มีข้อที่ผิด ทำได้ดีมาก! 👏", "writing.empty": "ไม่มีข้อสอบประเภทนี้", "guide.show": "💡 ดูคำแนะนำ", "guide.hide": "💡 ซ่อนคำแนะนำ", "writing.draftPh": "ลองเขียนคำตอบที่นี่ (ไม่เกิน 200 ตัวอักษร)", "model.show": "📝 ดูคำตอบตัวอย่าง", "model.hide": "📝 ซ่อนคำตอบตัวอย่าง", "review.model": "คำตอบตัวอย่าง", "resume.banner": "📌 ทำข้อสอบจำลองที่ค้างไว้ต่อ ({0}/{1})", "exam.resume": "ทำต่อ ({0}/{1})", "confirm.discardMock": "ประวัติข้อสอบจำลองที่ทำค้างไว้จะหายไป จะเริ่มใหม่หรือไม่?", "toast.resumed": "ทำต่อจากเดิม", "resume.practice": "📌 ทำต่อ — {0} ({1}/{2})", "practice.allLabel": "ทั้งหมด", "confirm.submit": "จะส่งและตรวจคะแนนหรือไม่?", "confirm.clearWrong": "จะล้างสมุดข้อผิดทั้งหมดหรือไม่?", "confirm.resetStats": "จะรีเซ็ตสถิติและประวัติการเรียนทั้งหมดหรือไม่?", "toast.clearedWrong": "ล้างสมุดข้อผิดแล้ว", "toast.resetStats": "รีเซ็ตแล้ว", "toast.noQ": "ไม่มีข้อสอบให้ทำ กรุณาซิงค์ก่อน", "toast.timeUp": "หมดเวลา! ตรวจคะแนนอัตโนมัติ", "count.char": "{0} ตัวอักษร", "wrong.desc2": "ข้อที่ตอบผิดจะถูกรวบรวมไว้ที่นี่ ตอบถูก <b>สองครั้งติดต่อกัน</b> ก็จะจบการศึกษาออกจากรายการ", "wrong.miss": "ผิด {0} ครั้ง", "wrong.almost": "ตอบถูกอีกครั้งก็จบการศึกษา", "wrong.desc3": "ข้อที่ตอบผิดจะถูกรวบรวมไว้ที่นี่ คำตอบถูกซ่อนไว้ เลือกตัวเลือกแล้วตรวจคะแนนทันที ตอบถูก <b>สองครั้งติดต่อกัน</b> ก็จะจบการศึกษาออกจากรายการ", "wrong.del": "ลบ", "wrong.confirmDel": "จะลบข้อนี้ออกจากสมุดข้อผิดหรือไม่?", "wrong.deleted": "ลบออกจากสมุดข้อผิดแล้ว", "wrong.grad": "จบการศึกษา! ข้อนี้จะออกจากรายการ 🎓", "wrong.retry": "ทำอีกครั้ง", "listen.head": "🎧 ฟังแล้วพูด", "listen.play": "▶ ฟัง", "listen.replay": "↻ ฟังอีกครั้ง", "listen.stop": "■ หยุด", "listen.script": "ดูบทพูด", "listen.scriptHide": "ซ่อนบทพูด", "listen.hint": "ลองฟังเฉพาะเสียงแล้วตอบก่อน ควรดูบทพูดหลังจากตอบแล้ว", "listen.no": "เบราว์เซอร์นี้ไม่รองรับการเล่นเสียง กรุณาดูบทพูดเพื่อฝึกซ้อม", "examdate.title": "ตั้งวันสอบ", "examdate.set": "ตั้งค่า", "examdate.clear": "ล้าง", "examdate.dday": "เหลือ {0} วัน", "examdate.today": "วันนี้เลย", "examdate.pace": "แนะนำต่อวัน: {0} ข้อ", "examdate.left": "เหลือ {0} ข้อ", "examdate.past": "เลยวันสอบแล้ว — กรุณาตั้งวันสอบใหม่", "examdate.hint": "ตั้งวันสอบแล้วจะบอกว่าแต่ละวันควรทำกี่ข้อ", "result.mcScore": "ปรนัย", "result.mcOf": "{0} / 65 คะแนน", "result.estTotal": "คะแนนรวมโดยประมาณ (รวมประเมินตนเอง)", "result.estOf": "{0} / 100", "result.ungradedN": "ยังไม่ประเมิน {0} ข้อ — ประเมินแล้วจึงจะได้คะแนนรวม", "result.mcOnly": "เฉพาะปรนัย {0} / 65", "stats.practiceCat": "ฝึกเฉพาะหมวดนี้", "practice.weak": "เน้นจุดอ่อน", "practice.weakSub": "หมวดที่ผิดบ่อยจะออกบ่อยขึ้น", "oral.recite": "กรุณาปิดคำตอบตัวอย่างแล้วลองพูดตอบออกเสียงก่อน", "oral.reveal": "ดูคำตอบตัวอย่าง", "oral.hideModel": "ซ่อนคำตอบตัวอย่าง", "oral.selfHead": "ประเมินตนเอง", "oral.good": "ดี", "oral.mid": "พอใช้", "oral.poor": "ยังไม่ดี", "oral.saved": "บันทึกแล้ว", "wongoji.title": "วิธีเขียนบนกระดาษคำตอบแบบช่อง (สอบจริงเขียนบนกระดาษแบบช่อง)", "wongoji.body": "<ul><li>① เขียนอักษรเกาหลี 1 ตัวต่อ 1 ช่อง</li><li>② ตัวเลขตั้งแต่ 2 หลักขึ้นไปและตัวอักษรพิมพ์เล็กเขียน 2 ตัวต่อ 1 ช่อง ส่วนตัวเลข 1 หลักและตัวพิมพ์ใหญ่เขียน 1 ตัวต่อ 1 ช่อง</li><li>③ ต้นเรื่องและย่อหน้าใหม่ให้เว้นช่องแรกไว้ แล้วเริ่มเขียนจากช่องที่สอง</li><li>④ ตั้งแต่บรรทัดที่สองเป็นต้นไป ให้เขียนเต็มตั้งแต่ช่องแรกของบรรทัด โดยไม่ต้องเว้นวรรค</li><li>⑤ หลังเครื่องหมายจุลภาค(,)และมหัพภาค(.)ไม่ต้องเว้นช่อง ส่วนหลังเครื่องหมายคำถาม(?)และอัศเจรีย์(!)ให้เว้น 1 ช่อง</li><li>⑥ ไม่เขียนเครื่องหมายวรรคตอนในช่องแรกของบรรทัด แต่ให้เขียนรวมไว้ในช่องสุดท้ายของบรรทัดก่อนหน้า</li><li>⑦ คำว่า '수 있다/없다' (สามารถ/ไม่สามารถ), '것 같다' (ดูเหมือนว่า), ตัวเลขภาษาเกาหลีกับคำลักษณนาม (เช่น '세 명') ฯลฯ ให้เว้นวรรค</li></ul>", "result.paperScore": "ภาคข้อเขียน (ปรนัย+เขียน)", "result.paperOf": "{0} / {1} คะแนน", "result.wAuto": "รวมคะแนนเขียนที่ตรวจอัตโนมัติแล้ว", "sg.noteAuto": "ส่วนการเขียนตรวจคะแนนอัตโนมัติจากเนื้อหาคำตอบแล้ว ส่วนการพูดเป็นการพูดอิสระ กรุณาประเมินเองโดยเทียบกับคำตอบตัวอย่าง หากไม่พอใจคะแนนอัตโนมัติ สามารถกดปุ่มเพื่อเขียนทับได้", "sg.headOverride": "ประเมินใหม่ด้วยตนเอง", "bd.autoTag": "อัตโนมัติ", "auto.ok": "ตอบถูก ✅", "auto.mid": "ไวยากรณ์ถูกแต่สำนวนยังไม่ดี △", "auto.no": "ตอบผิด ❌", "auto.empty": "ไม่มีคำตอบที่เขียนไว้ ❌", "auto.task": "การทำตามโจทย์ (①②③④ ข้อละ 2.5 คะแนน)", "auto.len": "ความยาว", "auto.style": "ระดับภาษา", "result.oralFloor": "พูดต่ำกว่า 3 คะแนน", "auto.checkHead": "รายการตรวจสอบ (ไม่คิดเป็นคะแนน)", "auto.title": "ชื่อเรื่อง", "auto.flow": "การเชื่อมประโยค", "auto.w.over": "เกิน 200 ช่อง", "auto.w.short": "สั้นไปเล็กน้อย", "auto.w.mixed": "ใช้ระดับภาษาปนกัน", "auto.w.titled": "ไม่ต้องเขียนชื่อเรื่อง", "auto.capped": "ความยาวไม่พอ จึงจำกัดคะแนนไว้ ด้วยความยาวเท่านี้ไม่สามารถเขียนครบทั้งสี่ประเด็นได้", "auto.noteNat": "※ คะแนนอย่างเป็นทางการคือ <b>ข้อเขียน 10 คะแนน = 4 ข้อ × 2.5 คะแนน</b> (กระทรวงยุติธรรม · มูลนิธิการย้ายถิ่นเกาหลีเผยแพร่) ส่วนเกณฑ์การตรวจโดยละเอียดภายในนั้น <b>ไม่เปิดเผยตามกฎหมาย</b> คะแนนตรงนี้ดูเพียงว่า <b>ได้เขียนถึง</b> ทั้งสี่ประเด็นหรือไม่ เป็นค่าประมาณสำหรับฝึกซ้อม <b>ไม่ได้ตรวจความถูกต้องของคำศัพท์·ไวยากรณ์และความลึกของเนื้อหา</b> การสอบจริงกรรมการคุมสอบจะอ่านและตรวจเอง", "auto.notePre": "※ ข้อเขียนตอบสั้นของการประเมินเบื้องต้นจริงคือข้อละ 1.5 คะแนน และไม่มีการเปิดเผยว่ามีคะแนนบางส่วนหรือไม่ เครื่องหมาย △ เป็นเพียงสัญลักษณ์สำหรับการฝึกซ้อม", "auto.w.choppy": "ประโยคน้อยเกินไป", "auto.overNote": "เกิน 200 ช่องแล้ว ข้อสอบจริงมีกระดาษช่อง 200 ช่องเพียงแผ่นเดียว ส่วนที่เกินจึงไม่มีที่ให้เขียน ที่นี่ก็ตรวจเพียงถึงช่องที่ 200 เท่านั้น", "style.formal": "รูป -seumnida", "style.polite": "รูป -haeyo", "style.plain": "ภาษาเขียน", "style.casual": "ภาษาไม่สุภาพ", "auto.w.banmal": "ไม่ใช้ภาษาไม่สุภาพในข้อสอบ", "count.sent": "{0} ประโยค", "credit.html": "<span class=\"cred-mission\">ฝึกทำข้อสอบประเมินรวม·ประเมินเบื้องต้น (KIIP)</span><span class=\"cred-links\">ไม่ใช่ข้อสอบทางการของกระทรวงยุติธรรมหรือมูลนิธิการย้ายถิ่นเกาหลี แต่เป็นเอกสารฝึกซ้อมที่จัดทำโดยบุคคล</span>"};
CAT_TR.vi = {"한국어": "Tiếng Hàn", "사회": "Xã hội", "문화": "Văn hóa", "정치": "Chính trị", "경제": "Kinh tế", "교육": "Giáo dục", "법": "Pháp luật", "역사": "Lịch sử", "지리": "Địa lý", "작문": "Viết văn", "구술": "Vấn đáp", "어휘": "Từ vựng", "문법": "Ngữ pháp", "읽기·이해": "Đọc · hiểu", "대화": "Hội thoại", "한국문화": "Văn hóa Hàn Quốc", "한국사회": "Xã hội Hàn Quốc"};
CAT_TR.th = {"한국어": "ภาษาเกาหลี", "사회": "สังคม", "문화": "วัฒนธรรม", "정치": "การเมือง", "경제": "เศรษฐกิจ", "교육": "การศึกษา", "법": "กฎหมาย", "역사": "ประวัติศาสตร์", "지리": "ภูมิศาสตร์", "작문": "การเขียน", "구술": "การพูด", "어휘": "คำศัพท์", "문법": "ไวยากรณ์", "읽기·이해": "การอ่าน·ความเข้าใจ", "대화": "บทสนทนา", "한국문화": "วัฒนธรรมเกาหลี", "한국사회": "สังคมเกาหลี"};
T2.vi = {"귀화 종합평가": "Đánh giá tổng hợp nhập tịch", "사회통합프로그램 (KIIP)": "Chương trình Hội nhập xã hội (KIIP)", "귀화용 종합평가": "Đánh giá tổng hợp dùng cho nhập tịch", "필기시험 모의고사": "Thi thử phần thi viết", "실제 시험처럼 풀기 (객관식+작문+구술)": "Làm bài như thi thật (trắc nghiệm + viết + vấn đáp)", "9개 영역별로 풀기": "Luyện theo 9 lĩnh vực", "귀화용 종합평가는 <b>객관식 36문항(65점) + 작문형(10점) + 구술(25점) = 100점</b>, <b>60점 이상이면 합격</b>입니다.": "Đánh giá tổng hợp dùng cho nhập tịch gồm <b>trắc nghiệm 36 câu (65 điểm) + tự luận viết (10 điểm) + vấn đáp (25 điểm) = 100 điểm</b>, <b>đạt 60 điểm trở lên là đậu</b>.", "이 모의고사는 <b>필기(객관식+작문)를 60분 안에</b> 풀고, 이어서 <b>구술 문항</b>까지 연습합니다.": "Bài thi thử này làm <b>phần viết (trắc nghiệm + tự luận) trong 60 phút</b>, sau đó luyện tiếp <b>phần vấn đáp</b>.", "객관식은 ①②③④ 중 하나를 고르고, 작문은 <b>4문제가 통합된 1문제</b>를 <b>200자 원고지 1장 이내</b>로 작성합니다.": "Trắc nghiệm chọn một trong ①②③④; phần tự luận là <b>1 đề gộp từ 4 câu</b>, viết trong <b>1 tờ giấy ô 200 chữ</b>.", "객관식만 자동 채점되며, 작문·구술은 모범답안·도움말로 스스로 점검합니다.": "Chỉ trắc nghiệm được chấm tự động; phần viết · vấn đáp tự kiểm tra bằng đáp án mẫu · gợi ý.", "실제 시험의 구술은 별도 10분 세션(<b>5문항×5점</b>)입니다. 사회통합프로그램 <b>5단계 전 과정(기본+심화) 이수</b> + 합격 시 <b>귀화 면접심사가 면제</b>됩니다.": "Phần vấn đáp ở kỳ thi thật là một phiên riêng 10 phút (<b>5 câu × 5 điểm</b>). Khi <b>hoàn thành toàn bộ giai đoạn 5 (cơ bản + chuyên sâu)</b> của Chương trình Hội nhập xã hội và thi đậu, bạn <b>được miễn phỏng vấn nhập tịch</b>.", "귀화허가 신청자는 <b>신청일로부터 1년 이내 재응시 2회</b>(최초 포함 총 3회)까지 가능하며, <b>3회 모두 불합격하면 귀화신청이 불허</b>됩니다.": "Người xin phép nhập tịch có thể <b>thi lại tối đa 2 lần trong vòng 1 năm kể từ ngày nộp đơn</b> (tổng cộng 3 lần kể cả lần đầu); nếu <b>trượt cả 3 lần, đơn xin nhập tịch sẽ không được chấp thuận</b>.", "TOPIK 급수가 있으면 사전평가 없이 단계 배정이 가능합니다(<b>1급→2단계, 2급→3단계, 3급→4단계, 4급 이상→5단계</b>). 배정 단계는 <b>2년간 유효</b>하며, 사전평가에 재응시하면 이전 교육 이수 기록이 무효가 됩니다.": "Nếu có chứng chỉ TOPIK, bạn có thể được xếp giai đoạn mà không cần thi đánh giá đầu vào (<b>cấp 1→giai đoạn 2, cấp 2→giai đoạn 3, cấp 3→giai đoạn 4, cấp 4 trở lên→giai đoạn 5</b>). Giai đoạn được xếp có <b>hiệu lực 2 năm</b>; nếu thi lại đánh giá đầu vào, hồ sơ học tập trước đó sẽ bị hủy.", "영주 종합평가": "Đánh giá tổng hợp định cư", "영주용 종합평가": "Đánh giá tổng hợp dùng cho định cư", "영주용 종합평가는 <b>객관식 36문항(65점) + 작문형(10점) + 구술(25점) = 100점</b>, <b>60점 이상이면 합격</b>입니다.": "Đánh giá tổng hợp dùng cho định cư gồm <b>trắc nghiệm 36 câu (65 điểm) + tự luận viết (10 điểm) + vấn đáp (25 điểm) = 100 điểm</b>, <b>đạt 60 điểm trở lên là đậu</b>.", "응시 자격: 사회통합프로그램 <b>5단계 기본과정 수료</b>, 또는 <b>사전평가 85점 이상 득점 후 2년 이내</b>. 영주용은 <b>지필(PBT)로만</b> 시행됩니다.": "Điều kiện dự thi: <b>hoàn thành khóa cơ bản giai đoạn 5</b> của Chương trình Hội nhập xã hội, hoặc <b>trong vòng 2 năm sau khi đạt từ 85 điểm trở lên ở đánh giá đầu vào</b>. Bài thi định cư <b>chỉ thi trên giấy (PBT)</b>.", "사회통합 사전평가": "Đánh giá đầu vào Hội nhập xã hội", "사회통합프로그램 사전평가": "Đánh giá đầu vào Chương trình Hội nhập xã hội", "단계 배정 모의평가": "Đánh giá thử để xếp giai đoạn", "어휘·문법·읽기·대화·문화·사회": "Từ vựng · ngữ pháp · đọc · hội thoại · văn hóa · xã hội", "사회통합프로그램 <b>사전평가</b>는 합격·불합격 시험이 아니라, 점수에 따라 <b>0~5단계</b>를 배정하는 레벨 평가입니다.": "<b>Đánh giá đầu vào</b> của Chương trình Hội nhập xã hội không phải kỳ thi đậu · rớt, mà là bài đánh giá phân cấp để xếp <b>giai đoạn 0~5</b> theo điểm số.", "실제 시험은 <b>필기 50문항(60분, 75점)</b> + <b>구술 5문항(10분, 25점)</b> = 100점입니다. 이 모의평가는 필기(객관식+작문)를 풀고 이어서 구술을 연습합니다.": "Kỳ thi thật gồm <b>phần viết 50 câu (60 phút, 75 điểm)</b> + <b>vấn đáp 5 câu (10 phút, 25 điểm)</b> = 100 điểm. Bài đánh giá thử này làm phần viết (trắc nghiệm + tự luận) rồi luyện tiếp phần vấn đáp.", "객관식은 ①②③④ 중 하나를 고르고, 작문은 빈칸에 알맞은 표현을 짧게 씁니다.": "Trắc nghiệm chọn một trong ①②③④, phần viết điền ngắn gọn cách diễn đạt thích hợp vào chỗ trống.", "객관식만 자동 채점되어 <b>예상 배정 단계</b>를 알려줍니다. 작문·구술은 모범답안으로 스스로 점검합니다.": "Chỉ trắc nghiệm được chấm tự động và cho biết <b>giai đoạn xếp lớp dự kiến</b>. Phần viết · vấn đáp tự kiểm tra bằng đáp án mẫu.", "실제로는 <b>구술 점수가 3점 미만이면 0단계</b>로 배정됩니다. 정확한 단계는 시험 당일 점수로 정해지며, 표시되는 단계는 <b>연습용 참고치</b>입니다.": "Trên thực tế, <b>nếu điểm vấn đáp dưới 3 điểm thì xếp giai đoạn 0</b>. Giai đoạn chính xác được quyết định theo điểm trong ngày thi, giai đoạn hiển thị chỉ là <b>giá trị tham khảo khi luyện tập</b>.", "5단계 · 한국사회이해": "Giai đoạn 5 · Hiểu biết xã hội Hàn Quốc", "81~100점": "81~100 điểm", "4단계 · 중급2": "Giai đoạn 4 · Trung cấp 2", "61~80점": "61~80 điểm", "3단계 · 중급1": "Giai đoạn 3 · Trung cấp 1", "41~60점": "41~60 điểm", "2단계 · 초급2": "Giai đoạn 2 · Sơ cấp 2", "21~40점": "21~40 điểm", "1단계 · 초급1": "Giai đoạn 1 · Sơ cấp 1", "3~20점": "3~20 điểm", "0단계 · 한국어기초": "Giai đoạn 0 · Tiếng Hàn cơ bản", "구술 3점 미만": "Vấn đáp dưới 3 điểm"};
T2.th = {"귀화 종합평가": "การประเมินรวมแปลงสัญชาติ", "사회통합프로그램 (KIIP)": "โครงการบูรณาการสังคม (KIIP)", "귀화용 종합평가": "การประเมินรวมเพื่อแปลงสัญชาติ", "필기시험 모의고사": "ข้อสอบจำลองภาคข้อเขียน", "실제 시험처럼 풀기 (객관식+작문+구술)": "ทำเหมือนสอบจริง (ปรนัย+เขียน+พูด)", "9개 영역별로 풀기": "ฝึกตาม 9 หมวด", "귀화용 종합평가는 <b>객관식 36문항(65점) + 작문형(10점) + 구술(25점) = 100점</b>, <b>60점 이상이면 합격</b>입니다.": "การประเมินรวมเพื่อแปลงสัญชาติคือ <b>ปรนัย 36 ข้อ (65 คะแนน) + เขียน (10 คะแนน) + พูด (25 คะแนน) = 100 คะแนน</b>, <b>ได้ 60 คะแนนขึ้นไปถือว่าผ่าน</b>", "이 모의고사는 <b>필기(객관식+작문)를 60분 안에</b> 풀고, 이어서 <b>구술 문항</b>까지 연습합니다.": "ข้อสอบจำลองนี้ให้ทำ <b>ภาคข้อเขียน (ปรนัย+เขียน) ภายใน 60 นาที</b> แล้วฝึก <b>ข้อสอบพูด</b> ต่อ", "객관식은 ①②③④ 중 하나를 고르고, 작문은 <b>4문제가 통합된 1문제</b>를 <b>200자 원고지 1장 이내</b>로 작성합니다.": "ปรนัยให้เลือกหนึ่งข้อจาก ①②③④ ส่วนการเขียนเป็น<b>ข้อสอบ 1 ข้อที่รวมมาจาก 4 คำถาม</b> เขียนภายใน<b>กระดาษคำตอบแบบช่อง 200 ตัวอักษร 1 แผ่น</b>", "객관식만 자동 채점되며, 작문·구술은 모범답안·도움말로 스스로 점검합니다.": "ตรวจคะแนนอัตโนมัติเฉพาะปรนัย ส่วนเขียน·พูดให้ตรวจสอบด้วยตนเองจากคำตอบตัวอย่าง·คำแนะนำ", "실제 시험의 구술은 별도 10분 세션(<b>5문항×5점</b>)입니다. 사회통합프로그램 <b>5단계 전 과정(기본+심화) 이수</b> + 합격 시 <b>귀화 면접심사가 면제</b>됩니다.": "การพูดในสอบจริงเป็นช่วงแยกต่างหาก 10 นาที (<b>5 ข้อ × 5 คะแนน</b>) เมื่อเรียนจบ<b>หลักสูตรระดับ 5 ทั้งหมด (พื้นฐาน+เชิงลึก)</b>ของโครงการบูรณาการสังคมและสอบผ่าน จะ<b>ได้รับการยกเว้นการสัมภาษณ์แปลงสัญชาติ</b>", "귀화허가 신청자는 <b>신청일로부터 1년 이내 재응시 2회</b>(최초 포함 총 3회)까지 가능하며, <b>3회 모두 불합격하면 귀화신청이 불허</b>됩니다.": "ผู้ยื่นขอแปลงสัญชาติสามารถ<b>สอบใหม่ได้ไม่เกิน 2 ครั้งภายใน 1 ปีนับจากวันยื่นคำขอ</b> (รวมครั้งแรกทั้งหมด 3 ครั้ง) หาก<b>ไม่ผ่านทั้ง 3 ครั้ง คำขอแปลงสัญชาติจะไม่ได้รับอนุมัติ</b>", "TOPIK 급수가 있으면 사전평가 없이 단계 배정이 가능합니다(<b>1급→2단계, 2급→3단계, 3급→4단계, 4급 이상→5단계</b>). 배정 단계는 <b>2년간 유효</b>하며, 사전평가에 재응시하면 이전 교육 이수 기록이 무효가 됩니다.": "หากมีระดับ TOPIK สามารถจัดระดับได้โดยไม่ต้องสอบประเมินเบื้องต้น (<b>ระดับ1→ขั้น2, ระดับ2→ขั้น3, ระดับ3→ขั้น4, ระดับ4ขึ้นไป→ขั้น5</b>) ระดับที่จัดมีผล <b>2 ปี</b> และหากสอบประเมินเบื้องต้นใหม่ ประวัติการเรียนก่อนหน้าจะถือเป็นโมฆะ", "영주 종합평가": "การประเมินรวมถิ่นที่อยู่ถาวร", "영주용 종합평가": "การประเมินรวมเพื่อถิ่นที่อยู่ถาวร", "영주용 종합평가는 <b>객관식 36문항(65점) + 작문형(10점) + 구술(25점) = 100점</b>, <b>60점 이상이면 합격</b>입니다.": "การประเมินรวมเพื่อถิ่นที่อยู่ถาวรคือ <b>ปรนัย 36 ข้อ (65 คะแนน) + เขียน (10 คะแนน) + พูด (25 คะแนน) = 100 คะแนน</b>, <b>ได้ 60 คะแนนขึ้นไปถือว่าผ่าน</b>", "응시 자격: 사회통합프로그램 <b>5단계 기본과정 수료</b>, 또는 <b>사전평가 85점 이상 득점 후 2년 이내</b>. 영주용은 <b>지필(PBT)로만</b> 시행됩니다.": "คุณสมบัติผู้สอบ: จบ<b>หลักสูตรพื้นฐานระดับ 5</b> ของโครงการบูรณาการสังคม หรืออยู่ภายใน <b>2 ปีหลังได้คะแนนประเมินเบื้องต้นตั้งแต่ 85 คะแนนขึ้นไป</b> แบบถิ่นที่อยู่ถาวรจัดสอบ <b>ด้วยกระดาษ-ปากกา (PBT) เท่านั้น</b>", "사회통합 사전평가": "การประเมินเบื้องต้นบูรณาการสังคม", "사회통합프로그램 사전평가": "การประเมินเบื้องต้นโครงการบูรณาการสังคม", "단계 배정 모의평가": "การประเมินจำลองเพื่อจัดระดับ", "어휘·문법·읽기·대화·문화·사회": "คำศัพท์·ไวยากรณ์·การอ่าน·บทสนทนา·วัฒนธรรม·สังคม", "사회통합프로그램 <b>사전평가</b>는 합격·불합격 시험이 아니라, 점수에 따라 <b>0~5단계</b>를 배정하는 레벨 평가입니다.": "<b>การประเมินเบื้องต้น</b> ของโครงการบูรณาการสังคมไม่ใช่การสอบผ่าน·ไม่ผ่าน แต่เป็นการประเมินระดับที่จัด <b>ระดับ 0~5</b> ตามคะแนน", "실제 시험은 <b>필기 50문항(60분, 75점)</b> + <b>구술 5문항(10분, 25점)</b> = 100점입니다. 이 모의평가는 필기(객관식+작문)를 풀고 이어서 구술을 연습합니다.": "สอบจริงคือ <b>ข้อเขียน 50 ข้อ (60 นาที, 75 คะแนน)</b> + <b>พูด 5 ข้อ (10 นาที, 25 คะแนน)</b> = 100 คะแนน การประเมินจำลองนี้ให้ทำภาคข้อเขียน (ปรนัย+เขียน) แล้วฝึกพูดต่อ", "객관식은 ①②③④ 중 하나를 고르고, 작문은 빈칸에 알맞은 표현을 짧게 씁니다.": "ปรนัยให้เลือกหนึ่งข้อจาก ①②③④ ส่วนการเขียนให้เติมคำที่เหมาะสมลงในช่องว่างสั้นๆ", "객관식만 자동 채점되어 <b>예상 배정 단계</b>를 알려줍니다. 작문·구술은 모범답안으로 스스로 점검합니다.": "ตรวจคะแนนอัตโนมัติเฉพาะปรนัยแล้วบอก <b>ระดับที่คาดว่าจะได้รับการจัด</b> ส่วนเขียน·พูดให้ตรวจสอบด้วยตนเองจากคำตอบตัวอย่าง", "실제로는 <b>구술 점수가 3점 미만이면 0단계</b>로 배정됩니다. 정확한 단계는 시험 당일 점수로 정해지며, 표시되는 단계는 <b>연습용 참고치</b>입니다.": "ในความเป็นจริง <b>หากคะแนนพูดต่ำกว่า 3 คะแนนจะถูกจัดเป็นระดับ 0</b> ระดับที่แน่นอนกำหนดจากคะแนนในวันสอบ ส่วนระดับที่แสดงเป็น <b>ค่าอ้างอิงสำหรับฝึกซ้อม</b>", "5단계 · 한국사회이해": "ระดับ 5 · ความเข้าใจสังคมเกาหลี", "81~100점": "81~100 คะแนน", "4단계 · 중급2": "ระดับ 4 · กลาง 2", "61~80점": "61~80 คะแนน", "3단계 · 중급1": "ระดับ 3 · กลาง 1", "41~60점": "41~60 คะแนน", "2단계 · 초급2": "ระดับ 2 · ต้น 2", "21~40점": "21~40 คะแนน", "1단계 · 초급1": "ระดับ 1 · ต้น 1", "3~20점": "3~20 คะแนน", "0단계 · 한국어기초": "ระดับ 0 · ภาษาเกาหลีพื้นฐาน", "구술 3점 미만": "พูดต่ำกว่า 3 คะแนน"};
Object.assign(I18N.ko, {
  'member.loginShort': '회원 로그인',
  'member.title': '회원 전용 콘텐츠입니다.',
  'member.desc': '회원 로그인 후 이용할 수 있습니다.',
  'member.email': '이메일',
  'member.send': '인증번호 받기',
  'member.otp': '인증번호',
  'member.login': '로그인',
  'member.logout': '로그아웃',
  'member.sent': '이메일로 인증번호를 보냈습니다.',
  'member.badOtp': '인증번호가 올바르지 않습니다.',
  'member.notMember': '등록된 회원이 아닙니다.\n결제 후 이용할 수 있습니다.',
  'member.inactive': '현재 이용할 수 없는 계정입니다.\n관리자에게 문의해 주세요.',
  'member.network': '네트워크 오류가 발생했습니다.\n다시 시도해 주세요.',
  'questions.missing': 'Supabase questions 테이블이 아직 없습니다.\nSQL Editor 에서 questions 테이블과 RLS SQL을 실행해 주세요.',
  'questions.empty': 'Supabase questions 테이블에 문항이 없습니다.\n문항 가져오기 스크립트를 실행해 주세요.',
  'questions.permission': 'Supabase questions 읽기 권한 또는 RLS 설정을 확인해 주세요.',
  'questions.loadFail': '문항을 불러오지 못했습니다.\nConsole 의 Supabase 오류를 확인해 주세요.',
  'member.config': '회원 시스템 설정이 필요합니다.',
  'member.emailReq': '이메일을 입력해 주세요.',
  'member.otpReq': '인증번호를 입력해 주세요.',
  'member.loading': '회원 정보를 확인하는 중입니다.',
  'member.ready': '회원 확인 완료',
  'sync.publicReady': '공개 목차 준비 완료 · 총 {0}문항',
  'sync.memberReady': '{0} · {1}문항 준비 완료',
});
Object.assign(I18N.zh, {
  'member.loginShort': '会员登录',
  'member.title': '会员专用内容。',
  'member.desc': '会员登录后可以使用。',
  'member.email': '邮箱',
  'member.send': '获取验证码',
  'member.otp': '验证码',
  'member.login': '登录',
  'member.logout': '退出登录',
  'member.sent': '验证码已发送到邮箱。',
  'member.badOtp': '验证码不正确。',
  'member.notMember': '不是已登记会员。\n付款后可以使用。',
  'member.inactive': '当前账号无法使用。\n请联系管理员。',
  'member.network': '发生网络错误。\n请重试。',
  'questions.missing': 'Supabase questions 表还不存在。\n请在 SQL Editor 运行 questions 表和 RLS SQL。',
  'questions.empty': 'Supabase questions 表里还没有题目。\n请运行题库导入脚本。',
  'questions.permission': '请检查 Supabase questions 的 SELECT 权限或 RLS 设置。',
  'questions.loadFail': '题目读取失败。\n请查看 Console 中的 Supabase 错误。',
  'member.config': '需要设置会员系统。',
  'member.emailReq': '请输入邮箱。',
  'member.otpReq': '请输入验证码。',
  'member.loading': '正在确认会员信息。',
  'member.ready': '会员确认完成',
  'sync.publicReady': '公开目录已准备 · 共{0}题',
  'sync.memberReady': '{0} · 共{1}题 已就绪',
});
Object.assign(I18N.vi, {
  'member.loginShort': 'Đăng nhập hội viên',
  'member.title': 'Nội dung dành cho hội viên.',
  'member.desc': 'Vui lòng đăng nhập hội viên để sử dụng.',
  'member.email': 'Email',
  'member.send': 'Nhận mã xác thực',
  'member.otp': 'Mã xác thực',
  'member.login': 'Đăng nhập',
  'member.logout': 'Đăng xuất',
  'member.sent': 'Đã gửi mã xác thực qua email.',
  'member.badOtp': 'Mã xác thực không đúng.',
  'member.notMember': 'Bạn chưa phải hội viên đã đăng ký.\nVui lòng thanh toán để sử dụng.',
  'member.inactive': 'Tài khoản hiện không thể sử dụng.\nVui lòng liên hệ quản trị viên.',
  'member.network': 'Đã xảy ra lỗi mạng.\nVui lòng thử lại.',
  'questions.missing': 'Chưa có bảng Supabase questions.\nHãy chạy SQL tạo questions và RLS trong SQL Editor.',
  'questions.empty': 'Bảng Supabase questions chưa có câu hỏi.\nHãy chạy script nhập câu hỏi.',
  'questions.permission': 'Hãy kiểm tra quyền SELECT hoặc RLS của Supabase questions.',
  'questions.loadFail': 'Không tải được câu hỏi.\nHãy xem lỗi Supabase trong Console.',
  'member.config': 'Cần thiết lập hệ thống hội viên.',
  'member.emailReq': 'Vui lòng nhập email.',
  'member.otpReq': 'Vui lòng nhập mã xác thực.',
  'member.loading': 'Đang kiểm tra hội viên.',
  'member.ready': 'Đã xác nhận hội viên',
  'sync.publicReady': 'Mục lục công khai đã sẵn sàng · tổng {0} câu',
  'sync.memberReady': '{0} · {1} câu đã sẵn sàng',
});
Object.assign(I18N.th, {
  'member.loginShort': 'เข้าสู่ระบบสมาชิก',
  'member.title': 'เนื้อหาสำหรับสมาชิกเท่านั้น',
  'member.desc': 'กรุณาเข้าสู่ระบบสมาชิกก่อนใช้งาน',
  'member.email': 'อีเมล',
  'member.send': 'รับรหัสยืนยัน',
  'member.otp': 'รหัสยืนยัน',
  'member.login': 'เข้าสู่ระบบ',
  'member.logout': 'ออกจากระบบ',
  'member.sent': 'ส่งรหัสยืนยันไปยังอีเมลแล้ว',
  'member.badOtp': 'รหัสยืนยันไม่ถูกต้อง',
  'member.notMember': 'ยังไม่ใช่สมาชิกที่ลงทะเบียน\nชำระเงินแล้วจึงใช้งานได้',
  'member.inactive': 'บัญชีนี้ไม่สามารถใช้งานได้ในขณะนี้\nกรุณาติดต่อผู้ดูแล',
  'member.network': 'เกิดข้อผิดพลาดเครือข่าย\nกรุณาลองอีกครั้ง',
  'questions.missing': 'ยังไม่มีตาราง Supabase questions\nกรุณารัน SQL สำหรับ questions และ RLS ใน SQL Editor',
  'questions.empty': 'ตาราง Supabase questions ยังไม่มีข้อสอบ\nกรุณารันสคริปต์นำเข้าข้อสอบ',
  'questions.permission': 'กรุณาตรวจสอบสิทธิ์ SELECT หรือ RLS ของ Supabase questions',
  'questions.loadFail': 'โหลดข้อสอบไม่สำเร็จ\nกรุณาดูข้อผิดพลาด Supabase ใน Console',
  'member.config': 'ต้องตั้งค่าระบบสมาชิก',
  'member.emailReq': 'กรุณากรอกอีเมล',
  'member.otpReq': 'กรุณากรอกรหัสยืนยัน',
  'member.loading': 'กำลังตรวจสอบสมาชิก',
  'member.ready': 'ตรวจสอบสมาชิกเสร็จแล้ว',
  'sync.publicReady': 'สารบัญสาธารณะพร้อมแล้ว · ทั้งหมด {0} ข้อ',
  'sync.memberReady': '{0} · {1} ข้อ พร้อมแล้ว',
});

function t(key) {
  let s = (I18N[LANG] && I18N[LANG][key]) || I18N.ko[key] || key;
  for (let i = 1; i < arguments.length; i++) s = s.replace('{' + (i - 1) + '}', arguments[i]);
  return s;
}
function catName(c) { return (LANG !== 'ko' && CAT_TR[LANG] && CAT_TR[LANG][c]) || c; }
/* 한국어 본문 + (주석 언어면) 모국어 주석을 함께 표시 */
function bi(ko, g) { return (LANG !== 'ko' && g) ? `${ko}<span class="zh">${g}</span>` : (ko || ''); }
/* 문제의 주석 필드(q_zh / q_vi / q_th …)를 현재 언어로 선택 */
function gl(q, base) { return (LANG !== 'ko' && q && q[base + '_' + LANG]) || ''; }
function glc(q, idx) { if (LANG === 'ko' || !q) return ''; const a = q['choices_' + LANG]; return (a && a[idx]) || ''; }
/* {ko, zh(+vi/th)} 객체에서 언어 선택 — vi/th는 T2 보조사전 폴백 */
function tx(o) { if (!o) return ''; if (o[LANG]) return o[LANG]; if (LANG !== 'ko' && T2[LANG] && T2[LANG][o.ko]) return T2[LANG][o.ko]; return o.ko || ''; }
/* 한국어 UI 문자열 → 현재 언어(vi/th는 T2 보조사전, ko/zh는 원문 그대로) */
function trUI(s) { return (LANG !== 'ko' && LANG !== 'zh' && T2[LANG] && T2[LANG][s]) ? T2[LANG][s] : s; }

/* =====================================================================
   시험 트랙 (종합평가 / 사전평가)
   - nat = 귀화용 종합평가(기존). pre = 사회통합 사전평가(레벨 배정).
   - 문제는 q.exam === 'pre' 이면 사전평가, 아니면 종합평가로 간주.
   ===================================================================== */
let activeExam = 'pre';
function examOf(q) { return q && q.exam === 'pre' ? 'pre' : 'nat'; }

/* 사전평가 단계 배정 기준표 (공식: kiiptest.org·법무부 안내문, 검증 완료)
   0단계는 점수 구간이 아니라 '구술 3점 미만'(필기 무관) — 객관식만으로는 판정 불가. */
const PRE_LEVELS = [
  { stage: 5, min: 81, max: 100, name: { ko: '5단계 · 한국사회이해', zh: '第5阶段 · 韩国社会理解' }, range: { ko: '81~100점', zh: '81~100分' } },
  { stage: 4, min: 61, max: 80, name: { ko: '4단계 · 중급2', zh: '第4阶段 · 中级2' }, range: { ko: '61~80점', zh: '61~80分' } },
  { stage: 3, min: 41, max: 60, name: { ko: '3단계 · 중급1', zh: '第3阶段 · 中级1' }, range: { ko: '41~60점', zh: '41~60分' } },
  { stage: 2, min: 21, max: 40, name: { ko: '2단계 · 초급2', zh: '第2阶段 · 初级2' }, range: { ko: '21~40점', zh: '21~40分' } },
  { stage: 1, min: 3, max: 20, name: { ko: '1단계 · 초급1', zh: '第1阶段 · 初级1' }, range: { ko: '3~20점', zh: '3~20分' } },
  { stage: 0, min: 0, max: 2, name: { ko: '0단계 · 한국어기초', zh: '第0阶段 · 韩语基础' }, range: { ko: '구술 3점 미만', zh: '口试不足3分' } },
];
function preLevelFor(score) { return PRE_LEVELS.find((l) => score >= l.min) || PRE_LEVELS[PRE_LEVELS.length - 1]; }

const EXAMS = {
  nat: {
    badge: { ko: '귀화 종합평가', zh: '归化综合评价' },
    coverOrg: { ko: '사회통합프로그램 (KIIP)', zh: '社会统合项目 (KIIP)' },
    coverTitle: { ko: '귀화용 종합평가', zh: '归化用综合评价' },
    coverSub: { ko: '필기시험 모의고사', zh: '笔试模拟考试' },
    mockSub: { ko: '실제 시험처럼 풀기 (객관식+작문+구술)', zh: '像真实考试一样作答（选择+写作+口试）' },
    practiceSub: { ko: '9개 영역별로 풀기', zh: '按9个领域练习' },
    noPrefix: 'KINAT',
    mock: { mc: 36, writing: 1, oral: 5, time: 60 * 60, ladder: false },
    points: { mc: 65, writing: 10, oral: 25 },
    grading: 'passfail',
    notices: {
      ko: [
        '귀화용 종합평가는 <b>객관식 36문항(65점) + 작문형(10점) + 구술(25점) = 100점</b>, <b>60점 이상이면 합격</b>입니다.',
        '이 모의고사는 <b>필기(객관식+작문)를 60분 안에</b> 풀고, 이어서 <b>구술 문항</b>까지 연습합니다.',
        '객관식은 ①②③④ 중 하나를 고르고, 작문은 <b>4문제가 통합된 1문제</b>를 <b>200자 원고지 1장 이내</b>로 작성합니다.',
        '객관식만 자동 채점되며, 작문·구술은 모범답안·도움말로 스스로 점검합니다.',
        '실제 시험의 구술은 별도 10분 세션(<b>5문항×5점</b>)입니다. 사회통합프로그램 <b>5단계 전 과정(기본+심화) 이수</b> + 합격 시 <b>귀화 면접심사가 면제</b>됩니다.',
        '귀화허가 신청자는 <b>신청일로부터 1년 이내 재응시 2회</b>(최초 포함 총 3회)까지 가능하며, <b>3회 모두 불합격하면 귀화신청이 불허</b>됩니다.',
      ],
      zh: [
        '归化用综合评价为 <b>选择题36题(65分) + 写作(10分) + 口试(25分) = 100分</b>，<b>60分以上合格</b>。',
        '本模拟考试 <b>笔试(选择题+写作)在60分钟内</b>完成，随后继续练习<b>口试题</b>。',
        '选择题从①②③④中选一个；写作为<b>4题合并成的1道题</b>，在<b>200字稿纸1页以内</b>作答。',
        '仅选择题自动评分；写作·口试以参考答案·提示自我检查。',
        '真实考试的口试为单独的10分钟环节（<b>5题×5分</b>）。修完社会统合项目<b>第5阶段全部课程（基本+深化）</b>并合格时，<b>免除归化面试审查</b>。',
        '归化许可申请人自<b>申请日起1年内最多可再应试2次</b>（含首次共3次），<b>3次均不合格时归化申请将不被许可</b>。',
      ],
    },
  },
  perm: {
    badge: { ko: '영주 종합평가', zh: '永居综合评价' },
    coverOrg: { ko: '사회통합프로그램 (KIIP)', zh: '社会统合项目 (KIIP)' },
    coverTitle: { ko: '영주용 종합평가', zh: '永居用综合评价' },
    coverSub: { ko: '필기시험 모의고사', zh: '笔试模拟考试' },
    mockSub: { ko: '실제 시험처럼 풀기 (객관식+작문+구술)', zh: '像真实考试一样作答（选择+写作+口试）' },
    practiceSub: { ko: '9개 영역별로 풀기', zh: '按9个领域练习' },
    noPrefix: 'KIPRAT',
    mock: { mc: 36, writing: 1, oral: 5, time: 60 * 60, ladder: false },
    points: { mc: 65, writing: 10, oral: 25 },
    grading: 'passfail',
    notices: {
      ko: [
        '영주용 종합평가는 <b>객관식 36문항(65점) + 작문형(10점) + 구술(25점) = 100점</b>, <b>60점 이상이면 합격</b>입니다.',
        '이 모의고사는 <b>필기(객관식+작문)를 60분 안에</b> 풀고, 이어서 <b>구술 문항</b>까지 연습합니다.',
        '객관식은 ①②③④ 중 하나를 고르고, 작문은 <b>4문제가 통합된 1문제</b>를 <b>200자 원고지 1장 이내</b>로 작성합니다.',
        '객관식만 자동 채점되며, 작문·구술은 모범답안·도움말로 스스로 점검합니다.',
        '응시 자격: 사회통합프로그램 <b>5단계 기본과정 수료</b>, 또는 <b>사전평가 85점 이상 득점 후 2년 이내</b>. 영주용은 <b>지필(PBT)로만</b> 시행됩니다.',
      ],
      zh: [
        '永居用综合评价为 <b>选择题36题(65分) + 写作(10分) + 口试(25分) = 100分</b>，<b>60分以上合格</b>。',
        '本模拟考试 <b>笔试(选择题+写作)在60分钟内</b>完成，随后继续练习<b>口试题</b>。',
        '选择题从①②③④中选一个；写作为<b>4题合并成的1道题</b>，在<b>200字稿纸1页以内</b>作答。',
        '仅选择题自动评分；写作·口试以参考答案·提示自我检查。',
        '应试资格：修完社会统合项目<b>第5阶段基本课程</b>，或<b>事前评价获得85分以上后2年以内</b>。永居用仅以<b>纸笔(PBT)</b>形式进行。',
      ],
    },
  },
  pre: {
    badge: { ko: '사회통합 사전평가', zh: '社会统合事前评价' },
    coverOrg: { ko: '사회통합프로그램 (KIIP)', zh: '社会统合项目 (KIIP)' },
    coverTitle: { ko: '사회통합프로그램 사전평가', zh: '社会统合项目 事前评价' },
    coverSub: { ko: '단계 배정 모의평가', zh: '级别分配模拟评价' },
    mockSub: { ko: '실제 시험처럼 풀기 (객관식+작문+구술)', zh: '像真实考试一样作答（选择+写作+口试）' },
    practiceSub: { ko: '어휘·문법·읽기·대화·문화·사회', zh: '词汇·语法·阅读·对话·文化·社会' },
    noPrefix: 'KIIP',
    mock: { mc: 48, writing: 2, oral: 5, time: 60 * 60, ladder: true },
    points: { mc: 72, writing: 3, oral: 25 },
    grading: 'level',
    notices: {
      ko: [
        '사회통합프로그램 <b>사전평가</b>는 합격·불합격 시험이 아니라, 점수에 따라 <b>0~5단계</b>를 배정하는 레벨 평가입니다.',
        '실제 시험은 <b>필기 50문항(60분, 75점)</b> + <b>구술 5문항(10분, 25점)</b> = 100점입니다. 이 모의평가는 필기(객관식+작문)를 풀고 이어서 구술을 연습합니다.',
        '객관식은 ①②③④ 중 하나를 고르고, 작문은 빈칸에 알맞은 표현을 짧게 씁니다.',
        '객관식만 자동 채점되어 <b>예상 배정 단계</b>를 알려줍니다. 작문·구술은 모범답안으로 스스로 점검합니다.',
        '실제로는 <b>구술 점수가 3점 미만이면 0단계</b>로 배정됩니다. 정확한 단계는 시험 당일 점수로 정해지며, 표시되는 단계는 <b>연습용 참고치</b>입니다.',
        'TOPIK 급수가 있으면 사전평가 없이 단계 배정이 가능합니다(<b>1급→2단계, 2급→3단계, 3급→4단계, 4급 이상→5단계</b>). 배정 단계는 <b>2년간 유효</b>하며, 사전평가에 재응시하면 이전 교육 이수 기록이 무효가 됩니다.',
      ],
      zh: [
        '社会统合项目 <b>事前评价</b>不是合格/不合格考试，而是根据分数分配 <b>0~5阶段</b>的级别测试。',
        '真实考试为 <b>笔试50题(60分钟, 75分)</b> + <b>口试5题(10分钟, 25分)</b> = 100分。本模拟评价完成笔试(选择题+写作)后继续练习口试。',
        '选择题从①②③④中选一个，写作在空格处简短填写恰当的表达。',
        '仅选择题自动评分并给出 <b>预计分配阶段</b>；写作·口试以参考答案自我检查。',
        '实际上 <b>口试不足3分则分配到0阶段</b>。准确阶段以考试当天分数为准，显示的阶段为 <b>练习参考值</b>。',
        '持有TOPIK等级者可不经事前评价直接分配阶段（<b>1级→2阶段，2级→3阶段，3级→4阶段，4级以上→5阶段</b>）。分配的阶段自分配日起<b>2年有效</b>；若重新参加事前评价，之前的教育履修记录将失效。',
      ],
    },
  },
};
function exam() { return EXAMS[activeExam]; }
/* 시험별로 분리 저장할 키(종합평가=기존 키 그대로, 사전평가=__pre 접미사) */
function ekey(base) { return activeExam === 'nat' ? base : base + '__' + activeExam; }

/* ---------- 상태 ---------- */
let BANK = [];
let CATALOG = null;
let META = { version: '-', syncedAt: null };
let quiz = null;
let writingType = 'writing';
let currentView = 'home';
let lastResult = null;
let mockSelfGrade = {}; // 모의고사 작문·구술 자가채점(qid → 0/0.5/1)
let swReg = null;
let pendingMemberAction = null;
let memberReady = false;
let bankFullyLoaded = false;
let writingViewList = [];
let writingViewKey = '';

/* ---------- 유틸 ---------- */
const $ = (id) => document.getElementById(id);
const NUM = ['①', '②', '③', '④', '⑤'];
function ls(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function escHtml(s) { return String(s || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function toast(msg, ms = 2200) { const t0 = $('toast'); t0.textContent = msg; t0.classList.remove('hidden'); clearTimeout(toast._t); toast._t = setTimeout(() => t0.classList.add('hidden'), ms); }
function fmtDate(iso) { if (!iso) return t('noSync'); const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }
function memberStatus() { return window.GwiwhaMembership ? window.GwiwhaMembership.getStatus() : { configured: false, active: false, signedIn: false, reason: 'not_configured' }; }
function isActiveMember() { return !!memberStatus().active; }
function clearSensitiveLocalData() {
  const marker = 'nq_sensitive_migrated_v1';
  try { if (localStorage.getItem(marker) === '1') return; } catch {}
  [K.bank, K.meta, K.mockSave, K.practiceSave].forEach((key) => {
    try { localStorage.removeItem(key); } catch {}
    ['__pre', '__perm'].forEach((suffix) => { try { localStorage.removeItem(key + suffix); } catch {} });
  });
  try { localStorage.setItem(marker, '1'); } catch {}
}
function clearMemberCaches() {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    try { navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_MEMBER_CACHE' }); } catch {}
  }
}
function catalogExam(key = activeExam) {
  return CATALOG && CATALOG.exams && CATALOG.exams[key] ? CATALOG.exams[key] : { total: 0, mc: 0, writing: 0, oral: 0, categories: [] };
}
function catalogMcCount() { return bankFullyLoaded && BANK.length ? mcOnly().length : catalogExam().mc; }
function catalogTotalCount() { return bankFullyLoaded && BANK.length ? examBank().length : catalogExam().total; }
function qById(id) { return BANK.find((q) => q.id === id); }
/* 트랙별 문제 풀: 영주용(perm)도 귀화용(nat)과 같은 종합평가 풀을 쓰되,
   심화(tier:advanced) 문항은 귀화용에만 포함(영주=기본과정, 귀화=기본+심화). */
const poolOf = (ex) => (ex === 'pre' ? 'pre' : 'nat');
function inExam(q) { return examOf(q) === poolOf(activeExam) && !(activeExam === 'perm' && q.tier === 'advanced'); }

/* 지금 고른 시험에 실제로 나오는 문항 수.
   BANK 에는 세 트랙이 다 들어 있다. 총합을 보여 주면 영주용을 골라 놓고도
   사전평가 문항까지 센 숫자를 보게 되어 학습자가 오해한다. */
function bankExamCount() { return BANK.filter(inExam).length; }
const examBank = () => BANK.filter(inExam);
const mcOnly = () => examBank().filter((q) => q.type === 'mc');
const byType = (ty) => examBank().filter((q) => q.type === ty);
function currentQuestionFilters(extra = {}) {
  const filters = Object.assign({ exam: poolOf(activeExam) }, extra);
  if (activeExam === 'perm') filters.excludeAdvanced = true;
  return filters;
}
async function fetchMemberQuestions(extra = {}) {
  if (!window.GwiwhaMembership) throw new Error('not_configured');
  const list = await window.GwiwhaMembership.fetchQuestions(currentQuestionFilters(extra));
  return list.filter(inExam);
}
function handleQuestionLoadFailure(error, silent = false) {
  console.error('[Gwiwha] Failed to load Supabase questions', error);
  const msg = questionLoadErrorMessage(error);
  setSyncStatus(msg, true);
  if (!silent) toast(msg, 4200);
}
async function loadExerciseQuestions(filters, { silent = false } = {}) {
  try {
    return await fetchMemberQuestions(filters);
  } catch (e) {
    handleQuestionLoadFailure(e, silent);
    return [];
  }
}

/* =====================================================================
   공유 비밀번호 잠금
   - 링크와 비밀번호를 함께 받은 사람만 앱을 쓰게 하는 초대 장치다.
   - 한 번 맞히면 그 기기는 계속 기억한다(비밀번호를 바꾸면 모두 다시 묻는다).
   - 이것은 유료 콘텐츠 보호가 아니다. 홈과 공개 목차 진입만 허용한다.
   - 실제 문제 읽기는 Supabase Auth + members + RLS 가 담당한다.
   ===================================================================== */
const GATE_KEY = 'nq_gate';
const GATE_HASH = '114c7254931234f33ea9796f12d2add601b4a235be570ff587826bad4915c935';
const GATE_ALT = 'Z3dpaHVh'; // crypto.subtle 이 없는 환경(file:// 등) 대비

async function gateOk(v) {
  const s = (v || '').trim();
  if (!s) return false;
  if (window.crypto && crypto.subtle && window.isSecureContext) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('') === GATE_HASH;
    } catch {}
  }
  try { return btoa(s) === GATE_ALT; } catch { return false; }
}
function gateUnlocked() { try { return localStorage.getItem(GATE_KEY) === GATE_HASH; } catch { return false; } }
function gateOpen() { const el = $('gate'); if (el) el.classList.add('hidden'); }
/* 스크립트가 읽히는 즉시 판단해 이미 푼 기기에는 잠금 화면이 비치지 않게 한다 */
if (gateUnlocked()) gateOpen();

function wireGate() {
  const form = $('gateForm');
  const input = $('gateInput');
  const err = $('gateErr');
  if (!form || !input) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await gateOk(input.value)) {
      try { localStorage.setItem(GATE_KEY, GATE_HASH); } catch {}
      err.classList.add('hidden');
      gateOpen();
    } else {
      err.classList.remove('hidden');
      input.value = '';
      input.focus();
    }
  });
  if (!gateUnlocked()) setTimeout(() => input.focus(), 60);
}

/* =====================================================================
   초기화
   ===================================================================== */
async function init() {
  clearSensitiveLocalData();
  wireGate();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // 새 버전 적용은 서비스워커(activate 시 창 자동 새로고침)가 담당
    navigator.serviceWorker.register('sw.js').then((reg) => { swReg = reg; }).catch(() => {});
  }
  const savedLang = ls(K.lang, null);
  LANG = savedLang || 'ko';
  activeExam = ls(K.exam, 'pre');
  loadCatalogFromStorage();
  applyStaticI18n();
  applyExamUi();
  wireEvents();
  wireMemberUi();
  renderMemberStatus();
  showView('home');
  renderHome();
  if (savedLang === null) openLangPicker();   // 첫 실행: 국가/언어(주석) 선택
  await loadCatalog({ silent: true });
  if (window.GwiwhaMembership) {
    window.GwiwhaMembership.onChange(onMembershipChange);
    window.GwiwhaMembership.init().then(async () => {
      memberReady = true;
      renderMemberStatus();
      renderHome();
    });
  } else {
    memberReady = true;
    renderMemberStatus();
  }
}

function loadCatalogFromStorage() {
  const cached = ls(K.catalog, null);
  if (cached && cached.exams) CATALOG = cached;
  META = { version: (CATALOG && CATALOG.version) || '-', syncedAt: null };
}

/* ---------- 다국어 적용 ---------- */
function applyStaticI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  // 언어 버튼: 현재 언어 표식(국기)만 — 영어 단어 하드코딩 제거
  $('langBtn').textContent = LANG_LABEL[LANG] || '🌐';
}
function setLang(lang) {
  if (!LANG_LABEL[lang]) return;
  LANG = lang; save(K.lang, lang);
  applyStaticI18n();
  applyExamUi();
  refreshView();
}
/* 국가/언어 선택 화면(splash) — 첫 실행 시, 또는 상단 언어 버튼으로 다시 열기 */
function openLangPicker() { const el = $('langSplash'); if (el) el.classList.remove('hidden'); }
function chooseLang(lang) { const el = $('langSplash'); if (el) el.classList.add('hidden'); setLang(lang); }

/* ---------- 시험 트랙 UI 반영 / 전환 ---------- */
function applyExamUi() {
  document.querySelectorAll('#trackSeg .seg__btn').forEach((b) => b.classList.toggle('seg__btn--active', b.dataset.exam === activeExam));
  const titleEl = document.querySelector('.appbar__title');
  if (titleEl) titleEl.textContent = tx(exam().badge);
  const mockSub = document.querySelector('[data-go="mock"] .menu-card__sub');
  if (mockSub) mockSub.textContent = tx(exam().mockSub);
  const prSub = document.querySelector('[data-go="practice"] .menu-card__sub');
  if (prSub) prSub.textContent = tx(exam().practiceSub);
}
function setExam(key) {
  if (key === activeExam || !EXAMS[key]) return;
  showView('home');        // 진행 중인 모의고사가 있으면 현재 트랙 키로 저장 후 타이머 정지
  quiz = null; lastResult = null;
  activeExam = key; save(K.exam, key);
  applyExamUi();
  renderHome();
  toast(tx(exam().badge));
}
function refreshView() {
  if (currentView === 'home') renderHome();
  else if (currentView === 'examintro') { renderExamIntro(); const s = getMockSave(); const btn = $('examResumeBtn'); if (s) btn.textContent = t('exam.resume', s.i + 1, s.list.length); }
  else if (currentView === 'practice') renderCategories();
  else if (currentView === 'quiz' && quiz) renderQuestion();
  else if (currentView === 'writing') renderWriting();
  else if (currentView === 'wrong') renderWrong();
  else if (currentView === 'stats') renderStats();
  else if (currentView === 'result' && lastResult) renderResult(lastResult.list, lastResult.answers, lastResult.correct, lastResult.opts);
}

/* =====================================================================
   동기화
   ===================================================================== */
async function loadCatalog({ silent = false } = {}) {
  try {
    const res = await fetch('question-catalog.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || !data.exams) throw new Error('catalog format');
    CATALOG = data;
    save(K.catalog, CATALOG);
    META = { version: CATALOG.version || '?', syncedAt: null };
    setSyncStatus(t('sync.publicReady', catalogTotalCount()), false);
    renderHome();
    return CATALOG;
  } catch (e) {
    if (CATALOG) {
      setSyncStatus(t('sync.publicReady', catalogTotalCount()), false);
      return CATALOG;
    }
    CATALOG = {
      version: FALLBACK.version,
      exams: { pre: { total: 0, mc: 0, writing: 0, oral: 0, categories: [] }, perm: { total: 0, mc: 0, writing: 0, oral: 0, categories: [] }, nat: { total: 0, mc: 0, writing: 0, oral: 0, categories: [] } },
    };
    if (!silent) toast(t('toast.syncFail'));
    setSyncStatus(t('sync.first'), true);
    return CATALOG;
  }
}

async function ensureMemberBank({ silent = false, force = false } = {}) {
  const st = window.GwiwhaMembership ? await window.GwiwhaMembership.refreshStatus() : memberStatus();
  if (!st.active) {
    BANK = [];
    bankFullyLoaded = false;
    if (!silent) showMemberRequired(st.reason);
    return false;
  }
  if (bankFullyLoaded && BANK.length && !force) return true;
  try {
    if (!silent) toast(t('toast.syncing'));
    const list = await window.GwiwhaMembership.fetchQuestions();
    if (!Array.isArray(list) || !list.length) {
      const err = new Error('empty question bank');
      err.code = 'EMPTY_QUESTION_BANK';
      throw err;
    }
    BANK = list;
    bankFullyLoaded = true;
    META = { version: (CATALOG && CATALOG.version) || 'Supabase', syncedAt: new Date().toISOString() };
    setSyncStatus(t('sync.memberReady', t('track.' + activeExam), bankExamCount()), false);
    if (!silent) toast(t('toast.syncDone', BANK.length));
    renderHome();
    return true;
  } catch (e) {
    console.error('[Gwiwha] Failed to load Supabase questions', e);
    BANK = [];
    bankFullyLoaded = false;
    const msg = questionLoadErrorMessage(e);
    setSyncStatus(msg, true);
    if (!silent) toast(msg, 4200);
    return false;
  }
}

function questionLoadErrorMessage(error) {
  const code = String((error && error.code) || '');
  const message = String((error && error.message) || '').toLowerCase();
  if (code === 'PGRST205' || message.includes("could not find the table 'public.questions'")) return t('questions.missing');
  if (code === 'EMPTY_QUESTION_BANK') return t('questions.empty');
  if (code === '42501' || message.includes('permission denied') || message.includes('row-level security')) return t('questions.permission');
  return t('questions.loadFail');
}

async function sync({ silent = false } = {}) {
  const btn = $('syncBtn');
  btn.classList.add('is-syncing');
  if (swReg) { try { swReg.update(); } catch (e) {} } // 동기화 시 앱(서비스워커) 업데이트도 점검
  try {
    await loadCatalog({ silent: true });
    if (isActiveMember()) await ensureMemberBank({ silent, force: true });
    else {
      BANK = [];
      bankFullyLoaded = false;
      setSyncStatus(t('sync.publicReady', catalogTotalCount()), false);
      if (!silent) toast(t('sync.publicReady', catalogTotalCount()));
      renderHome();
    }
  } catch (e) {
    setSyncStatus(t('sync.first'), true);
    if (!silent) toast(t('toast.syncFail'));
  } finally { btn.classList.remove('is-syncing'); }
}
function setSyncStatus(text, isError) { const el = $('syncStatus'); el.textContent = text; el.classList.toggle('is-error', !!isError); }

/* =====================================================================
   화면 전환
   ===================================================================== */
const VIEWS = ['home', 'practice', 'examintro', 'quiz', 'writing', 'result', 'wrong', 'stats'];
function showView(name) {
  currentView = name;
  stopSpeak(); // G: 화면을 옮기면 읽어 주던 음성을 멈춘다
  VIEWS.forEach((v) => $('view-' + v).classList.toggle('hidden', v !== name));
  if (name !== 'quiz') {
    document.body.classList.remove('exam-mode');
    // 퀴즈를 벗어나면(예: 홈으로) 진행 상황 저장 후 타이머 정지(중복 방지)
    if (quiz && quiz.timer) { saveMockProgress(); clearInterval(quiz.timer); quiz.timer = null; }
  }
  window.scrollTo(0, 0);
}

/* =====================================================================
   회원 로그인 / 권한
   ===================================================================== */
function memberReasonMessage(reason) {
  if (reason === 'not_configured') return t('member.config');
  if (reason === 'invalid_otp') return t('member.badOtp');
  if (reason === 'not_member') return t('member.notMember');
  if (reason === 'inactive') return t('member.inactive');
  if (reason === 'email_required') return t('member.emailReq');
  if (reason === 'otp_required') return t('member.otpReq');
  if (reason === 'network') return t('member.network');
  return t('member.desc');
}
function setMemberMessage(msg, kind) {
  const el = $('memberMessage');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('is-error', kind === 'error');
  el.classList.toggle('is-ok', kind === 'ok');
}
function openMemberModal(reason) {
  const st = memberStatus();
  const modal = $('memberModal');
  if (!modal) return;
  const emailInput = $('memberEmail');
  if (emailInput && st.email) emailInput.value = st.email;
  modal.classList.remove('hidden');
  $('memberLogoutBtn').classList.toggle('hidden', !st.signedIn);
  setMemberMessage(reason ? memberReasonMessage(reason) : '', reason ? 'error' : '');
  setTimeout(() => {
    const target = st.signedIn ? $('memberOtp') : $('memberEmail');
    if (target) target.focus();
  }, 60);
}
function closeMemberModal() {
  const modal = $('memberModal');
  if (modal) modal.classList.add('hidden');
  setMemberMessage('', '');
}
function showMemberRequired(reason) {
  openMemberModal(reason || memberStatus().reason || 'not_signed_in');
}
async function requireMembership(action, options = {}) {
  const st = window.GwiwhaMembership ? await window.GwiwhaMembership.refreshStatus() : memberStatus();
  renderMemberStatus();
  const runAction = async () => {
    if (options.loadBank) {
      const ok = await ensureMemberBank({ silent: true });
      if (!ok) return false;
    }
    if (typeof action === 'function') await action();
    return true;
  };
  if (st.active) {
    return runAction();
  }
  pendingMemberAction = action ? runAction : null;
  showMemberRequired(st.reason);
  return false;
}
async function runPendingMemberAction() {
  const action = pendingMemberAction;
  pendingMemberAction = null;
  if (typeof action === 'function') await action();
}
function onMembershipChange(st) {
  renderMemberStatus();
  if (!st.active) {
    BANK = [];
    bankFullyLoaded = false;
    writingViewList = [];
    writingViewKey = '';
    clearMemberCaches();
    META = { version: (CATALOG && CATALOG.version) || '-', syncedAt: null };
    if (['quiz', 'writing', 'wrong', 'result'].includes(currentView)) {
      quiz = null;
      showView('home');
      renderHome();
    }
  }
}
function memberIconSvg() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>';
}
function closeMemberAccountMenu() {
  const menu = $('memberAccountMenu');
  const btn = $('memberTopBtn');
  if (menu) menu.classList.add('hidden');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
async function signOutMemberUi() {
  if (window.GwiwhaMembership) await window.GwiwhaMembership.signOut();
  BANK = [];
  bankFullyLoaded = false;
  writingViewList = [];
  writingViewKey = '';
  clearMemberCaches();
  pendingMemberAction = null;
  closeMemberModal();
  closeMemberAccountMenu();
  renderMemberStatus();
  renderHome();
}
function renderMemberStatus() {
  const box = $('memberStatus');
  if (!box) return;
  const st = memberStatus();
  const icon = `<span class="member-chip__avatar">${memberIconSvg()}</span>`;
  if (st.signedIn) {
    const email = escHtml(st.email || '');
    const state = escHtml(st.active ? t('member.ready') : memberReasonMessage(st.reason));
    box.innerHTML =
      `<button type="button" class="member-chip member-chip--signed" id="memberTopBtn" aria-haspopup="menu" aria-expanded="false" title="${email}">${icon}<span class="member-chip__email">${email}</span></button>` +
      `<div class="member-menu hidden" id="memberAccountMenu" role="menu">` +
      `<div class="member-menu__email">${email}</div>` +
      `<div class="member-menu__state">${state}</div>` +
      `<button type="button" class="btn btn--ghost member-menu__logout" id="memberMenuLogoutBtn" role="menuitem">${t('member.logout')}</button>` +
      `</div>`;
  } else {
    const label = escHtml(t('member.loginShort'));
    box.innerHTML = `<button type="button" class="member-chip member-chip--icon" id="memberTopBtn" aria-label="${label}" title="${label}">${icon}</button>`;
  }
  const btn = $('memberTopBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = memberStatus();
      if (cur.signedIn) {
        const menu = $('memberAccountMenu');
        const open = menu && menu.classList.contains('hidden');
        if (menu) menu.classList.toggle('hidden', !open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      } else openMemberModal(cur.configured ? '' : 'not_configured');
    });
  }
  const logout = $('memberMenuLogoutBtn');
  if (logout) logout.addEventListener('click', (e) => { e.stopPropagation(); signOutMemberUi(); });
}
function wireMemberUi() {
  const cancel = $('memberCancelBtn');
  if (cancel) cancel.addEventListener('click', () => { pendingMemberAction = null; closeMemberModal(); });
  const modal = $('memberModal');
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) { pendingMemberAction = null; closeMemberModal(); } });
  document.addEventListener('click', (e) => {
    const box = $('memberStatus');
    if (box && !box.contains(e.target)) closeMemberAccountMenu();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMemberAccountMenu(); });
  const send = $('memberSendOtpBtn');
  if (send) send.addEventListener('click', async () => {
    if (!window.GwiwhaMembership) { setMemberMessage(t('member.config'), 'error'); return; }
    send.disabled = true;
    setMemberMessage(t('member.loading'), '');
    const res = await window.GwiwhaMembership.sendOtp($('memberEmail').value);
    send.disabled = false;
    if (res.ok) {
      $('memberEmail').value = res.email;
      setMemberMessage(t('member.sent'), 'ok');
      $('memberOtp').focus();
    } else setMemberMessage(memberReasonMessage(res.reason), 'error');
  });
  const form = $('memberOtpForm');
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!window.GwiwhaMembership) { setMemberMessage(t('member.config'), 'error'); return; }
    $('memberVerifyBtn').disabled = true;
    setMemberMessage(t('member.loading'), '');
    const res = await window.GwiwhaMembership.verifyOtp($('memberEmail').value, $('memberOtp').value);
    $('memberVerifyBtn').disabled = false;
    renderMemberStatus();
    if (!res.ok) {
      const reason = res.status ? res.status.reason : res.reason;
      setMemberMessage(memberReasonMessage(reason), 'error');
      return;
    }
    setMemberMessage(t('member.ready'), 'ok');
    closeMemberModal();
    await runPendingMemberAction();
  });
  const logout = $('memberLogoutBtn');
  if (logout) logout.addEventListener('click', signOutMemberUi);
}

/* =====================================================================
   홈
   ===================================================================== */
function renderHome() {
  $('wrongCount').textContent = t('wrongCount', wrongCount());
  const mc = catalogMcCount();
  $('bankInfo').textContent = t('bankInfo', META.version, mc, fmtDate(META.syncedAt));
  if (isActiveMember() && bankFullyLoaded && BANK.length) setSyncStatus(t('sync.memberReady', t('track.' + activeExam), bankExamCount()), false);
  else setSyncStatus(t('sync.publicReady', catalogTotalCount()), false);

  renderExamDate();

  // 진행 중인 모의고사 이어풀기 배너
  const s = getMockSave();
  const rb = $('resumeBanner');
  if (s) { rb.textContent = t('resume.banner', s.i + 1, s.list.length); rb.classList.remove('hidden'); }
  else rb.classList.add('hidden');
}

/* =====================================================================
   A3. 시험일 카운트다운·페이싱 (트랙별 저장키 nq_examdate + ekey)
   ===================================================================== */
function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T00:00:00'); target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}
/* 하루 권장 문항수 = ceil((미풀이 MC + 오답노트 수) / 남은 일수), 최소 10 */
function pacePerDay(daysLeft) {
  const s = ls(ekey(K.stats), { total: 0, correct: 0, cat: {} });
  const donePer = s.cat ? Object.values(s.cat).reduce((a, c) => a + (c.t || 0), 0) : 0;
  const totalMc = catalogMcCount();
  const remaining = Math.max(0, totalMc - donePer) + wrongCount();
  const per = Math.ceil(remaining / Math.max(1, daysLeft));
  return { per: Math.max(10, per), remaining };
}
function renderExamDate() {
  const card = $('examDateCard'); if (!card) return;
  const iso = ls(ekey(K.examdate), '') || '';
  const input = $('examDateInput'); if (input) input.value = iso;
  const info = $('examDateInfo');
  const clearBtn = $('examDateClear');
  if (clearBtn) clearBtn.classList.toggle('hidden', !iso);
  if (!iso) { if (info) info.innerHTML = `<span class="examdate-hint">${t('examdate.hint')}</span>`; return; }
  const d = daysUntil(iso);
  if (d < 0) { if (info) info.innerHTML = `<span class="examdate-past">${t('examdate.past')}</span>`; return; }
  const dLabel = d === 0 ? t('examdate.today') : t('examdate.dday', d);
  const { per } = pacePerDay(Math.max(1, d));
  if (info) info.innerHTML =
    `<span class="examdate-dday">${dLabel}</span>` +
    `<span class="examdate-pace">${t('examdate.pace', per)}</span>`;
}
function setExamDate(iso) { save(ekey(K.examdate), iso || ''); renderExamDate(); }
function clearExamDate() { try { localStorage.removeItem(ekey(K.examdate)); } catch {} renderExamDate(); }

/* =====================================================================
   영역별 연습
   ===================================================================== */
function renderCategories() {
  // 진행 중인 연습 이어풀기 배너
  const s = getPracticeSave();
  const rb = $('practiceResume');
  if (s) { const lab = s.label ? catName(s.label) : t('practice.allLabel'); rb.textContent = t('resume.practice', lab, s.i + 1, s.list.length); rb.classList.remove('hidden'); }
  else rb.classList.add('hidden');

  const cats = {};
  if (bankFullyLoaded && BANK.length) mcOnly().forEach((q) => { cats[q.category] = (cats[q.category] || 0) + 1; });
  else (catalogExam().categories || []).forEach((c) => { if (c.mc) cats[c.category] = c.mc; });
  const wrap = $('categoryList');
  wrap.innerHTML = '';
  // A5: 약점 우선 모드 — 영역별 오답률 가중 무작위 출제
  const weakCard = catItem(t('practice.weak'), catalogMcCount(), () => startPracticeAll(true), t('practice.weakSub'));
  weakCard.classList.add('cat-item--weak');
  wrap.appendChild(weakCard);
  wrap.appendChild(catItem(t('practice.all'), catalogMcCount(), () => startPracticeAll(false)));
  sortCats(Object.keys(cats)).forEach((c) => {
    wrap.appendChild(catItem(catName(c), cats[c], () => startPracticeCategory(c)));
  });
}
/* 영역 카드 순서 — 문제은행에 처음 나온 순서가 아니라 교재 영역 순서로 보여 준다 */
const CAT_ORDER = ['한국어', '어휘', '문법', '읽기·이해', '대화',
  '사회', '한국사회', '교육', '문화', '한국문화', '정치', '경제', '법', '역사', '지리'];
function sortCats(list) {
  const rank = (c) => { const i = CAT_ORDER.indexOf(c); return i < 0 ? CAT_ORDER.length : i; };
  return list.slice().sort((a, b) => rank(a) - rank(b));
}
/* A5: 영역별 오답률(가중치 = 1 + 오답률×3, 기록 없으면 1)로 가중 무작위 정렬 */
function weakPriorityOrder(list) {
  const s = ls(ekey(K.stats), { total: 0, correct: 0, cat: {} });
  const wrongRate = (cat) => {
    const c = s.cat && s.cat[cat];
    if (!c || !c.t) return 0;
    return 1 - (c.c || 0) / c.t;
  };
  // 각 문항에 (가중치 × 난수) 키를 부여해 내림차순 정렬 → 가중 셔플
  return list.map((q) => {
    const w = 1 + wrongRate(q.category) * 3;
    return { q, key: Math.pow(Math.random(), 1 / w) };
  }).sort((a, b) => b.key - a.key).map((x) => x.q);
}
/* 통계 화면에서 "이 영역만 연습" 진입 */
function practiceCategory(cat) {
  startPracticeCategory(cat);
}
function startPracticeAll(weak) {
  requireMembership(async () => {
    const pool = await loadExerciseQuestions({ type: 'mc' });
    const list = weak ? weakPriorityOrder(pool) : shuffle(pool);
    if (!list.length) { toast(t('toast.noQ')); return; }
    startQuiz(list, 'practice');
  });
}
function startPracticeCategory(cat) {
  requireMembership(async () => {
    const pool = await loadExerciseQuestions({ type: 'mc', category: cat });
    const list = shuffle(pool);
    if (!list.length) { toast(t('toast.noQ')); return; }
    startQuiz(list, 'practice');
  });
}
function catItem(name, count, onClick, sub) {
  const el = document.createElement('button');
  el.className = 'cat-item';
  const nameHtml = sub
    ? `<span class="cat-item__name"><span class="cat-item__label">${name}</span><span class="cat-item__sub">${sub}</span></span>`
    : `<span>${name}</span>`;
  el.innerHTML = `${nameHtml}<span class="cat-item__count">${t('cat.count', count)}</span>`;
  el.addEventListener('click', onClick);
  return el;
}

/* =====================================================================
   퀴즈 엔진
   ===================================================================== */
function startQuiz(questions, mode, resume) {
  if (!questions.length) { toast(t('toast.noQ')); return; }
  quiz = {
    mode, list: questions,
    i: resume ? resume.i : 0,
    answers: resume ? resume.answers : new Array(questions.length).fill(null),
    text: resume ? (resume.text || {}) : {},
    graded: mode === 'practice' || mode === 'wrong',
    order: {}, // A1: 보기 표시 순서(표시위치→원본인덱스), 문항별 지연 생성
    timer: null,
    timeLeft: resume ? resume.timeLeft : exam().mock.time,
  };
  showView('quiz');
  const isMock = mode === 'mock';
  document.body.classList.toggle('exam-mode', isMock);
  $('examBanner').classList.toggle('hidden', !isMock);
  $('quizTimer').classList.toggle('hidden', !isMock);
  $('quizCat').classList.toggle('hidden', isMock);
  if (isMock) startTimer();
  renderQuestion();
}

/* ---------- 모의고사 중간 저장 / 이어풀기 ---------- */
function hydrateSavedQuiz(s) {
  if (!s || !Array.isArray(s.ids) || !s.ids.length || !BANK.length) return null;
  const list = s.ids.map(qById).filter(Boolean);
  return list.length === s.ids.length ? Object.assign({}, s, { list }) : null;
}
function getMockSave() { return hydrateSavedQuiz(ls(ekey(K.mockSave), null)); }
function clearMockSave() { try { localStorage.removeItem(ekey(K.mockSave)); } catch {} }
function saveMockProgress() {
  if (!quiz || quiz.mode !== 'mock') return;
  save(ekey(K.mockSave), { ids: quiz.list.map((q) => q.id), i: quiz.i, answers: quiz.answers, text: quiz.text, timeLeft: quiz.timeLeft, savedAt: new Date().toISOString() });
}

/* ---------- 영역별 연습 중간 저장 / 이어풀기 ---------- */
function getPracticeSave() { return hydrateSavedQuiz(ls(ekey(K.practiceSave), null)); }
function clearPracticeSave() { try { localStorage.removeItem(ekey(K.practiceSave)); } catch {} }
function savePracticeProgress() {
  if (!quiz || quiz.mode !== 'practice') return;
  const cats = new Set(quiz.list.map((q) => q.category));
  save(ekey(K.practiceSave), { ids: quiz.list.map((q) => q.id), i: quiz.i, answers: quiz.answers, label: cats.size === 1 ? [...cats][0] : null, savedAt: new Date().toISOString() });
}
function resumePractice() {
  const s = getPracticeSave();
  if (!s) { renderCategories(); return; }
  startQuiz(s.list, 'practice', { i: s.i, answers: s.answers });
  toast(t('toast.resumed'));
}

function renderExamIntro() {
  const e = exam();
  const org = document.querySelector('.exam-cover__org');
  const title = document.querySelector('.exam-cover__title');
  const sub = document.querySelector('.exam-cover__subtitle');
  if (org) org.textContent = tx(e.coverOrg);
  if (title) title.textContent = tx(e.coverTitle);
  if (sub) sub.textContent = tx(e.coverSub);
  const ol = $('examNoticeList');
  if (ol) { const ns = (LANG === 'zh' && e.notices.zh) ? e.notices.zh : e.notices.ko.map(trUI); ol.innerHTML = ns.map((n) => `<li>${n}</li>`).join(''); }
}
function showExamIntro() {
  renderExamIntro();
  $('examNo').value = exam().noPrefix + '-' + String(Math.floor(1000 + Math.random() * 9000));
  const s = getMockSave();
  const btn = $('examResumeBtn');
  if (s) { btn.textContent = t('exam.resume', s.i + 1, s.list.length); btn.classList.remove('hidden'); }
  else btn.classList.add('hidden');
  showView('examintro');
}
async function startMockExam() {
  if (getMockSave() && !confirm(t('confirm.discardMock'))) return;
  clearMockSave();
  const cfg = exam().mock;
  let mcPool = [];
  let writingPool = [];
  let oralPool = [];
  try {
    [mcPool, writingPool, oralPool] = await Promise.all([
      fetchMemberQuestions({ type: 'mc' }),
      fetchMemberQuestions({ type: 'writing' }),
      fetchMemberQuestions({ type: 'oral' }),
    ]);
  } catch (e) {
    handleQuestionLoadFailure(e);
    return;
  }
  if (!mcPool.length) { toast(t('toast.noQ')); return; }
  let mc;
  if (cfg.ladder) {
    // 사전평가: 한국어 영역 80% + 문화·사회 20%, 번호↑=난이도↑(level 오름차순) 재현
    const korCats = ['어휘', '문법', '읽기·이해', '대화'];
    const all = mcPool;
    const kor = all.filter((q) => korCats.includes(q.category));
    const cs = all.filter((q) => !korCats.includes(q.category));
    const nCS = Math.min(cs.length, Math.round(cfg.mc * 0.2));
    const nKor = cfg.mc - nCS;
    const korPick = shuffle(kor).slice(0, nKor).sort((a, b) => (a.level || 2) - (b.level || 2));
    const csPick = shuffle(cs).slice(0, nCS);
    mc = korPick.concat(csPick); // 문화·사회를 뒤쪽(실제 41~48번처럼)
  } else {
    // 종합평가 객관식 36문항: 무작위 대신 영역 쿼터 추첨(책 실전모의 6회 평균 재현)
    const quota = { '한국어': 12, '법': 5, '사회': 4, '역사': 4, '문화': 3, '정치': 3, '경제': 3, '교육': 1, '지리': 1 };
    const all = mcPool;
    const byCat = {};
    all.forEach((q) => { (byCat[q.category] = byCat[q.category] || []).push(q); });
    let picked = [];
    Object.keys(quota).forEach((cat) => { picked = picked.concat(shuffle(byCat[cat] || []).slice(0, quota[cat])); });
    // cfg.mc 하드코딩 금지: quota 합이나 특정 카테고리 풀이 cfg.mc와 어긋나도 비례조정 없이 무작위 가감으로 총수를 맞춘다.
    if (picked.length < cfg.mc) {
      const pickedIds = new Set(picked.map((q) => q.id));
      picked = picked.concat(shuffle(all.filter((q) => !pickedIds.has(q.id))).slice(0, cfg.mc - picked.length));
    } else if (picked.length > cfg.mc) {
      picked = shuffle(picked).slice(0, cfg.mc);
    }
    // 출제 순서: 한국어 먼저(내부 셔플) → 나머지 영역(영역 간 섞어 셔플) — 사전평가 ladder(한국어 앞배치)와 일관
    const korMc = picked.filter((q) => q.category === '한국어');
    const restMc = picked.filter((q) => q.category !== '한국어');
    mc = shuffle(korMc).concat(shuffle(restMc));
  }
  const wr = shuffle(writingPool).slice(0, cfg.writing);
  const or = pickOral(cfg.oral, oralPool);
  startQuiz(mc.concat(wr).concat(or), 'mock');
}
/* G: 구술 출제 — 사전평가는 공식 유형 구성(읽기1·이해1·대화1·듣고말하기2)을 재현한다.
   지문 읽기(read)와 그 내용 확인(comp)은 짝이라 읽기를 먼저 뽑고 이해는 같은 지문 세트에서 고른다.
   종합평가는 유형 구분이 없으므로 무작위. */
function pickOral(n, source) {
  const pool = source || byType('oral');
  if (activeExam !== 'pre' || !pool.some((q) => q.otype)) return shuffle(pool).slice(0, n);
  const of = (t) => shuffle(pool.filter((q) => q.otype === t));
  const quota = { read: 1, comp: 1, talk: 1, listen: 2 };
  const picked = [];
  // 읽기 지문과 그 내용 확인은 같은 set 이어야 한다. 읽기를 먼저 뽑고, 같은 set 의 이해 문항을 짝으로 고른다.
  const readPick = of('read')[0];
  if (readPick) picked.push(readPick);
  const comps = of('comp');
  const compPick = (readPick && readPick.set && comps.find((q) => q.set === readPick.set)) || comps[0];
  if (compPick) picked.push(compPick);
  ['talk', 'listen'].forEach((t) => picked.push(...of(t).slice(0, quota[t])));
  // 쿼터를 못 채웠으면(유형별 문항 부족) 남은 것으로 총수를 맞춘다
  if (picked.length < n) {
    const got = new Set(picked.map((q) => q.id));
    picked.push(...shuffle(pool.filter((q) => !got.has(q.id))).slice(0, n - picked.length));
  }
  // 실제 시험 순서: 읽기 → 이해 → 대화 → 듣고 말하기
  const rank = { read: 0, comp: 1, talk: 2, listen: 3 };
  return picked.slice(0, n).sort((a, b) => (rank[a.otype] ?? 9) - (rank[b.otype] ?? 9));
}

function resumeMock() {
  const s = getMockSave();
  if (!s) { showView('home'); renderHome(); return; }
  startQuiz(s.list, 'mock', { i: s.i, answers: s.answers, text: s.text, timeLeft: s.timeLeft });
  toast(t('toast.resumed'));
}
function onWriteInput() {
  const q = quiz.list[quiz.i];
  const val = $('writeInput').value;
  quiz.text[q.id] = val;
  $('writeCount').textContent = t('count.char', val.length);
  $('writeArea').querySelector('.write-area__meta').classList.toggle('over', val.length > 200);
  if (quiz.mode === 'mock') saveMockProgress();
}

function startTimer() {
  updateTimerLabel();
  quiz.timer = setInterval(() => {
    quiz.timeLeft--;
    updateTimerLabel();
    if (quiz.timeLeft % 15 === 0) saveMockProgress(); // 남은 시간 주기적 저장
    if (quiz.timeLeft <= 0) { clearInterval(quiz.timer); toast(t('toast.timeUp')); gradeMock(); }
  }, 1000);
}
function updateTimerLabel() { const m = Math.floor(quiz.timeLeft / 60), s = quiz.timeLeft % 60; $('quizTimer').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }

/* A1: 문항 i의 보기 표시 순서(표시위치→원본인덱스). 한 번 정하면 quiz 안에서 고정. */
function orderFor(i, q) {
  if (!quiz.order) quiz.order = {};
  if (!quiz.order[i]) {
    const n = (q && q.choices) ? q.choices.length : 0;
    quiz.order[i] = shuffle(Array.from({ length: n }, (_, k) => k));
  }
  return quiz.order[i];
}

function renderQuestion() {
  const q = quiz.list[quiz.i];
  const total = quiz.list.length;
  const isWriting = q.type !== 'mc';

  $('quizProgress').textContent = `${quiz.i + 1} / ${total}`;
  $('progressFill').style.width = `${((quiz.i + 1) / total) * 100}%`;
  if (quiz.mode !== 'mock') $('quizCat').textContent = catName(q.category);

  if (quiz.mode === 'mock') {
    const countOf = (ty) => quiz.list.filter((x) => x.type === ty).length;
    const doneOf = (ty) => quiz.list.slice(0, quiz.i + 1).filter((x) => x.type === ty).length;
    if (q.type === 'mc') $('examBanner').textContent = t('banner.mc', quiz.i + 1, countOf('mc'));
    else if (q.type === 'writing') $('examBanner').textContent = t('banner.writing', doneOf('writing'), countOf('writing'));
    else $('examBanner').textContent = t('banner.oral', doneOf('oral'), countOf('oral'));
  }

  $('questionBox').innerHTML = bi(q.q, gl(q, 'q'));

  const chosen = quiz.answers[quiz.i];
  const showAnswer = quiz.graded && !isWriting && chosen !== null;

  $('choices').classList.toggle('hidden', isWriting);
  $('writeArea').classList.toggle('hidden', !isWriting);

  if (isWriting) {
    const ta = $('writeInput');
    const isOral = q.type === 'oral';
    ta.placeholder = isOral ? t('write.phOral') : t('write.phWrite');
    ta.value = quiz.text[q.id] || '';
    const meta = $('writeArea').querySelector('.write-area__meta');
    meta.style.display = isOral ? 'none' : '';
    $('writeCount').textContent = t('count.char', ta.value.length);
    meta.classList.toggle('over', ta.value.length > 200);
    $('feedback').classList.add('hidden');
  } else {
    // A1: 보기 순서 셔플 — 화면 표시만 섞고, 저장·판정은 원본 인덱스 기준.
    const order = orderFor(quiz.i, q);       // 표시위치 → 원본인덱스
    const cwrap = $('choices');
    cwrap.innerHTML = '';
    order.forEach((origIdx, pos) => {
      const c = q.choices[origIdx];
      const b = document.createElement('button');
      b.className = 'choice';
      const czh = glc(q, origIdx);
      b.innerHTML = `<span class="choice__num">${NUM[pos]}</span><span>${bi(c, czh)}</span>`;
      if (chosen === origIdx) b.classList.add('is-selected');
      if (showAnswer) { b.disabled = true; if (origIdx === q.answer) b.classList.add('is-correct'); else if (origIdx === chosen) b.classList.add('is-wrong'); }
      b.addEventListener('click', () => onChoose(origIdx));
      cwrap.appendChild(b);
    });
    const fb = $('feedback');
    if (showAnswer) {
      const ok = chosen === q.answer;
      const ansPos = order.indexOf(q.answer);       // 정답의 표시 위치로 번호 라벨 재부여
      const head = ok ? t('fb.correct') : t('fb.wrong', NUM[ansPos] + ' ' + q.choices[q.answer]);
      fb.className = 'feedback' + (ok ? '' : ' is-wrong');
      fb.innerHTML = `<strong>${head}</strong>${bi(q.explanation || '', gl(q, 'explanation'))}`;
      fb.classList.remove('hidden');
    } else { fb.classList.add('hidden'); }
  }

  // G: 듣고 말하기 재생기 — listen 대본이 있는 구술 문항에서만
  const lc = $('listenCard');
  stopSpeak();
  lc.classList.toggle('hidden', !hasListen(q));
  if (hasListen(q)) { lc.innerHTML = listenCardHtml(q); wireListen(lc, q); }

  // E: 원고지 작성법 카드 — 종합평가(nat/perm) 작문 문항에서만(사전평가는 단답형이라 무관)
  const wg = $('wongojiCard');
  const showWongoji = q.type === 'writing' && (activeExam === 'nat' || activeExam === 'perm');
  wg.classList.toggle('hidden', !showWongoji);
  if (showWongoji) { wg.innerHTML = wongojiCardHtml(); wireWongojiToggle(wg); }

  const last = quiz.i === total - 1;
  $('prevBtn').classList.toggle('hidden', quiz.mode !== 'mock' || quiz.i === 0);
  if (quiz.mode === 'mock') {
    $('nextBtn').classList.toggle('hidden', last);
    $('nextBtn').disabled = false; $('nextBtn').style.opacity = '1'; $('nextBtn').textContent = t('quiz.next');
    $('submitBtn').classList.toggle('hidden', !last);
  } else {
    $('nextBtn').classList.toggle('hidden', false);
    $('nextBtn').textContent = last ? t('quiz.result') : t('quiz.next');
    $('nextBtn').disabled = chosen === null;
    $('nextBtn').style.opacity = chosen === null ? '.5' : '1';
    $('submitBtn').classList.add('hidden');
  }

  if (quiz.mode === 'mock') saveMockProgress(); // 답 선택·이동 시마다 중간 저장
  else if (quiz.mode === 'practice') savePracticeProgress();
}

function onChoose(idx) {
  const already = quiz.answers[quiz.i];
  if (quiz.graded && already !== null) return;
  quiz.answers[quiz.i] = idx;
  if (quiz.graded) { const q = quiz.list[quiz.i]; const ok = idx === q.answer; recordAnswer(q, ok); if (!ok) addWrong(q.id); else removeWrong(q.id); }
  renderQuestion();
}
function nextQuestion() {
  if (quiz.mode !== 'mock' && quiz.answers[quiz.i] === null) return;
  if (quiz.i < quiz.list.length - 1) { quiz.i++; renderQuestion(); }
  else { if (quiz.mode === 'mock') gradeMock(); else finishPractice(); }
}
function prevQuestion() { if (quiz.i > 0) { quiz.i--; renderQuestion(); } }

function finishPractice() {
  clearPracticeSave(); // 끝까지 풀면 중간 저장 삭제
  let correct = 0;
  quiz.list.forEach((q, i) => { if (quiz.answers[i] === q.answer) correct++; });
  renderResult(quiz.list, quiz.answers, correct, { isMock: false, totalMc: quiz.list.length });
}
function gradeMock() {
  if (quiz.timer) { clearInterval(quiz.timer); quiz.timer = null; }
  clearMockSave(); // 채점 완료 → 중간 저장 삭제
  mockSelfGrade = {}; // 새 채점 → 작문·구술 자가채점 초기화
  const totalMc = quiz.list.filter((q) => q.type === 'mc').length;
  let correct = 0;
  quiz.list.forEach((q, i) => {
    if (q.type !== 'mc') return;
    const ok = quiz.answers[i] === q.answer;
    if (ok) correct++;
    recordAnswer(q, ok);
    if (quiz.answers[i] === null || !ok) addWrong(q.id); else removeWrong(q.id);
  });
  const pct = totalMc ? Math.floor((correct / totalMc) * 100) : 0;
  const hist = ls(ekey(K.history), []);
  hist.unshift({ date: new Date().toISOString(), correct, total: totalMc, pct });
  save(ekey(K.history), hist.slice(0, 30));
  document.body.classList.remove('exam-mode');
  renderResult(quiz.list, quiz.answers, correct, { isMock: true, totalMc });
}

/* =====================================================================
   작문 자동 채점 — 내용 기반
   - 사전평가(단답형): 문항에 실린 accept/nearMiss 와 대조. 정답이 확정적이라 사실상 정확하다.
   - 종합평가(200자 서술): 규칙 기반 루브릭 근사치. 사람 채점을 대신하지 못한다.
   문항에 채점 데이터(accept·parts)가 없으면 null 을 돌려주고 기존 자가채점으로 남는다.

   기준선은 이 책들의 모범답안 42건으로 맞췄다. 모범답안이 만점권에 들지 않으면
   그건 학습자가 아니라 채점기가 틀린 것이다. (글자수 134~173·중앙 153, 종결 99.5%가 니다/니까)
   ===================================================================== */

/* 대조용 정규화: 태그·공백·문장부호를 걷어낸다. 맞춤법은 건드리지 않는다. */
function wsNorm(s) {
  return String(s == null ? '' : s)
    .replace(/<[^>]*>/g, '')
    .replace(/[\s　]+/g, '')
    .replace(/[.,!?~…·、。'"“”‘’`()（）\[\]{}:;/\\-]+/g, '')
    .toLowerCase();
}

/* 원고지 글자 수 — 공백은 세지 않는다. */
function wsChars(s) {
  return String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/[\s　]+/g, '').length;
}

/* 원고지 max칸까지만 남긴다. 공백은 칸을 세지 않으므로 그대로 통과시킨다. */
function wsClip(s, max) {
  let out = '', cnt = 0;
  for (const ch of String(s == null ? '' : s)) {
    if (/[\s　]/.test(ch)) { out += ch; continue; }
    if (cnt >= max) break;
    out += ch; cnt++;
  }
  return out;
}

/* 문장 분리 — 종결부호가 없으면 줄바꿈으로도 끊는다.
   인용부호 안의 종결부호에서 자르면 안 된다. '늘 건강하세요. 정말 고맙습니다"라고 말씀드렸습니다'는
   한 문장인데 잘라 버리면 앞 조각이 해요체로 잡혀 문체가 섞인 것처럼 보인다. */
function wsSentences(s) {
  const MASK = '\u0001';
  const x = String(s == null ? '' : s)
    .replace(/<[^>]*>/g, '')
    .replace(/[“"]([^“”"]*)[”"]|[‘']([^‘’']*)[’']/g, (m) => m.replace(/[.!?。]/g, MASK));
  return x.split(/(?<=[.!?。])\s*|\n+/)
    .map((y) => y.split(MASK).join('.').trim())
    .filter((y) => y.length > 1);
}

/* 문장 하나의 종결 문체.
   격식체는 '-ㅂ니다'가 앞 음절에 붙어 버려서(엽니다·다릅니다) 자모로 찾으면 안 잡힌다.
   실제 표면형은 언제나 '니다/니까'로 끝나므로 그것으로 본다.
   '-다'로 끝나는 한다체(문어체)는 반말이 아니다. 법무부 영주용 견본 모범답안이 문어체라
   시험 답안으로 정당하다. 반말(해체)은 '-어/-아/-야/-지' 계열만 가리킨다. */
function wsStyleOf(sent) {
  const s = String(sent || '').replace(/[\s　.,!?~…·。'"“”‘’)\]]+$/g, '');
  if (!s) return null;
  if (/(니다|니까)$/.test(s)) return 'formal';   // 합쇼체
  if (/(요|죠)$/.test(s)) return 'polite';       // 해요체
  if (/다$/.test(s)) return 'plain';             // 한다체(문어체)
  return 'casual';                               // 해체 반말
}

/* ── 사전평가 단답형 ─────────────────────────────────────────────────
   학습자가 빈칸만 썼든 문장 전체를 옮겨 썼든 잡히도록 부분문자열로 본다.
   짧은 쪽이 먼저 걸리면 안 된다: accept '피곤해도'가 nearMiss '피곤해도요'의 앞부분이라
   앞에서부터 찾으면 구어형이 만점이 된다. 그래서 양쪽을 합쳐 가장 긴 일치를 고른다. */
function wsScorePre(q, text) {
  const acc = (q.accept || []).map(wsNorm).filter(Boolean);
  if (!acc.length) return null;                       // 채점 데이터 없음 → 자가채점 유지
  const norm = wsNorm(text);   // 이름을 t 로 두면 i18n 함수 t() 를 가린다
  if (!norm) return { frac: 0, why: 'empty', matched: '' };
  const near = (q.nearMiss || []).map(wsNorm).filter(Boolean);
  let best = null;
  acc.forEach((a) => { if (norm.includes(a) && (!best || a.length > best.s.length)) best = { s: a, frac: 1, why: 'accept' }; });
  near.forEach((a) => { if (norm.includes(a) && (!best || a.length > best.s.length)) best = { s: a, frac: 0.5, why: 'near' }; });
  return best ? { frac: best.frac, why: best.why, matched: best.s } : { frac: 0, why: 'miss', matched: '' };
}

/* 연결·대조 표현 — 네 갈래를 한 편의 글로 이었는지 보는 표지. */
const WS_CONN = /(그리고|하지만|그러나|그래서|그런데|또한|또|반면|다만|특히|이처럼|게다가|때문|덕분|지만|으며|하며|면서|아서|어서|여서|되어|니까|으니|는데|은데|ㄴ데|거나|으면|이면|아니라|뿐만|보다|처럼|같이|위해|통해)/;

/* ── 종합평가 200자 서술 ─────────────────────────────────────────────
   공식으로 확인되는 배점은 '작문형 10점 = 4문항 × 2.5점'뿐이다(한국이민재단 배점표).
   내용/어휘·문법/분량으로 10점을 쪼개는 세부 기준은 법무부 비공개다
   (기본소양 평가관리 규정 제4조② 별표3 + 제12조② '별표와 별지는 공개하지 아니한다').
   그래서 점수는 공식 단위인 '소주제 하나당 2.5점'만 따르고, 우리가 지어낸 가중치는 쓰지 않는다.
   분량·문체·제목은 점수에서 빼지 않고 '점검 항목'으로만 보여 준다.

   한계: 표지어 매칭은 그 소주제를 '건드렸는지'만 본다. 어휘를 늘어놓기만 해도 통과하므로
   실제보다 후하게 나온다. 분량 상한으로 최소한의 방어만 건다. */
function wsScoreNat(q, text) {
  const parts = q.parts || [];
  if (!parts.length) return null;                     // 채점 데이터 없음 → 자가채점 유지
  const raw = String(text == null ? '' : text).replace(/<[^>]*>/g, '').trim();
  const n = wsChars(raw);
  if (!n) return { frac: 0, pts: 0, max: 10, empty: true, hits: parts.map(() => false), chars: 0, sentences: 0, checks: [] };
  // 실제 시험지는 200칸 원고지 1장이 물리적 상한이다. 넘긴 부분은 애초에 쓸 자리가 없으므로
  // 감점하는 대신 아예 없는 것으로 보고 200칸까지만 채점한다.
  const over = n > 200;
  const body = over ? wsClip(raw, 200) : raw;
  const norm = wsNorm(body);   // 이름을 t 로 두면 i18n 함수 t() 를 가린다

  const hits = parts.map((p) => (p.anyOf || []).some((k) => {
    const kk = wsNorm(k);
    return kk && norm.includes(kk);
  }));
  const nHit = hits.filter(Boolean).length;

  // 분량 상한 — 40자로 네 갈래를 다 다뤘을 리는 없다. 표지어만 흩뿌린 답안을 막는 최소 방어.
  const g = Math.min(n, 200);
  const cap = g >= 130 ? 10 : (g >= 100 ? 7.5 : (g >= 70 ? 5 : (g >= 40 ? 2.5 : 0)));
  const pts = Math.min(nHit * (10 / parts.length), cap);

  // ── 점검 항목: 점수에 넣지 않는다. 규칙으로 확실한 것만 단정한다. ──
  const sents = wsSentences(body);
  const st = sents.map(wsStyleOf).filter(Boolean);
  const cnt = { formal: 0, polite: 0, plain: 0, casual: 0 };
  st.forEach((x) => { cnt[x]++; });
  const mixed = Object.values(cnt).filter((x) => x > 0).length > 1;
  const top = Object.keys(cnt).reduce((a, b) => (cnt[b] > cnt[a] ? b : a), 'formal');
  // 공식 지시는 '제목 생략, 본문만'. 첫 줄이 짧고 종결어미가 없으면 제목을 쓴 것으로 본다.
  const first = (body.split(/\n/)[0] || '').trim();
  const titled = sents.length > 1 && first.length > 0 && first.length <= 20 && !/[.!?]$/.test(first) && wsStyleOf(first) === 'casual';
  // 표시 문자열은 만들지 않는다. 화면에 그릴 때 autoBox 가 현재 언어로 옮긴다.
  const checks = [
    { key: 'len', ok: n >= 130 && n <= 200, n, unit: 'count.char', warn: over ? 'over' : (n < 130 ? 'short' : '') },
    // 공식 문체 규정은 없다. 혼용과 해체 반말만 지적한다.
    { key: 'style', ok: !mixed && !cnt.casual, valKey: 'style.' + top,
      warn: cnt.casual ? 'banmal' : (mixed ? 'mixed' : '') },
    { key: 'title', ok: !titled, warn: titled ? 'titled' : '' },
    { key: 'flow', ok: sents.length >= 3 && (WS_CONN.test(body) || g / sents.length >= 25), n: sents.length, unit: 'count.sent', warn: sents.length < 3 ? 'choppy' : '' },
  ];

  return {
    frac: Math.max(0, Math.min(1, pts / 10)),
    pts: Math.round(pts * 10) / 10, max: 10, empty: false,
    hits, nHit, chars: n, sentences: sents.length, over,
    capped: pts < nHit * (10 / parts.length), checks,
  };
}

/* 문항 하나를 받아 알맞은 채점기를 고른다. 구술(oral)은 대상이 아니다. */
function wsScore(q, text) {
  if (!q || q.type !== 'writing') return null;
  return (q.exam === 'pre') ? wsScorePre(q, text) : wsScoreNat(q, text);
}

/* =====================================================================
   결과
   ===================================================================== */
function renderResult(list, answers, correct, opts) {
  lastResult = { list, answers, correct, opts };
  const { isMock, totalMc } = opts;
  showView('result');
  const denom = totalMc || list.length;
  const mcPct = denom ? Math.floor((correct / denom) * 100) : 0;
  const hasWriting = list.some((q) => q.type !== 'mc');
  // 배점은 트랙별로 다르다. 귀화·영주 65/10/25, 사전평가 72/3/25(필기 75 + 구술 25).
  const P = (exam() && exam().points) || { mc: 65, writing: 10, oral: 25 };
  const isComposite = isMock && hasWriting;
  const isLevelTrack = isMock && activeExam === 'pre';
  const numW = list.filter((q) => q.type === 'writing').length;
  const numO = list.filter((q) => q.type === 'oral').length;
  const mcScoreP = denom ? (correct / denom) * P.mc : 0;

  const passEl = $('scorePass');
  const levelBox = $('levelResult');
  const sb = $('scoreBreakdown');

  // 작문은 내용 기반으로 자동 채점하고 그 결과를 자가채점 칸에 미리 채운다.
  // 학습자가 버튼으로 다시 매기면 그쪽이 이긴다(수동 우선).
  const texts0 = (quiz && quiz.text) ? quiz.text : {};
  const autoW = {};
  if (isComposite) {
    list.forEach((q) => {
      if (q.type !== 'writing') return;
      const r = wsScore(q, texts0[q.id]);
      if (!r) return;                                  // 채점 데이터 없는 문항은 자가채점으로 남긴다
      autoW[q.id] = r;
      if (mockSelfGrade[q.id] == null) mockSelfGrade[q.id] = r.frac;
    });
  }

  // A4: 미채점 작문·구술을 총점에 0점 합산하지 않는다.
  //  1층 = 객관식 X/만점(자동채점, 크게).  2층 = 자가채점 포함 추정 총점(전부 채점 시에만).
  const mc65 = Math.round(mcScoreP);
  function recompute() {
    let sw = 0, so = 0, gradedW = 0, gradedO = 0;
    list.forEach((q) => {
      const g = mockSelfGrade[q.id]; if (g == null) return;
      if (q.type === 'writing') { sw += g; gradedW++; } else if (q.type === 'oral') { so += g; gradedO++; }
    });
    const wScore = numW ? (sw / numW) * P.writing : 0;
    const oScore = numO ? (so / numO) * P.oral : 0;
    const total = Math.round(mcScoreP + wScore + oScore);
    const ungradedN = list.filter((q) => (q.type === 'writing' || q.type === 'oral') && mockSelfGrade[q.id] == null).length;
    const allGraded = ungradedN === 0;
    const wDone = gradedW >= numW;

    if (isLevelTrack) {
      // 사전평가는 합격·불합격이 아니라 단계 배정이다.
      // 구술까지 채점되면 100점 만점 총점으로, 아니면 필기(객관식+작문) 백분율로 단계를 추정한다.
      // 채점 안 된 작문을 0점으로 깔면 단계가 억울하게 내려간다. 채점 전이면 분모에서도 뺀다.
      const paper = mcScoreP + (wDone ? wScore : 0);
      const paperMax = P.mc + (wDone ? P.writing : 0);
      const est = allGraded ? total : Math.round((paper / paperMax) * 100);
      // 공식 규정: 구술이 3점 미만이면 필기 점수와 무관하게 0단계.
      // 구술을 끝까지 채점한 경우에만 이 규정을 적용할 수 있다.
      const oralFloor = gradedO >= numO && numO > 0 && oScore < 3;
      const lv = oralFloor ? PRE_LEVELS[PRE_LEVELS.length - 1] : preLevelFor(est);
      $('scorePct').textContent = est;
      $('scoreUnit').textContent = t('result.unit');
      $('scoreFrac').innerHTML = allGraded
        ? `<span class="score-line">${t('result.estTotal')}: <b>${t('result.estOf', total)}</b></span>` +
          `<span class="score-sub">${t('result.paperOf', Math.round(paper), paperMax)}</span>`
        : `<span class="score-line">${t('result.paperScore')}: <b>${t('result.paperOf', Math.round(paper), paperMax)}</b></span>` +
          `<span class="score-sub">${t('result.frac', denom, correct)}${wDone ? ' · ' + t('result.wAuto') : ''}</span>`;
      passEl.textContent = t('result.estLevel', tx(lv.name)) + (oralFloor ? ' · ' + t('result.oralFloor') : '');
      passEl.className = 'score-card__pass level';
      levelBox.innerHTML = renderLevelTable(lv);
      levelBox.classList.remove('hidden');
    } else {
      // 큰 숫자: 전부 채점되면 총점/100, 아니면 객관식 점수/만점
      $('scorePct').textContent = allGraded ? total : mc65;
      $('scoreUnit').textContent = allGraded ? t('result.estOf', '').replace(/\s*\{0\}\s*/, '') : '';
      $('scoreFrac').innerHTML = allGraded
        ? `<span class="score-line">${t('result.estTotal')}: <b>${t('result.estOf', total)}</b></span>` +
          `<span class="score-sub">${t('result.mcScore')} ${t('result.mcOf', mc65)}</span>`
        : `<span class="score-line">${t('result.mcScore')}: <b>${t('result.mcOf', mc65)}</b></span>` +
          `<span class="score-sub">${t('result.frac', denom, correct)}</span>`;
      // 합격선(60) 판정은 채점 완료 시에만 총점 기준. 아니면 중립 표기.
      if (allGraded) {
        const pass = total >= 60;
        passEl.textContent = pass ? t('result.pass') : t('result.fail');
        passEl.className = 'score-card__pass ' + (pass ? 'pass' : 'fail');
      } else {
        passEl.textContent = t('result.mcOnly', mc65);
        passEl.className = 'score-card__pass';
      }
      levelBox.classList.add('hidden');
    }

    const nAuto = Object.keys(autoW).length;
    sb.innerHTML =
      `<div class="bd-note">${nAuto ? t('sg.noteAuto') : t('sg.note')}</div>` +
      `<div class="bd-row"><span>${t('bd.mc')}</span><span>${mc65} / ${P.mc}</span></div>` +
      `<div class="bd-row"><span>${t('bd.writing')}${nAuto ? ` <em class="bd-auto">${t('bd.autoTag')}</em>` : ''}</span>` +
        `<span>${wDone ? Math.round(wScore * 10) / 10 : '—'} / ${P.writing}</span></div>` +
      `<div class="bd-row"><span>${t('bd.oral')}</span><span>${gradedO < numO ? '—' : Math.round(oScore)} / ${P.oral}</span></div>` +
      (allGraded
        ? `<div class="bd-row bd-total"><span>${t('bd.total')}</span><span>${total} / 100</span></div>`
        : `<div class="bd-prompt">${t('result.ungradedN', ungradedN)}</div>`);
  }

  if (isComposite) {
    sb.classList.remove('hidden');
    recompute();
  } else {
    sb.classList.add('hidden');
    levelBox.classList.add('hidden');
    $('scorePct').textContent = mcPct;
    $('scoreUnit').textContent = t('result.unit');
    $('scoreFrac').textContent = t('result.frac', denom, correct) + (hasWriting ? t('result.fracMore') : '');
    if (isMock && activeExam === 'pre') {
      // 작문·구술이 하나도 없는 사전평가 모의고사(풀이 빈 경우)라도 합격·불합격이 아니라 단계로 보여준다.
      const lv = preLevelFor(mcPct);
      passEl.textContent = t('result.estLevel', tx(lv.name));
      passEl.className = 'score-card__pass level';
      levelBox.innerHTML = renderLevelTable(lv);
      levelBox.classList.remove('hidden');
    } else if (isMock) { const pass = mcPct >= 60; passEl.textContent = pass ? t('result.pass') : t('result.fail'); passEl.className = 'score-card__pass ' + (pass ? 'pass' : 'fail'); }
    else { passEl.textContent = t('result.practice'); passEl.className = 'score-card__pass'; }
  }

  const cat = {};
  list.forEach((q, i) => { if (q.type !== 'mc') return; cat[q.category] = cat[q.category] || { c: 0, t: 0 }; cat[q.category].t++; if (answers[i] === q.answer) cat[q.category].c++; });
  const cb = $('catBreakdown'); cb.innerHTML = '';
  sortCats(Object.keys(cat)).forEach((c) => {
    const { c: cc, t: tt } = cat[c]; const p = Math.round((cc / tt) * 100);
    const row = document.createElement('div'); row.className = 'cat-row';
    row.innerHTML = `<span class="cat-row__name">${catName(c)}</span><span class="cat-row__bar"><span style="width:${p}%"></span></span><span class="cat-row__val">${cc}/${tt}</span>`;
    cb.appendChild(row);
  });

  const texts = (quiz && quiz.text) ? quiz.text : {};
  const rl = $('reviewList'); rl.innerHTML = '';
  list.forEach((q, i) => rl.appendChild(reviewItem(q, answers[i], texts[q.id], isComposite, mockSelfGrade[q.id], autoW[q.id])));
  if (isComposite) {
    rl.querySelectorAll('.sg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        mockSelfGrade[btn.dataset.qid] = parseFloat(btn.dataset.frac);
        btn.parentElement.querySelectorAll('.sg-btn').forEach((b) => b.classList.toggle('is-on', b === btn));
        recompute();
      });
    });
  }

  const wrongQs = list.filter((q, i) => q.type === 'mc' && answers[i] !== q.answer);
  $('retryWrongBtn').classList.toggle('hidden', wrongQs.length === 0);
  $('retryWrongBtn').onclick = () => startQuiz(shuffle(wrongQs), 'practice');
}

function renderLevelTable(cur) {
  const rows = PRE_LEVELS.slice().reverse().map((l) => {
    const on = l.stage === cur.stage;
    return `<div class="level-row${on ? ' is-on' : ''}"><span class="level-row__stage">${tx(l.name)}${on ? ' ◀' : ''}</span><span class="level-row__range">${tx(l.range)}</span></div>`;
  }).join('');
  return `<div class="level-note">${t('result.levelDisclaimer')}</div><div class="level-table">${rows}</div>`;
}

/* 작문 자동채점 결과 상자 — 사전평가는 정오, 종합평가는 소주제 커버리지 + 점검 항목. */
function autoBox(q, r) {
  const esc = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  if (q.exam === 'pre') {
    const k = r.frac === 1 ? 'ok' : (r.frac === 0.5 ? 'mid' : 'no');
    const label = t(r.frac === 1 ? 'auto.ok' : (r.frac === 0.5 ? 'auto.mid' : (r.why === 'empty' ? 'auto.empty' : 'auto.no')));
    const hint = (r.frac < 1 && q.hint) ? `<div class="auto-hint">💡 ${esc(q.hint)}</div>` : '';
    return `<div class="auto-box auto-box--${k}"><div class="auto-head"><span class="auto-verdict">${label}</span>` +
      `<span class="auto-pts">${r.frac * 1.5} / 1.5</span></div>${hint}` +
      `<div class="auto-note">${t('auto.notePre')}</div></div>`;
  }
  const parts = q.parts || [];
  const marks = parts.map((p, i) => `<span class="auto-part${r.hits[i] ? ' is-on' : ''}">${'①②③④'[i] || (i + 1)} ${esc(p.label)}</span>`).join('');
  const val = (c) => (c.valKey ? t(c.valKey) : (c.unit != null ? t(c.unit, c.n) : ''));
  const checks = (r.checks || []).map((c) => `<div class="auto-row${c.ok ? '' : ' is-warn'}"><span>${c.ok ? '✓' : '⚠'} ${t('auto.' + c.key)}` +
    `${c.warn ? ` <em>${t('auto.w.' + c.warn)}</em>` : ''}</span><span>${esc(val(c))}</span></div>`).join('');
  const cls = r.pts >= 7.5 ? 'ok' : (r.pts >= 5 ? 'mid' : 'no');
  const capped = r.capped ? `<div class="auto-hint">⚠ ${t('auto.capped')}</div>` : '';
  const over = r.over ? `<div class="auto-hint">⚠ ${t('auto.overNote')}</div>` : '';
  return `<div class="auto-box auto-box--${cls}"><div class="auto-head"><span class="auto-verdict">${t('auto.task')}</span>` +
    `<span class="auto-pts">${r.pts} / ${r.max}</span></div>` +
    `<div class="auto-parts">${marks}</div>${over}${capped}` +
    `<div class="auto-sub">${t('auto.checkHead')}</div><div class="auto-rows">${checks}</div>` +
    `<div class="auto-note">${t('auto.noteNat')}</div></div>`;
}

function reviewItem(q, chosen, writeText, sgMode, sgVal, auto) {
  const el = document.createElement('div');
  el.className = 'review-item';
  if (q.type !== 'mc') {
    const isOral = q.type === 'oral';
    const ans = (writeText || '').trim().replace(/</g, '&lt;');
    const empty = isOral ? t('review.emptyOral') : t('review.emptyWrite');
    let sgHtml = '';
    if (sgMode) {
      const lv = [['1', 'sg.good'], ['0.5', 'sg.mid'], ['0', 'sg.poor']];
      const btns = lv.map(([f, k]) => `<button type="button" class="sg-btn${String(sgVal) === f ? ' is-on' : ''}" data-qid="${q.id}" data-frac="${f}">${t(k)}</button>`).join('');
      sgHtml = `<div class="sg-grade"><span class="sg-grade__label">${t(auto ? 'sg.headOverride' : 'sg.head')}</span><div class="sg-btns">${btns}</div></div>`;
    }
    const autoHtml = auto ? autoBox(q, auto) : '';
    el.innerHTML = `<div class="review-item__q">${isOral ? '🗣️' : '✍️'} ${bi(q.q, gl(q, 'q'))}</div>
      <div class="review-item__write ${ans ? '' : 'empty-ans'}">${ans || empty}</div>
      ${autoHtml}
      ${q.guide ? `<div class="review-item__exp">💡 ${bi(q.guide, gl(q, 'guide'))}</div>` : ''}
      ${q.model ? `<div class="review-item__model"><b>${t('review.model')}</b><br>${bi(q.model, gl(q, 'model'))}</div>` : ''}
      ${sgHtml}`;
    return el;
  }
  let opts = '';
  q.choices.forEach((c, idx) => {
    let cls = ''; if (idx === q.answer) cls = 'correct'; else if (idx === chosen) cls = 'chosen-wrong';
    const czh = glc(q, idx);
    opts += `<div class="review-item__opt ${cls}">${NUM[idx]} ${bi(c, czh)}${idx === q.answer ? ' ✓' : ''}</div>`;
  });
  const unanswered = chosen === null || chosen === undefined;
  el.innerHTML = `<div class="review-item__q">${bi(q.q, gl(q, 'q'))}</div>${opts}
    ${unanswered ? `<div class="review-item__opt chosen-wrong">${t('review.unanswered')}</div>` : ''}
    ${q.explanation ? `<div class="review-item__exp">💡 ${bi(q.explanation, gl(q, 'explanation'))}</div>` : ''}`;
  return el;
}

/* =====================================================================
   오답노트 — 숙련 원장 {id:{miss,streak,last}}
   - 옛 배열형 [id,...]은 로드 시 각 id를 {miss:1,streak:0,last:0}로 자동 승격.
   - 오답: miss+1, streak=0.  정답: streak+1 → 연속 2회면 제거.
   ===================================================================== */
/* 트랙별 오답 원장 로드(배열이면 맵으로 승격 후 저장) */
function loadWrong() {
  const raw = ls(ekey(K.wrong), {});
  if (Array.isArray(raw)) {
    const map = {};
    raw.forEach((id) => { if (id != null) map[id] = { miss: 1, streak: 0, last: 0 }; });
    save(ekey(K.wrong), map);
    return map;
  }
  return (raw && typeof raw === 'object') ? raw : {};
}
function wrongIds() { return Object.keys(loadWrong()); }
function wrongCount() { return wrongIds().length; }
function addWrong(id) {
  const w = loadWrong();
  const cur = w[id] || { miss: 0, streak: 0, last: 0 };
  cur.miss = (cur.miss || 0) + 1; cur.streak = 0; cur.last = Date.now();
  w[id] = cur; save(ekey(K.wrong), w);
}
function removeWrong(id) {
  // 정답 1회: streak 증가, 연속 2회면 졸업(제거).
  const w = loadWrong();
  const cur = w[id];
  if (!cur) return;
  cur.streak = (cur.streak || 0) + 1; cur.last = Date.now();
  if (cur.streak >= 2) delete w[id]; else w[id] = cur;
  save(ekey(K.wrong), w);
}
/* F: 문항별 삭제 — 숙련도와 무관하게 원장에서 즉시 제거 */
function deleteWrong(id) {
  const w = loadWrong();
  if (!(id in w)) return;
  delete w[id];
  save(ekey(K.wrong), w);
}

/* ---------------------------------------------------------------------
   F: 오답노트 카드 — 답을 가리고 실제 문제처럼 다시 푼다.
   - 보기는 카드마다 섞어서 보여주고(판정은 원본 인덱스), 고르는 즉시 채점.
   - 채점 결과는 학습 통계·오답 원장(miss/streak)에 그대로 반영.
   - 틀리면 '다시 풀기'로 그 자리에서 재도전, 맞히면 졸업 여부를 카드에 표시.
   --------------------------------------------------------------------- */
function wrongMetaHtml(meta) {
  const miss = (meta && meta.miss) || 0;
  const almost = ((meta && meta.streak) || 0) >= 1;
  return `<span class="wrong-badge">${t('wrong.miss', miss)}</span>` +
    (almost ? `<span class="wrong-almost">${t('wrong.almost')}</span>` : '');
}
function wrongCard(q) {
  const el = document.createElement('div');
  el.className = 'review-item wrong-card';
  el.innerHTML = `<div class="wrong-meta"><span class="wrong-meta__badges"></span>
      <button type="button" class="wrong-del" title="${t('wrong.del')}" aria-label="${t('wrong.del')}">✕</button></div>
    <div class="review-item__q">${bi(q.q, gl(q, 'q'))}</div>
    <div class="choices wrong-card__choices"></div>
    <div class="feedback hidden"></div>
    <div class="wrong-card__actions hidden"><button type="button" class="btn btn--ghost wrong-retry">${t('wrong.retry')}</button></div>`;

  const badges = el.querySelector('.wrong-meta__badges');
  const cwrap = el.querySelector('.wrong-card__choices');
  const fb = el.querySelector('.feedback');
  const actions = el.querySelector('.wrong-card__actions');
  const syncBadges = () => { badges.innerHTML = wrongMetaHtml(loadWrong()[q.id]); };

  function ask() {
    el.classList.remove('is-graduated');
    fb.classList.add('hidden');
    actions.classList.add('hidden');
    cwrap.innerHTML = '';
    syncBadges();
    const order = shuffle(q.choices.map((_, k) => k));   // 표시위치 → 원본인덱스
    order.forEach((origIdx, pos) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.innerHTML = `<span class="choice__num">${NUM[pos]}</span><span>${bi(q.choices[origIdx], glc(q, origIdx))}</span>`;
      b.addEventListener('click', () => grade(order, origIdx));
      cwrap.appendChild(b);
    });
  }

  function grade(order, chosen) {
    const ok = chosen === q.answer;
    recordAnswer(q, ok);
    if (ok) removeWrong(q.id); else addWrong(q.id);
    const graduated = ok && !(q.id in loadWrong());
    cwrap.querySelectorAll('.choice').forEach((b, pos) => {
      b.disabled = true;
      const orig = order[pos];
      if (orig === q.answer) b.classList.add('is-correct');
      else if (orig === chosen) b.classList.add('is-wrong');
    });
    const ansPos = order.indexOf(q.answer);
    const head = ok ? t('fb.correct') : t('fb.wrong', NUM[ansPos] + ' ' + q.choices[q.answer]);
    fb.className = 'feedback' + (ok ? '' : ' is-wrong');
    fb.innerHTML = `<strong>${head}</strong>${bi(q.explanation || '', gl(q, 'explanation'))}` +
      (graduated ? `<div class="wrong-card__grad">${t('wrong.grad')}</div>` : '');
    fb.classList.remove('hidden');
    if (graduated) { el.classList.add('is-graduated'); badges.innerHTML = ''; }
    else { syncBadges(); actions.classList.toggle('hidden', ok); }
    renderHome();
    $('startWrongBtn').classList.toggle('hidden', wrongSolvable().length === 0);
  }

  el.querySelector('.wrong-retry').addEventListener('click', ask);
  el.querySelector('.wrong-del').addEventListener('click', () => {
    if (!confirm(t('wrong.confirmDel'))) return;
    deleteWrong(q.id);
    el.remove();
    toast(t('wrong.deleted'));
    renderHome();
    if (!$('wrongList').children.length) renderWrong(); else $('startWrongBtn').classList.toggle('hidden', wrongSolvable().length === 0);
  });

  ask();
  return el;
}
/* 현재 트랙에서 다시 풀 수 있는 오답 문항(문항은행에 살아 있고 같은 시험 풀인 것만) */
function wrongSolvable() {
  const w = loadWrong();
  return Object.keys(w).map((id) => BANK.find((q) => q.id === id)).filter((q) => q && inExam(q));
}
function renderWrong() {
  const list = wrongSolvable();
  $('startWrongBtn').classList.toggle('hidden', list.length === 0);
  const rl = $('wrongList'); rl.innerHTML = '';
  if (!list.length) { rl.innerHTML = `<div class="empty">${t('wrong.empty')}</div>`; return; }
  // 오답 원장에는 객관식만 쌓이지만, 옛 데이터에 작문·구술이 남아 있으면 기존 리뷰 카드로 표시한다.
  list.forEach((q) => rl.appendChild(q.type === 'mc' ? wrongCard(q) : reviewItem(q, null)));
}

/* =====================================================================
   G: 듣고 말하기 — 브라우저 음성합성으로 대본을 읽어 준다.
   실제 시험은 음성을 듣고 답하므로, 대본은 기본으로 가려 두고 답한 뒤 확인하게 한다.
   ===================================================================== */
const TTS = window.speechSynthesis || null;
function speak(text, onEnd) {
  if (!TTS) { onEnd && onEnd(); return false; }
  TTS.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 0.92;   // 초급 학습자가 따라올 수 있는 속도
  const ko = TTS.getVoices().find((v) => /^ko/i.test(v.lang));
  if (ko) u.voice = ko;
  u.onend = u.onerror = () => onEnd && onEnd();
  TTS.speak(u);
  return true;
}
function stopSpeak() { if (TTS) TTS.cancel(); }
function hasListen(q) { return !!(q && q.listen); }
function listenCardHtml(q) {
  return `<div class="listen-card__head">${t('listen.head')}</div>
    <div class="listen-card__btns">
      <button type="button" class="listen-play">${t('listen.play')}</button>
      <button type="button" class="listen-script">${t('listen.script')}</button>
    </div>
    <div class="listen-card__hint">${TTS ? t('listen.hint') : t('listen.no')}</div>
    <div class="listen-card__text hidden">${bi(q.listen, gl(q, 'listen'))}</div>`;
}
function wireListen(el, q) {
  const play = el.querySelector('.listen-play');
  const sc = el.querySelector('.listen-script');
  const tx = el.querySelector('.listen-card__text');
  let playing = false, heard = false;
  const idle = () => { playing = false; play.textContent = heard ? t('listen.replay') : t('listen.play'); };
  play.addEventListener('click', () => {
    if (playing) { stopSpeak(); idle(); return; }
    playing = true; heard = true; play.textContent = t('listen.stop');
    if (!speak(q.listen, idle)) { tx.classList.remove('hidden'); sc.textContent = t('listen.scriptHide'); idle(); }
  });
  sc.addEventListener('click', () => {
    tx.classList.toggle('hidden');
    sc.textContent = tx.classList.contains('hidden') ? t('listen.script') : t('listen.scriptHide');
  });
}

/* =====================================================================
   작문 / 구술
   ===================================================================== */
function writingCacheKey() {
  return activeExam + '|' + writingType;
}
function writingQuestionsForView() {
  if (writingViewKey === writingCacheKey()) return writingViewList;
  return bankFullyLoaded ? byType(writingType) : [];
}
async function openWritingView(type) {
  if (type) writingType = type;
  syncSeg();
  writingViewKey = writingCacheKey();
  writingViewList = await loadExerciseQuestions({ type: writingType });
  renderWriting();
  showView('writing');
}
/* E: 원고지 작성법 카드(종합평가 nat/perm 작문 전용) — 기존 guide.show/hide 접이식 패턴 재사용 */
function wongojiCardHtml() {
  return `<button type="button" class="writing-card__guide-toggle">${t('guide.show')}</button>
    <div class="writing-card__guide hidden"><div class="wongoji-card__title">${t('wongoji.title')}</div>${t('wongoji.body')}</div>`;
}
function wireWongojiToggle(el) {
  const tg = el.querySelector('.writing-card__guide-toggle');
  const gd = el.querySelector('.writing-card__guide');
  tg.addEventListener('click', () => { gd.classList.toggle('hidden'); tg.textContent = gd.classList.contains('hidden') ? t('guide.show') : t('guide.hide'); });
}
function renderWriting() {
  const list = writingQuestionsForView();
  // E: 원고지 카드는 작문 탭 + 종합평가(nat/perm)에서만, 목록 위에 한 번만 표시(문항마다 반복하지 않음)
  const wp = $('wongojiPractice');
  const showWongoji = writingType === 'writing' && (activeExam === 'nat' || activeExam === 'perm');
  wp.classList.toggle('hidden', !showWongoji);
  if (showWongoji) { wp.innerHTML = wongojiCardHtml(); wireWongojiToggle(wp); }
  const drafts = ls(ekey(K.drafts), {});
  const wrap = $('writingList'); wrap.innerHTML = '';
  if (!list.length) { wrap.innerHTML = `<div class="empty">${t('writing.empty')}</div>`; return; }
  const isOralMode = writingType === 'oral';
  list.forEach((q) => {
    const card = document.createElement('div');
    card.className = 'writing-card' + (isOralMode ? ' writing-card--oral' : '');
    const isWriting = q.type === 'writing';
    // A6: 구술 = "가리고 말하기" — 질문 표시 → 낭독 안내 → 모범답안 보기 → 자가확인 3버튼
    const oralSelf = isOralMode && q.model ? `
      <div class="oral-self">
        <span class="oral-self__label">${t('oral.selfHead')}</span>
        <div class="oral-self__btns">
          <button type="button" class="oral-btn" data-frac="1">${t('oral.good')}</button>
          <button type="button" class="oral-btn" data-frac="0.5">${t('oral.mid')}</button>
          <button type="button" class="oral-btn" data-frac="0">${t('oral.poor')}</button>
        </div>
      </div>` : '';
    card.innerHTML = `
      ${hasListen(q) ? `<div class="listen-card">${listenCardHtml(q)}</div>` : ''}
      <div class="writing-card__q">${bi(q.q, gl(q, 'q'))}</div>
      ${isOralMode && !hasListen(q) ? `<div class="oral-recite">${t('oral.recite')}</div>` : ''}
      ${isWriting ? `<textarea data-id="${q.id}" placeholder="${t('writing.draftPh')}">${drafts[q.id] || ''}</textarea>
        <div class="writing-card__meta"><span class="writing-card__count">0${CHAR_UNIT[LANG] || '자'}</span></div>` : ''}
      <button class="writing-card__guide-toggle">${t('guide.show')}</button>
      <div class="writing-card__guide hidden">${bi(q.guide || '', gl(q, 'guide'))}</div>
      ${q.model ? `<button class="writing-card__model-toggle">${isOralMode ? t('oral.reveal') : t('model.show')}</button>
      <div class="writing-card__model hidden">${bi(q.model, gl(q, 'model'))}</div>` : ''}
      ${oralSelf}`;
    if (isWriting) {
      const ta = card.querySelector('textarea'); const cnt = card.querySelector('.writing-card__count');
      const upd = () => { const n = ta.value.length; cnt.textContent = t('count.char', n); cnt.classList.toggle('over', n > 200); };
      ta.addEventListener('input', () => { upd(); const d = ls(ekey(K.drafts), {}); d[q.id] = ta.value; save(ekey(K.drafts), d); });
      upd();
    }
    if (hasListen(q)) wireListen(card.querySelector('.listen-card'), q);
    const tg = card.querySelector('.writing-card__guide-toggle'); const gd = card.querySelector('.writing-card__guide');
    tg.addEventListener('click', () => { gd.classList.toggle('hidden'); tg.textContent = gd.classList.contains('hidden') ? t('guide.show') : t('guide.hide'); });
    const mtg = card.querySelector('.writing-card__model-toggle');
    if (mtg) {
      const md = card.querySelector('.writing-card__model');
      const showLbl = isOralMode ? t('oral.reveal') : t('model.show');
      const hideLbl = isOralMode ? t('oral.hideModel') : t('model.hide');
      mtg.addEventListener('click', () => { md.classList.toggle('hidden'); mtg.textContent = md.classList.contains('hidden') ? showLbl : hideLbl; });
    }
    // A6: 자가확인 3버튼 → 통계에 기록
    card.querySelectorAll('.oral-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        card.querySelectorAll('.oral-btn').forEach((b) => b.classList.toggle('is-on', b === btn));
        recordOral(q, parseFloat(btn.dataset.frac));
        toast(t('oral.saved'));
      });
    });
    wrap.appendChild(card);
  });
}
/* A6: 구술 자가확인 결과를 통계에 기록(잘함=정답, 보통=반영 부분정답, 부족=오답 취급) */
function recordOral(q, frac) {
  const s = ls(ekey(K.stats), { total: 0, correct: 0, cat: {} });
  const ok = frac >= 1;
  s.total++; if (ok) s.correct++;
  const cat = q.category || '구술';
  s.cat[cat] = s.cat[cat] || { t: 0, c: 0 };
  s.cat[cat].t++; if (ok) s.cat[cat].c++;
  save(ekey(K.stats), s);
}

/* =====================================================================
   통계
   ===================================================================== */
function recordAnswer(q, ok) {
  const s = ls(ekey(K.stats), { total: 0, correct: 0, cat: {} });
  s.total++; if (ok) s.correct++;
  s.cat[q.category] = s.cat[q.category] || { t: 0, c: 0 };
  s.cat[q.category].t++; if (ok) s.cat[q.category].c++;
  save(ekey(K.stats), s);
}
function renderStats() {
  const s = ls(ekey(K.stats), { total: 0, correct: 0, cat: {} });
  const acc = s.total ? Math.round((s.correct / s.total) * 100) : 0;
  $('statsBox').innerHTML = `
    <div class="stat"><div class="stat__num">${s.total}</div><div class="stat__label">${t('stats.total')}</div></div>
    <div class="stat"><div class="stat__num">${acc}%</div><div class="stat__label">${t('stats.acc')}</div></div>`;
  // 영역별 정답률 막대 + "이 영역만 연습" 버튼(해당 영역에 MC 문항이 있을 때만)
  const mcCats = new Set(
    bankFullyLoaded
      ? mcOnly().map((q) => q.category)
      : (catalogExam().categories || []).filter((c) => c.mc).map((c) => c.category)
  );
  const hl = $('historyList');
  hl.innerHTML = '';
  const catKeys = sortCats(Object.keys(s.cat));
  if (catKeys.length) {
    const cb = document.createElement('div');
    cb.className = 'cat-breakdown cat-breakdown--stats';
    catKeys.forEach((c) => {
      const { t: tt, c: cc } = s.cat[c]; const p = tt ? Math.round((cc / tt) * 100) : 0;
      const row = document.createElement('div'); row.className = 'cat-row';
      const canPractice = mcCats.has(c);
      row.innerHTML =
        `<span class="cat-row__name">${catName(c)}</span>` +
        `<span class="cat-row__bar"><span style="width:${p}%"></span></span>` +
        `<span class="cat-row__val">${p}%</span>` +
        (canPractice ? `<button class="cat-row__practice" type="button">${t('stats.practiceCat')}</button>` : '');
      const btn = row.querySelector('.cat-row__practice');
      if (btn) btn.addEventListener('click', () => practiceCategory(c));
      cb.appendChild(row);
    });
    hl.appendChild(cb);
  }
  const hist = ls(ekey(K.history), []);
  if (!hist.length) { hl.insertAdjacentHTML('beforeend', `<div class="empty">${t('stats.noHistory')}</div>`); return; }
  hist.forEach((h) => { hl.insertAdjacentHTML('beforeend', `<div class="history-item"><span>${fmtDate(h.date)}</span><span class="history-item__score">${h.pct}${t('result.unit')} (${h.correct}/${h.total})</span></div>`); });
}

/* =====================================================================
   이벤트
   ===================================================================== */
function wireEvents() {
  $('homeBtn').addEventListener('click', () => { showView('home'); renderHome(); });
  $('syncBtn').addEventListener('click', () => sync({ silent: false }));
  $('langBtn').addEventListener('click', openLangPicker);
  document.querySelectorAll('#langSplash .lang-opt').forEach((b) => b.addEventListener('click', () => chooseLang(b.dataset.lang)));
  document.querySelectorAll('#trackSeg .seg__btn').forEach((b) => b.addEventListener('click', () => setExam(b.dataset.exam)));

  document.querySelectorAll('[data-go]').forEach((el) => {
    el.addEventListener('click', () => {
      const go = el.dataset.go;
      if (go === 'home') { showView('home'); renderHome(); }
      else if (go === 'mock') showExamIntro();
      else if (go === 'practice') { renderCategories(); showView('practice'); }
      else if (go === 'writing') requireMembership(() => openWritingView('writing'));
      else if (go === 'wrong') requireMembership(() => { renderWrong(); showView('wrong'); }, { loadBank: true });
      else if (go === 'stats') { renderStats(); showView('stats'); }
      else if (go === 'typing') requireMembership(() => { window.location.href = 'typing/'; });
    });
  });

  // A3: 시험일 설정
  const edi = $('examDateInput');
  if (edi) edi.addEventListener('change', () => setExamDate(edi.value));
  const edc = $('examDateClear');
  if (edc) edc.addEventListener('click', clearExamDate);

  $('nextBtn').addEventListener('click', nextQuestion);
  $('prevBtn').addEventListener('click', prevQuestion);
  $('submitBtn').addEventListener('click', () => { if (confirm(t('confirm.submit'))) gradeMock(); });
  $('examStartBtn').addEventListener('click', () => requireMembership(startMockExam));
  $('resumeBanner').addEventListener('click', () => requireMembership(resumeMock, { loadBank: true }));
  $('examResumeBtn').addEventListener('click', () => requireMembership(resumeMock, { loadBank: true }));
  $('practiceResume').addEventListener('click', () => requireMembership(resumePractice, { loadBank: true }));
  $('writeInput').addEventListener('input', onWriteInput);

  $('writingSeg').querySelectorAll('.seg__btn').forEach((b) => { b.addEventListener('click', () => requireMembership(() => openWritingView(b.dataset.wt))); });

  $('startWrongBtn').addEventListener('click', () => requireMembership(() => startQuiz(shuffle(wrongSolvable()), 'wrong'), { loadBank: true }));
  $('clearWrongBtn').addEventListener('click', () => { if (confirm(t('confirm.clearWrong'))) { save(ekey(K.wrong), {}); renderWrong(); renderHome(); toast(t('toast.clearedWrong')); } });
  $('resetStatsBtn').addEventListener('click', () => { if (confirm(t('confirm.resetStats'))) { save(ekey(K.stats), { total: 0, correct: 0, cat: {} }); save(ekey(K.history), []); renderStats(); toast(t('toast.resetStats')); } });
}
function syncSeg() { $('writingSeg').querySelectorAll('.seg__btn').forEach((b) => { b.classList.toggle('seg__btn--active', b.dataset.wt === writingType); }); }

window.addEventListener('DOMContentLoaded', init);
