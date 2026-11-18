// app.js —— 网页版「代码台」
// 干活全靠两个东西：CodeMirror（编辑器）和 Judge0（云端 g++）

(function () {
  'use strict';

  var BASE = 'https://ce.judge0.com';
  var JUDGE_URL = BASE + '/submissions?wait=true&base64_encoded=false';
  var CPP_ID = 105; // C++ (GCC 14.1.0)

  // 时间/内存上限，默认跟洛谷一致：1 秒 / 128MB
  var LIMIT_PRESETS = [
    { label: '1s / 128MB', cpu: 1, wall: 6, mem: 131072 },
    { label: '2s / 256MB', cpu: 2, wall: 10, mem: 262144 },
    { label: '5s / 512MB', cpu: 5, wall: 20, mem: 524288 }
  ];
  var limitIdx = 0;

  function limits() {
    var p = LIMIT_PRESETS[limitIdx] || LIMIT_PRESETS[0];
    return { cpu_time_limit: p.cpu, wall_time_limit: p.wall, memory_limit: p.mem };
  }

  var LS = {
    code: 'wc.code',
    stdin: 'wc.stdin',
    expect: 'wc.expect',
    cases: 'wc.cases',
    snippets: 'wc.snippets',
    gen: 'wc.gen',
    brute: 'wc.brute',
    problem: 'wc.problem',
    limits: 'wc.limits',
    hist: 'wc.hist',
    theme: 'wc.theme'
  };

  var editor = null;
  var running = false;
  var casesRunning = false;
  var persistTimer = null;

  function $(id) { return document.getElementById(id); }

  // ---------- 本地存储 ----------

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // 无痕模式 / 配额满，忽略
    }
  }

  function persist() {
    if (!editor) return;
    save(LS.code, editor.getValue());
    save(LS.stdin, $('stdin').value);
    save(LS.expect, $('expect').value);
    save(LS.problem, $('problem').value);
  }

  function persistSoon() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persist, 400);
  }

  // ---------- 小工具 ----------

  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.add('hidden'); }, 1800);
  }

  // 判题前抹平无关差异：行尾空格、末尾空行、\r\n
  function norm(text) {
    var lines = String(text === null || text === undefined ? '' : text)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n');
    for (var i = 0; i < lines.length; i++) lines[i] = lines[i].replace(/[ \t]+$/, '');
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
  }

  function insertSoftTab(cm) {
    if (cm.somethingSelected()) {
      cm.indentSelection('add');
      return;
    }
    cm.replaceSelection(new Array(cm.getOption('indentUnit') + 1).join(' '), 'end', '+input');
  }

  function setOut(text) {
    $('out').textContent = text || '';
    $('out').scrollTop = 0;
  }

  function showVerdict(kind, text) {
    var el = $('verdict');
    if (!kind) {
      el.className = 'verdict hidden';
      el.textContent = '';
      return;
    }
    el.className = 'verdict ' + kind;
    el.textContent = text;
  }

  function setBusy(busy) {
    running = busy;
    $('btn-run').disabled = busy;
    $('btn-run').textContent = busy ? '编译中…' : '▶ 运行';
  }

  function highlightLine(n) {
    if (!n || n < 1) return;
    var idx = n - 1;
    editor.addLineClass(idx, 'background', 'cm-error-line');
    editor.scrollIntoView({ line: idx, ch: 0 }, 80);
    setTimeout(function () {
      editor.removeLineClass(idx, 'background', 'cm-error-line');
    }, 2600);
  }

  // ---------- 运行 ----------

  async function postJudge(code, stdin) {
    var L = limits();
    var res = await fetch(JUDGE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language_id: CPP_ID,
        stdin: stdin,
        cpu_time_limit: L.cpu_time_limit,
        wall_time_limit: L.wall_time_limit,
        memory_limit: L.memory_limit
      })
    });
    var data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    return { http: res.status, data: data };
  }

  async function run() {
    if (running) return;

    var code = editor.getValue();
    if (!code.trim()) { toast('代码是空的'); return; }

    persist();
    setBusy(true);
    hideCompile();
    showVerdict('busy', '上传到云端编译…（约 3 秒）');
    setOut('');

    var t0 = Date.now();
    try {
      var r = await postJudge(code, $('stdin').value);
      renderResult(r.data, r.http, Date.now() - t0);
    } catch (e) {
      showVerdict('error', '请求失败：' + (e && e.message ? e.message : e) +
        '\n可能是没网，或者浏览器拦了跨域请求。');
    } finally {
      setBusy(false);
    }
  }

  function renderResult(d, http, ms) {
    d = d || {};
    var info = [];
    if (d.time) info.push(d.time + 's');
    if (d.memory) info.push(Math.round(d.memory / 1024) + 'MB');
    if (ms) info.push('往返 ' + (ms / 1000).toFixed(1) + 's');
    $('meta').textContent = info.join(' · ');

    if (http === 429) {
      showVerdict('error', '公共服务器限流了，等 10 秒再点运行。');
      return;
    }
    if (http >= 400 || !d.status) {
      showVerdict('error', 'Judge0 返回 HTTP ' + http + '，稍后再试。');
      return;
    }

    if (d.compile_output) {
      var parsed = parseCompile(d.compile_output);
      var errs = parsed.filter(function (x) { return x.type === 'err'; });
      var first = errs[0];
      showVerdict('error', '编译失败：' + errs.length + ' 条信息，点下面的行号可以跳过去');
      renderCompile(parsed);
      if (first) jumpToLine(first.line);
      addHistory('运行', 'error', '编译失败 ' + errs.length + ' 条');
      return;
    }

    if (d.status.id === 5) {
      showVerdict('error', '运行超时（超过 ' + LIMIT_PRESETS[limitIdx].cpu + ' 秒）：可能是死循环，或者程序在等输入。');
      addHistory('运行', 'error', '超时');
      return;
    }

    if (d.status.id === 11 || (d.stderr && String(d.stderr).trim())) {
      showVerdict('error', '运行时错误：\n' + String(d.stderr || '').trim());
      addHistory('运行', 'error', '运行时错误');
      return;
    }

    var out = String(d.stdout || '').replace(/\n+$/, '');
    setOut(out);

    var expect = $('expect').value;
    if (expect.trim()) {
      if (norm(out) === norm(expect)) {
        showVerdict('pass', '✓ 和期望输出一致');
        document.title = 'VERDICT:pass|' + out;
        addHistory('运行', 'pass', d.time ? d.time + 's' : '');
      } else {
        showVerdict('fail', '✗ 和期望不一致\n期望：' + (norm(expect) || '（空）') +
          '\n实际：' + (norm(out) || '（空）'));
        document.title = 'VERDICT:fail|' + out;
        addHistory('运行', 'fail', '输出不一致');
      }
    } else {
      showVerdict(null);
      document.title = 'VERDICT:none|' + out;
      addHistory('运行', 'pass', (d.time ? d.time + 's' : '') + '（未判）');
    }
  }

  // ---------- 测试用例 ----------

  function stateText(s) {
    if (s === 'pass') return '✓ 通过';
    if (s === 'fail') return '✗ 不通过';
    if (s === 'running') return '跑…';
    if (s === 'error') return '出错';
    return '未跑';
  }

  function getCases() {
    var list = load(LS.cases, []);
    return list instanceof Array ? list : [];
  }

  function setCases(list) {
    save(LS.cases, list);
    renderCases(list);
  }

  function renderCases(list) {
    list = list || getCases();
    $('case-count').textContent = list.length ? '（' + list.length + '）' : '';

    var ul = $('case-list');
    ul.innerHTML = '';

    if (!list.length) {
      var empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = '把输入和期望填好，点「存用例」。';
      ul.appendChild(empty);
      return;
    }

    list.forEach(function (c) {
      var li = document.createElement('li');

      var name = document.createElement('span');
      name.className = 'case-name';
      name.textContent = c.name;

      var st = document.createElement('span');
      st.className = 'case-state' + (c.state ? ' ' + c.state : '');
      st.textContent = stateText(c.state);

      var del = document.createElement('button');
      del.className = 'case-del';
      del.textContent = '删除';
      del.addEventListener('click', function (ev) {
        ev.stopPropagation();
        removeCase(c.id);
      });

      li.appendChild(name);
      li.appendChild(st);
      li.appendChild(del);
      li.addEventListener('click', function () { loadCase(c); });
      ul.appendChild(li);
    });
  }

  function saveCase() {
    var stdin = $('stdin').value;
    var expect = $('expect').value;
    if (!stdin.trim() && !expect.trim()) { toast('输入和期望都还空着'); return; }

    var list = getCases();
    var answer = prompt('给这组用例起个名字', '用例 ' + (list.length + 1));
    if (answer === null) return;

    var name = answer.trim().slice(0, 20) || ('用例 ' + (list.length + 1));
    list.unshift({ id: Date.now(), name: name, stdin: stdin, expect: expect, state: '' });
    setCases(list);
    toast('用例已保存');
  }

  function loadCase(c) {
    $('stdin').value = c.stdin || '';
    $('expect').value = c.expect || '';
    persist();
    toast('已载入：' + c.name);
  }

  function removeCase(id) {
    if (!confirm('删除这组用例？')) return;
    var list = getCases().filter(function (c) { return c.id !== id; });
    setCases(list);
  }

  async function runAll() {
    if (casesRunning) return;

    var list = getCases();
    if (!list.length) { toast('还没有用例'); return; }

    var code = editor.getValue();
    if (!code.trim()) { toast('代码是空的'); return; }

    casesRunning = true;
    $('btn-run-all').disabled = true;
    $('case-summary').textContent = '';

    var passed = 0;
    for (var i = 0; i < list.length; i++) {
      list[i].state = 'running';
      setCases(list);

      try {
        var r = await postJudge(code, list[i].stdin);
        var d = r.data || {};
        var ok = r.http === 200 && d.status && d.status.id === 3 &&
          norm(d.stdout || '') === norm(list[i].expect);
        list[i].state = r.http === 429 ? 'error' : (ok ? 'pass' : 'fail');
      } catch (e) {
        list[i].state = 'error';
      }

      if (list[i].state === 'pass') passed++;
      setCases(list);
    }

    casesRunning = false;
    $('btn-run-all').disabled = false;
    $('case-summary').textContent = passed + ' / ' + list.length + ' 通过';
    addHistory('对拍', passed === list.length ? 'pass' : 'fail', passed + '/' + list.length + ' 通过');
    toast('对拍完成：' + passed + ' / ' + list.length + ' 通过');
  }

  // ---------- 我的代码 ----------

  function saveSnippet() {
    var list = load(LS.snippets, []);
    if (!(list instanceof Array)) list = [];

    var answer = prompt('给这段代码起个名字', '未命名');
    if (answer === null) return;
    var name = answer.trim().slice(0, 20) || '未命名';

    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name) {
        list[i].code = editor.getValue();
        list[i].stdin = $('stdin').value;
        list[i].expect = $('expect').value;
        list[i].problem = $('problem').value;
        found = true;
        break;
      }
    }
    if (!found) {
      list.unshift({
        id: Date.now(),
        name: name,
        code: editor.getValue(),
        stdin: $('stdin').value,
        expect: $('expect').value,
        problem: $('problem').value
      });
    }

    save(LS.snippets, list);
    toast(found ? '同名已更新：' + name : '已保存：' + name);
  }

  function openSnippets() {
    var list = load(LS.snippets, []);
    if (!(list instanceof Array) || !list.length) { toast('还没保存过代码'); return; }

    var lines = list.map(function (s, i) { return (i + 1) + '. ' + s.name; });
    var answer = prompt('输入编号载入（0 取消）：\n' + lines.join('\n'));
    if (answer === null) return;

    var idx = parseInt(answer, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= list.length) return;

    editor.setValue(list[idx].code || '');
    $('stdin').value = list[idx].stdin || '';
    $('expect').value = list[idx].expect || '';
    $('problem').value = list[idx].problem || '';
    persist();
    toast('已载入：' + list[idx].name);
  }

  // ---------- 随机对拍 ----------

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function chunk(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  // 一次提交一批任务，返回 token 列表（Judge0 每批上限 20）
  async function submitBatchJobs(jobs) {
    var L = limits();
    var r = await fetch(BASE + '/submissions/batch?base64_encoded=false', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        submissions: jobs.map(function (j) {
          return {
            source_code: j.code,
            language_id: CPP_ID,
            stdin: j.stdin || '',
            cpu_time_limit: L.cpu_time_limit,
            wall_time_limit: L.wall_time_limit,
            memory_limit: L.memory_limit
          };
        })
      })
    });
    if (r.status !== 201 && r.status !== 200) throw new Error('提交失败 HTTP ' + r.status);
    var arr = await r.json();
    return arr.map(function (x) { return x.token; });
  }

  // 轮询直到全部跑完（status.id > 2 表示有结果了）
  async function waitBatch(tokens) {
    for (var i = 0; i < 80; i++) {
      var r = await fetch(BASE + '/submissions/batch?tokens=' + tokens.join(',') +
        '&fields=status,stdout,stderr,compile_output,time,memory&base64_encoded=false');
      if (r.ok) {
        var j = await r.json();
        var subs = (j && j.submissions) || [];
        if (subs.length === tokens.length) {
          var done = subs.every(function (s) { return s.status && s.status.id > 2; });
          if (done) return subs;
        }
      }
      await sleep(350);
    }
    throw new Error('等待结果超时（可能是公共服务器太忙）');
  }

  async function runDuel() {
    var n = parseInt($('groups').value, 10);
    if (!(n >= 1)) n = 10;
    if (n > 40) n = 40;

    var sol = editor.getValue();
    var brute = $('brute').value;
    var gen = $('gen').value;

    if (!sol.trim() || !brute.trim() || !gen.trim()) {
      toast('解法 / 暴力 / 生成器，三个都要有');
      return;
    }

    var btn = $('duel-run');
    var res = $('duel-result');
    btn.disabled = true;
    res.className = 'verdict busy';
    res.textContent = '准备中…';

    try {
      // 第一步：生成 n 组输入
      var genJobs = [];
      for (var i = 0; i < n; i++) genJobs.push({ code: gen, stdin: '' });

      var genTokens = [];
      var genChunks = chunk(genJobs, 20);
      for (var c = 0; c < genChunks.length; c++) {
        $('duel-status').textContent = '生成数据 ' + (c + 1) + '/' + genChunks.length;
        genTokens = genTokens.concat(await submitBatchJobs(genChunks[c]));
      }
      var genResults = await waitBatch(genTokens);

      var genErr = genResults.filter(function (s) { return s.compile_output; })[0];
      if (genErr) throw new Error('生成器编译失败：\n' + String(genErr.compile_output).trim());

      var inputs = genResults.map(function (s) { return s.stdout || ''; });

      // 第二步：每组数据，解法和暴力各跑一次
      var jobs = [];
      inputs.forEach(function (inp) {
        jobs.push({ code: sol, stdin: inp });
        jobs.push({ code: brute, stdin: inp });
      });

      var tokens = [];
      var jobChunks = chunk(jobs, 20);
      for (var k = 0; k < jobChunks.length; k++) {
        $('duel-status').textContent = '跑程序 ' + (k + 1) + '/' + jobChunks.length;
        tokens = tokens.concat(await submitBatchJobs(jobChunks[k]));
      }
      var results = await waitBatch(tokens);

      $('duel-status').textContent = '';

      // 第三步：比对
      var solErr = results.filter(function (s, idx) { return idx % 2 === 0 && s.compile_output; })[0];
      if (solErr) throw new Error('解法编译失败：\n' + String(solErr.compile_output).trim());

      var bruteErr = results.filter(function (s, idx) { return idx % 2 === 1 && s.compile_output; })[0];
      if (bruteErr) throw new Error('暴力编译失败：\n' + String(bruteErr.compile_output).trim());

      var bad = -1;
      var tle = 0;
      for (var g = 0; g < n; g++) {
        var a = results[2 * g];
        var b = results[2 * g + 1];
        if (b.status && b.status.id === 5) { tle++; continue; } // 暴力超时，这组数据太大，跳过
        if (norm(a.stdout || '') !== norm(b.stdout || '')) { bad = g; break; }
      }

      if (bad >= 0) {
        var sInput = inputs[bad];
        var sA = results[2 * bad];
        var sB = results[2 * bad + 1];

        // 自动存成用例
        var list = getCases();
        list.unshift({
          id: Date.now(),
          name: '对拍反例 ' + (bad + 1),
          stdin: sInput,
          expect: norm(sB.stdout || ''),
          state: 'fail'
        });
        setCases(list);

        res.className = 'verdict fail';
        res.textContent = '✗ 第 ' + (bad + 1) + ' 组数据不一致（已自动存成用例）\n\n' +
          '输入：\n' + (sInput || '（空）') + '\n\n' +
          '暴力输出：\n' + (norm(sB.stdout || '') || '（空）') + '\n\n' +
          '你的输出：\n' + (norm(sA.stdout || '') || '（空）');
        addHistory('对拍', 'fail', '第 ' + (bad + 1) + ' 组不一致');
        toast('找到反例了，已存成用例');
      } else {
        res.className = 'verdict pass';
        res.textContent = '✓ ' + n + ' 组随机数据全部一致' +
          (tle ? '\n（其中 ' + tle + ' 组暴力超时被跳过，数据可能偏大）' : '');
        addHistory('对拍', 'pass', n + ' 组全一致');
        toast(n + ' 组全部一致');
      }
    } catch (e) {
      res.className = 'verdict error';
      res.textContent = (e && e.message) ? e.message : String(e);
    } finally {
      $('duel-status').textContent = '';
      btn.disabled = false;
    }
  }

  function openDuel() {
    $('duel').classList.remove('hidden');
    $('duel-result').className = 'verdict hidden';
    $('duel-status').textContent = '';
    $('gen').focus();
  }

  function closeDuel() {
    $('duel').classList.add('hidden');
    save(LS.gen, $('gen').value);
    save(LS.brute, $('brute').value);
  }

  // ---------- 编译错误（表格化） ----------

  var LEVEL_TEXT = { error: '[错误]', warning: '[警告]', note: '[提示]' };

  // gcc 的原始输出 → 结构化行
  function parseCompile(text) {
    var lines = String(text || '').split('\n');
    var out = [];
    var errRe = /^main\.cpp:(\d+):(\d+):\s*(error|warning|note):\s*(.*)$/;
    var ctxRe = /^main\.cpp:\s*(.+)$/;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m = errRe.exec(line);
      if (m) {
        out.push({ type: 'err', line: Number(m[1]), col: Number(m[2]), level: m[3], msg: m[4] });
        continue;
      }
      var c = ctxRe.exec(line);
      if (c) out.push({ type: 'ctx', text: c[1].trim() });
    }
    return out;
  }

  function jumpToLine(n) {
    if (!n || n < 1) return;
    editor.setCursor({ line: n - 1, ch: 0 });
    editor.focus();
    highlightLine(n);
  }

  function hideCompile() {
    var box = $('compile');
    box.innerHTML = '';
    box.classList.add('hidden');
  }

  function renderCompile(parsed) {
    var box = $('compile');
    box.innerHTML = '';
    if (!parsed || !parsed.length) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');

    var srcLines = editor.getValue().split('\n');

    parsed.forEach(function (it) {
      if (it.type === 'ctx') {
        var d = document.createElement('div');
        d.className = 'compile-ctx';
        d.textContent = it.text;
        box.appendChild(d);
        return;
      }

      var row = document.createElement('div');
      row.className = 'compile-row';
      row.title = '点一下跳到第 ' + it.line + ' 行';

      var ln = document.createElement('span');
      ln.className = 'compile-ln';
      ln.textContent = String(it.line);

      var lv = document.createElement('span');
      lv.className = 'compile-lv ' + it.level;
      lv.textContent = LEVEL_TEXT[it.level] || '';

      var msg = document.createElement('span');
      msg.className = 'compile-msg';
      msg.textContent = it.msg;

      row.appendChild(ln);
      row.appendChild(lv);
      row.appendChild(msg);
      row.addEventListener('click', function () { jumpToLine(it.line); });
      box.appendChild(row);

      var src = srcLines[it.line - 1];
      if (src !== undefined) {
        var s = document.createElement('div');
        s.className = 'compile-src';
        s.textContent = src;
        box.appendChild(s);
      }
    });
  }

  // ---------- 提交历史 ----------

  function addHistory(kind, verdict, detail) {
    var list = load(LS.hist, []);
    if (!(list instanceof Array)) list = [];

    var now = new Date();
    list.unshift({
      id: Date.now(),
      kind: kind,
      verdict: verdict,
      detail: detail || '',
      time: ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2),
      code: editor.getValue(),
      stdin: $('stdin').value,
      expect: $('expect').value
    });
    if (list.length > 30) list.length = 30;

    save(LS.hist, list);
    renderHistory();
  }

  function renderHistory() {
    var list = load(LS.hist, []);
    if (!(list instanceof Array)) list = [];

    $('hist-count').textContent = list.length ? '（' + list.length + '）' : '';
    var ul = $('hist-list');
    ul.innerHTML = '';

    if (!list.length) {
      var emptyLi = document.createElement('li');
      emptyLi.className = 'empty';
      emptyLi.textContent = '还没有记录，跑一次就会出现';
      ul.appendChild(emptyLi);
      return;
    }

    list.forEach(function (h) {
      var li = document.createElement('li');

      var t = document.createElement('span');
      t.className = 'hist-time';
      t.textContent = h.time;

      var b = document.createElement('span');
      b.className = 'hist-badge ' + h.verdict;
      b.textContent = h.verdict === 'pass' ? '通过' : (h.verdict === 'fail' ? '不通过' : '出错');

      var d = document.createElement('span');
      d.className = 'hist-detail';
      d.textContent = h.kind + (h.detail ? ' · ' + h.detail : '');

      li.appendChild(t);
      li.appendChild(b);
      li.appendChild(d);
      li.title = '点一下恢复那次的代码和输入';
      li.addEventListener('click', function () {
        editor.setValue(h.code || '');
        $('stdin').value = h.stdin || '';
        $('expect').value = h.expect || '';
        persist();
        toast('已恢复 ' + h.time + ' 那一次');
      });
      ul.appendChild(li);
    });
  }

  // ---------- 分享链接 ----------

  function b64enc(s) {
    return btoa(unescape(encodeURIComponent(s)));
  }

  function b64dec(s) {
    return decodeURIComponent(escape(atob(s)));
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast('链接已复制，发给同学就行');
      }, function () {
        prompt('复制这个链接：', text);
      });
    } else {
      prompt('复制这个链接：', text);
    }
  }

  function shareLink() {
    var payload = {
      c: editor.getValue(),
      i: $('stdin').value,
      e: $('expect').value,
      p: $('problem').value
    };
    var url = location.origin + location.pathname + '#s=' + b64enc(JSON.stringify(payload));
    if (url.length > 7500) toast('代码太长，链接可能会被截断');
    copyText(url);
  }

  // 打开页面时带着 #s=... 就把分享的内容填进来
  function loadFromHash() {
    var m = /#s=(.+)$/.exec(location.hash || '');
    if (!m) return false;
    try {
      var o = JSON.parse(b64dec(m[1]));
      if (o.c) editor.setValue(o.c);
      $('stdin').value = o.i || '';
      $('expect').value = o.e || '';
      $('problem').value = o.p || '';
      persist();
      toast('已载入分享的代码');
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- 从题面提取样例 ----------

  // 「样例输入 1」「样例 #2」这类标题里的编号不是数据，要丢掉
  function dropSampleLabel(text) {
    return String(text).replace(/^[\s:：#\d]{0,6}$/, '').replace(/^[\s:：#]*[#]?\d{1,2}\s*$/, '');
  }

  function extractFromText(text) {
    var lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    var groups = [];
    var cur = null;
    var mode = null;

    function isIn(l) { return /(样例\s*输入|输入样例|Sample\s*Input)/i.test(l); }
    function isOut(l) { return /(样例\s*输出|输出样例|Sample\s*Output)/i.test(l); }
    function isStop(l) { return /(数据范围|提示|说明|样例\s*\d)/i.test(l); }

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];

      if (isIn(l)) {
        cur = { stdin: [], expect: [] };
        groups.push(cur);
        mode = 'in';
        var tail = l.replace(/^.*?(样例\s*输入|输入样例|Sample\s*Input)[^\n]*?[:：]?\s*/i, '');
        tail = dropSampleLabel(tail);
        if (tail.trim()) cur.stdin.push(tail);
        continue;
      }

      if (isOut(l)) {
        if (!cur) { cur = { stdin: [], expect: [] }; groups.push(cur); }
        mode = 'out';
        var tail2 = l.replace(/^.*?(样例\s*输出|输出样例|Sample\s*Output)[^\n]*?[:：]?\s*/i, '');
        tail2 = dropSampleLabel(tail2);
        if (tail2.trim()) cur.expect.push(tail2);
        continue;
      }

      if (!cur || !mode) continue;
      if (isStop(l)) { mode = null; continue; }
      if (l.trim() === '') continue;

      if (mode === 'in') cur.stdin.push(l);
      else cur.expect.push(l);
    }

    return groups.map(function (g) {
      return { stdin: g.stdin.join('\n').trim(), expect: g.expect.join('\n').trim() };
    }).filter(function (g) {
      return g.stdin || g.expect;
    });
  }

  function doExtract() {
    var text = $('problem').value;
    if (!text.trim()) {
      toast('题目笔记是空的，先把题面粘进去');
      return;
    }

    var groups = extractFromText(text);
    if (!groups.length) {
      $('extract-info').textContent = '没找到「样例输入 / 样例输出」这样的标题';
      return;
    }

    $('stdin').value = groups[0].stdin;
    $('expect').value = groups[0].expect;

    var list = getCases();
    var stamp = Date.now();
    groups.forEach(function (g, i) {
      list.unshift({ id: stamp + i, name: '样例' + (i + 1), stdin: g.stdin, expect: g.expect, state: '' });
    });
    setCases(list);

    $('extract-info').textContent = '找到 ' + groups.length + ' 组，已填第一组并全部存成用例';
    if (location.search.indexOf('extract=1') >= 0) {
      document.title = 'EXTRACT:' + groups.length + '|' + JSON.stringify(groups[0]);
    }
    toast('提取到 ' + groups.length + ' 组样例');
  }

  // ---------- 主题 ----------

  function applyTheme(light) {
    document.body.classList.toggle('light', !!light);
    $('btn-theme').textContent = light ? '浅色' : '深色';
    save(LS.theme, !!light);
  }

  // ---------- 初始化 ----------

  function pickSample(i) {
    var s = SAMPLES[i];
    if (!s) return;
    editor.setValue(s.code);
    $('stdin').value = s.stdin || '';
    $('expect').value = s.expect || '';
    showVerdict(null);
    setOut('');
    $('meta').textContent = '';
    persist();
    editor.focus();
  }

  function newFile() {
    if (!confirm('清空当前代码和输入？')) return;
    editor.setValue(SAMPLES[0].code);
    $('stdin').value = '';
    $('expect').value = '';
    showVerdict(null);
    setOut('');
    $('meta').textContent = '';
    persist();
  }

  function init() {
    var sel = $('samples');
    SAMPLES.forEach(function (s, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = s.name;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      pickSample(Number(sel.value));
      sel.selectedIndex = 0;
    });

    // 时间 / 内存限制
    var limSel = $('limits');
    LIMIT_PRESETS.forEach(function (p, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = p.label;
      limSel.appendChild(o);
    });
    limitIdx = Number(load(LS.limits, 0));
    if (!(limitIdx >= 0 && limitIdx < LIMIT_PRESETS.length)) limitIdx = 0;
    limSel.value = String(limitIdx);
    limSel.addEventListener('change', function () {
      limitIdx = Number(limSel.value) || 0;
      save(LS.limits, limitIdx);
      toast('已切换：' + LIMIT_PRESETS[limitIdx].label);
    });

    editor = CodeMirror.fromTextArea($('code'), {
      mode: 'text/x-c++src',
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      smartIndent: true,
      electricChars: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      styleActiveLine: true,
      lineWrapping: false,
      extraKeys: {
        'Ctrl-Enter': run,
        'Cmd-Enter': run,
        'Ctrl-S': function () { saveSnippet(); return false; },
        'Cmd-S': function () { saveSnippet(); return false; },
        Tab: insertSoftTab
      }
    });

    var savedCode = load(LS.code, null);
    editor.setValue(typeof savedCode === 'string' && savedCode.length ? savedCode : SAMPLES[0].code);
    $('stdin').value = load(LS.stdin, SAMPLES[0].stdin || '');
    $('expect').value = load(LS.expect, SAMPLES[0].expect || '');
    $('problem').value = load(LS.problem, '');

    editor.on('change', persistSoon);
    $('stdin').addEventListener('input', persistSoon);
    $('expect').addEventListener('input', persistSoon);
    $('problem').addEventListener('input', persistSoon);

    $('btn-run').addEventListener('click', run);
    $('btn-run-all').addEventListener('click', runAll);
    $('btn-save-case').addEventListener('click', saveCase);
    $('btn-save').addEventListener('click', saveSnippet);
    $('btn-open').addEventListener('click', openSnippets);
    $('btn-new').addEventListener('click', newFile);

    // 对拍
    $('gen').value = load(LS.gen, DEFAULT_GEN);
    $('brute').value = load(LS.brute, DEFAULT_BRUTE);
    $('btn-duel').addEventListener('click', openDuel);
    $('duel-close').addEventListener('click', closeDuel);
    $('duel-run').addEventListener('click', runDuel);
    $('duel').addEventListener('click', function (e) {
      if (e.target === $('duel')) closeDuel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDuel();
    });

    // 主题 / 历史 / 分享 / 提取样例
    applyTheme(!!load(LS.theme, false));
    renderHistory();
    $('btn-share').addEventListener('click', shareLink);
    $('btn-theme').addEventListener('click', function () {
      applyTheme(!document.body.classList.contains('light'));
    });
    $('btn-extract').addEventListener('click', doExtract);
    loadFromHash();
    if (location.search.indexOf('theme=light') >= 0) applyTheme(true);
    if (location.search.indexOf('extract=1') >= 0) setTimeout(doExtract, 300);

    renderCases();
    editor.focus();

    // 自测用：地址栏加 ?auto=1 自动跑一次；加 ?duel=1 自动跑一次对拍
    if (location.search.indexOf('auto=1') >= 0) {
      setTimeout(run, 600);
    }
    if (location.search.indexOf('duel=1') >= 0) {
      setTimeout(function () {
        openDuel();
        runDuel();
      }, 600);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
