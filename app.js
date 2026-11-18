// app.js —— 网页版「代码台」
// 干活全靠两个东西：CodeMirror（编辑器）和 Judge0（云端 g++）

(function () {
  'use strict';

  var JUDGE_URL = 'https://ce.judge0.com/submissions?wait=true&base64_encoded=false';
  var CPP_ID = 105; // C++ (GCC 14.1.0)

  var LS = {
    code: 'wc.code',
    stdin: 'wc.stdin',
    expect: 'wc.expect',
    cases: 'wc.cases',
    snippets: 'wc.snippets'
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
    var res = await fetch(JUDGE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source_code: code, language_id: CPP_ID, stdin: stdin })
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
      var m = /main\.cpp:(\d+):(\d+)/.exec(d.compile_output);
      var where = m ? '（第 ' + m[1] + ' 行 第 ' + m[2] + ' 列）' : '';
      showVerdict('error', '编译失败' + where + '：\n' + String(d.compile_output).trim());
      if (m) highlightLine(Number(m[1]));
      return;
    }

    if (d.status.id === 5) {
      showVerdict('error', '运行超时：可能是死循环，或者程序在等输入。');
      return;
    }

    if (d.status.id === 11 || (d.stderr && String(d.stderr).trim())) {
      showVerdict('error', '运行时错误：\n' + String(d.stderr || '').trim());
      return;
    }

    var out = String(d.stdout || '').replace(/\n+$/, '');
    setOut(out);

    var expect = $('expect').value;
    if (expect.trim()) {
      if (norm(out) === norm(expect)) {
        showVerdict('pass', '✓ 和期望输出一致');
        document.title = 'VERDICT:pass|' + out;
      } else {
        showVerdict('fail', '✗ 和期望不一致\n期望：' + (norm(expect) || '（空）') +
          '\n实际：' + (norm(out) || '（空）'));
        document.title = 'VERDICT:fail|' + out;
      }
    } else {
      showVerdict(null);
      document.title = 'VERDICT:none|' + out;
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
        expect: $('expect').value
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
    persist();
    toast('已载入：' + list[idx].name);
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

    editor.on('change', persistSoon);
    $('stdin').addEventListener('input', persistSoon);
    $('expect').addEventListener('input', persistSoon);

    $('btn-run').addEventListener('click', run);
    $('btn-run-all').addEventListener('click', runAll);
    $('btn-save-case').addEventListener('click', saveCase);
    $('btn-save').addEventListener('click', saveSnippet);
    $('btn-open').addEventListener('click', openSnippets);
    $('btn-new').addEventListener('click', newFile);

    renderCases();
    editor.focus();

    // 自测用：地址栏加 ?auto=1 时自动跑一次（无头浏览器验证用）
    if (location.search.indexOf('auto=1') >= 0) {
      setTimeout(run, 600);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
