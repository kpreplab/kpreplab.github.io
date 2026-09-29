/* Supabase membership helper shared by the main quiz app and the typing app. */
(function () {
  'use strict';

  var client = null;
  var listeners = [];
  var status = {
    configured: false,
    signedIn: false,
    email: '',
    active: false,
    reason: 'not_configured',
    loading: false,
  };

  function cfg() {
    return window.GWIWHA_SUPABASE || {};
  }
  function hasConfig() {
    var c = cfg();
    return !!(window.supabase && c.url && c.anonKey &&
      !/^https:\/\/YOUR_PROJECT_ID/i.test(c.url) &&
      !/^YOUR_SUPABASE/i.test(c.anonKey));
  }
  function getClient() {
    if (client) return client;
    if (!hasConfig()) return null;
    var c = cfg();
    client = window.supabase.createClient(c.url, c.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return client;
  }
  function emit() {
    listeners.forEach(function (fn) {
      try { fn(getStatus()); } catch (e) {}
    });
  }
  function setStatus(next) {
    status = Object.assign({}, status, next);
    emit();
  }
  function getStatus() {
    return Object.assign({}, status);
  }
  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
  }
  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }
  function friendlyAuthError(error) {
    if (!error) return '';
    var msg = String(error.message || '').toLowerCase();
    if (msg.includes('invalid') || msg.includes('token') || msg.includes('otp')) return 'invalid_otp';
    return 'network';
  }

  async function init() {
    var sb = getClient();
    if (!sb) {
      setStatus({ configured: false, signedIn: false, email: '', active: false, reason: 'not_configured', loading: false });
      return getStatus();
    }
    setStatus({ configured: true, loading: true });
    sb.auth.onAuthStateChange(function () { refreshStatus(); });
    return refreshStatus();
  }

  async function refreshStatus() {
    var sb = getClient();
    if (!sb) return getStatus();
    setStatus({ configured: true, loading: true });
    try {
      var sessionRes = await sb.auth.getSession();
      var session = sessionRes && sessionRes.data && sessionRes.data.session;
      var email = normalizeEmail(session && session.user && session.user.email);
      if (!session || !email) {
        setStatus({ signedIn: false, email: '', active: false, reason: 'not_signed_in', loading: false });
        return getStatus();
      }
      // RLS is the authorization boundary: the policy only exposes rows whose
      // normalized email matches the authenticated Supabase Auth user.
      var memberRes = await sb.from('members').select('email, active');
      if (memberRes.error && memberRes.error.code !== 'PGRST116') throw memberRes.error;
      var rows = (memberRes.data || []).filter(function (row) {
        return normalizeEmail(row.email) === email;
      });
      if (!rows.length) {
        setStatus({ signedIn: true, email: email, active: false, reason: 'not_member', loading: false });
        return getStatus();
      }
      if (!rows.some(function (row) { return row.active === true; })) {
        setStatus({ signedIn: true, email: email, active: false, reason: 'inactive', loading: false });
        return getStatus();
      }
      setStatus({ signedIn: true, email: email, active: true, reason: 'active', loading: false });
      return getStatus();
    } catch (e) {
      setStatus({ active: false, reason: 'network', loading: false });
      return getStatus();
    }
  }

  async function sendOtp(email) {
    var sb = getClient();
    if (!sb) return { ok: false, reason: 'not_configured' };
    var clean = normalizeEmail(email);
    if (!clean) return { ok: false, reason: 'email_required' };
    var res = await sb.auth.signInWithOtp({
      email: clean,
      options: {
        shouldCreateUser: true,
      },
    });
    if (res.error) return { ok: false, reason: friendlyAuthError(res.error) };
    return { ok: true, email: clean };
  }

  async function verifyOtp(email, token) {
    var sb = getClient();
    if (!sb) return { ok: false, reason: 'not_configured' };
    var clean = normalizeEmail(email);
    var code = String(token || '').trim();
    if (!clean) return { ok: false, reason: 'email_required' };
    if (!code) return { ok: false, reason: 'otp_required' };
    var res = await sb.auth.verifyOtp({ email: clean, token: code, type: 'email' });
    if (res.error) return { ok: false, reason: friendlyAuthError(res.error) };
    var st = await refreshStatus();
    return { ok: !!st.active, status: st };
  }

  async function signOut() {
    var sb = getClient();
    if (sb) {
      // scope 를 안 주면 supabase-js v2 의 기본값이 'global' 이다. 그러면 회원이
      // 휴대폰에서 로그아웃했을 뿐인데 본인의 PC·태블릿 로그인까지 함께 끊긴다.
      // 여기서 끊어야 하는 것은 '이 기기'뿐이므로 'local' 로 못 박는다.
      try { await sb.auth.signOut({ scope: 'local' }); } catch (e) {}
    }
    setStatus({ signedIn: false, email: '', active: false, reason: 'not_signed_in', loading: false });
  }

  var QUESTION_PAGE_SIZE = 1000;

  function applyQuestionFilters(query, filters) {
    filters = filters || {};
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.exam) query = query.eq('exam', filters.exam);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.excludeAdvanced) query = query.or('content->>tier.is.null,content->>tier.neq.advanced');
    if (Array.isArray(filters.ids) && filters.ids.length) query = query.in('id', filters.ids);
    return query;
  }

  async function fetchQuestions(filters) {
    var sb = getClient();
    if (!sb) throw new Error('not_configured');
    var rows = [];
    var from = 0;
    while (true) {
      var query = sb.from('questions').select('content').order('question_number', { ascending: true });
      query = applyQuestionFilters(query, filters).range(from, from + QUESTION_PAGE_SIZE - 1);
      var res = await query;
      if (res.error) {
        console.error('[Gwiwha] Supabase questions query failed', res.error);
        throw res.error;
      }
      var page = res.data || [];
      rows = rows.concat(page);
      if (page.length < QUESTION_PAGE_SIZE) break;
      from += QUESTION_PAGE_SIZE;
    }
    return rows.map(function (row) { return row.content; }).filter(Boolean);
  }

  /* 무료 체험 문항 — public.trial_questions 에서 읽는다.
     이 표는 로그인 없이 누구나 읽을 수 있고(정책이 그렇게 되어 있다),
     들어 있는 139행이 공개 상한이다. 원본 questions 표와는 별개다. */
  async function fetchTrialQuestions(track) {
    var sb = getClient();
    if (!sb) throw new Error('not_configured');
    var res = await sb.from('trial_questions').select('content')
      .eq('track', track).order('question_number', { ascending: true });
    if (res.error) {
      console.error('[Gwiwha] trial questions query failed', res.error);
      throw res.error;
    }
    return (res.data || []).map(function (row) { return row.content; }).filter(Boolean);
  }

  async function countQuestions(filters) {
    var sb = getClient();
    if (!sb) throw new Error('not_configured');
    var query = sb.from('questions').select('id', { count: 'exact', head: true });
    var res = await applyQuestionFilters(query, filters || {});
    if (res.error) {
      console.error('[Gwiwha] Supabase questions count failed', res.error);
      throw res.error;
    }
    return res.count || 0;
  }

  window.GwiwhaMembership = {
    init: init,
    refreshStatus: refreshStatus,
    getStatus: getStatus,
    onChange: onChange,
    sendOtp: sendOtp,
    verifyOtp: verifyOtp,
    signOut: signOut,
    fetchQuestions: fetchQuestions,
    countQuestions: countQuestions,
    fetchTrialQuestions: fetchTrialQuestions,
  };
})();
