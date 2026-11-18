// 从题面文字里提取「样例输入 / 样例输出」
// 单独成文件是为了能在电脑上用 Node 直接测（不依赖页面）
(function () {
  'use strict';

  function stripCopy(s) {
    return String(s).replace(/[\s:：]*(复制|Copy)\s*$/i, '').trim();
  }

  // 能认的标题写法：
  //   样例输入 / 输入样例 / 输入 / 输入 #1 / Sample Input / Sample Input 1
  var IN_RE = /^(?:样例\s*输入|输入样例|Sample\s*Input|输入)\s*[#＃]?\s*\d{0,2}\s*[:：]?$/i;
  var OUT_RE = /^(?:样例\s*输出|输出样例|Sample\s*Output|输出)\s*[#＃]?\s*\d{0,2}\s*[:：]?$/i;

  // 见到这些就说明样例结束了
  var STOP_RE = /^(说明|提示|数据范围|注意|备注|标签|难度|来源|【|输入格式|输出格式|输入输出样例)/;

  function trimBlank(lines) {
    var a = lines.slice();
    while (a.length && a[a.length - 1] === '') a.pop();
    return a;
  }

  function extractSamples(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var groups = [];
    var cur = null;
    var mode = null;

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var line = stripCopy(raw.trim());

      if (IN_RE.test(line)) {
        cur = { inLines: [], outLines: [] };
        groups.push(cur);
        mode = 'in';
        continue;
      }

      if (OUT_RE.test(line)) {
        if (!cur) {
          cur = { inLines: [], outLines: [] };
          groups.push(cur);
        }
        mode = 'out';
        continue;
      }

      if (!cur || !mode) continue;
      if (STOP_RE.test(line)) {
        mode = null;
        continue;
      }

      var target = mode === 'in' ? cur.inLines : cur.outLines;

      // 块开头的空行不要（标题和数据之间通常隔一个空行）
      // 但块**中间**的空行要留：样例输出里可能就是有空行的
      if (raw.trim() === '' && target.length === 0) continue;
      target.push(raw.replace(/\s+$/, ''));
    }

    return groups
      .map(function (g) {
        return {
          stdin: trimBlank(g.inLines).join('\n'),
          expect: trimBlank(g.outLines).join('\n')
        };
      })
      .filter(function (g) {
        return g.stdin || g.expect;
      });
  }

  if (typeof window !== 'undefined') window.extractSamples = extractSamples;
  if (typeof module !== 'undefined' && module.exports) module.exports = extractSamples;
})();
