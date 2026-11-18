// 测样例提取：用真实题面（洛谷 P1042）+ 几种常见写法
const extract = require('../extract.js');

const cases = [
  {
    name: '洛谷 P1042（输入 #1复制 + 输出里有空行）',
    text: [
      '题目描述',
      '华华通过以下方式进行分析……',
      '',
      '输入格式',
      '每个输入文件包含若干行字符串，字符串由大写的 W 、 L 和 E 组成。',
      '',
      '输出格式',
      '输出由两部分组成，每部分有若干行。',
      '',
      '输入输出样例',
      '输入 #1复制',
      '',
      'WWWWWWWWWWWWWWWWWWWW',
      'WWLWE',
      '输出 #1复制',
      '',
      '11:0',
      '11:0',
      '1:1',
      '',
      '21:0',
      '2:1',
      '说明/提示',
      '每行至多 25 个字母，最多有 2500 行。'
    ].join('\n'),
    want: [
      {
        stdin: 'WWWWWWWWWWWWWWWWWWWW\nWWLWE',
        expect: '11:0\n11:0\n1:1\n\n21:0\n2:1'
      }
    ]
  },
  {
    name: '洛谷 无「复制」（输入 #1 / 输出 #1）',
    text: ['输入 #1', '3 4', '输出 #1', '7'].join('\n'),
    want: [{ stdin: '3 4', expect: '7' }]
  },
  {
    name: '老写法（样例输入 / 样例输出）',
    text: ['样例输入', '5', '1 2 3 4 5', '样例输出', '15'].join('\n'),
    want: [{ stdin: '5\n1 2 3 4 5', expect: '15' }]
  },
  {
    name: '英文（Sample Input / Sample Output）',
    text: ['Sample Input 1', '2 3', 'Sample Output 1', '5'].join('\n'),
    want: [{ stdin: '2 3', expect: '5' }]
  },
  {
    name: '两组样例',
    text: [
      '样例输入 #1', '1', '样例输出 #1', '1',
      '样例输入 #2', '2', '样例输出 #2', '4'
    ].join('\n'),
    want: [
      { stdin: '1', expect: '1' },
      { stdin: '2', expect: '4' }
    ]
  },
  {
    name: '不该误抓「输入格式」那段说明',
    text: [
      '输入格式',
      '第一行一个整数 n。',
      '输出格式',
      '一个整数。'
    ].join('\n'),
    want: []
  }
];

let pass = 0;
const fails = [];

for (const c of cases) {
  const got = extract(c.text);
  const ok = JSON.stringify(got) === JSON.stringify(c.want);
  if (ok) {
    pass++;
    console.log('✓ ' + c.name);
  } else {
    fails.push(c.name + '\n  期望 ' + JSON.stringify(c.want) + '\n  实际 ' + JSON.stringify(got));
  }
}

console.log('\n通过 ' + pass + ' / ' + cases.length);
if (fails.length) {
  console.log('失败：');
  fails.forEach((f) => console.log(' ✗ ' + f));
  process.exit(1);
}
