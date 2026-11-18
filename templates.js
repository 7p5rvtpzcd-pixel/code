// 模板库：常见的竞赛骨架。前四个用 stdio，C / C++ 都能编译。
// 每条带一份示例输入/输出，载入模板时一起填进去，点运行就有结果。
(function () {
  'use strict';

  var READ = [
    '#include <stdio.h>',
    '',
    '// 快读：比 scanf 快，数据量大的题用',
    'static inline int read() {',
    '    int x = 0, f = 1;',
    '    char c = getchar();',
    '    while (c < \'0\' || c > \'9\') {',
    '        if (c == \'-\') f = -1;',
    '        if (c == EOF) return 0;      // 没数据了就退出，别死循环',
    '        c = getchar();',
    '    }',
    '    while (c >= \'0\' && c <= \'9\') {',
    '        x = x * 10 + (c - \'0\');',
    '        c = getchar();',
    '    }',
    '    return x * f;',
    '}',
    '',
    'int main() {',
    '    int n = read();',
    '    long long sum = 0;',
    '    for (int i = 0; i < n; i++) {',
    '        sum += read();',
    '    }',
    '    printf("%lld\\n", sum);',
    '    return 0;',
    '}'
  ].join('\n');

  var BINARY = [
    '#include <stdio.h>',
    '',
    'int a[100005], n;',
    '',
    '// 第一个 >= x 的下标（数组必须有序）',
    'int lowerBound(int x) {',
    '    int l = 0, r = n;        // 区间 [l, r)',
    '    while (l < r) {',
    '        int mid = l + (r - l) / 2;',
    '        if (a[mid] >= x) r = mid;',
    '        else l = mid + 1;',
    '    }',
    '    return l;',
    '}',
    '',
    'int main() {',
    '    int q;',
    '    scanf("%d %d", &n, &q);',
    '    for (int i = 0; i < n; i++) scanf("%d", &a[i]);',
    '    while (q--) {',
    '        int x;',
    '        scanf("%d", &x);',
    '        int p = lowerBound(x);',
    '        printf("%d\\n", p < n && a[p] == x ? p + 1 : -1);',
    '    }',
    '    return 0;',
    '}'
  ].join('\n');

  var DSU = [
    '#include <stdio.h>',
    '',
    'int fa[100005];',
    '',
    'int find(int x) {',
    '    if (fa[x] == x) return x;',
    '    fa[x] = find(fa[x]);         // 路径压缩：赋值要单独写，不能塞进三目里',
    '    return fa[x];',
    '}',
    '',
    'void merge(int a, int b) {',
    '    fa[find(a)] = find(b);',
    '}',
    '',
    'int main() {',
    '    int n, m;',
    '    scanf("%d %d", &n, &m);',
    '    for (int i = 1; i <= n; i++) fa[i] = i;',
    '',
    '    while (m--) {',
    '        int op, a, b;',
    '        scanf("%d %d %d", &op, &a, &b);',
    '        if (op == 1) merge(a, b);',
    '        else printf("%s\\n", find(a) == find(b) ? "YES" : "NO");',
    '    }',
    '    return 0;',
    '}'
  ].join('\n');

  var DFS = [
    '#include <stdio.h>',
    '',
    'int head[100005], nxt[200005], to[200005], cnt = 0;',
    'int vis[100005];',
    '',
    'void addEdge(int u, int v) {',
    '    to[++cnt] = v;',
    '    nxt[cnt] = head[u];',
    '    head[u] = cnt;',
    '}',
    '',
    'void dfs(int u) {',
    '    vis[u] = 1;',
    '    printf("%d ", u);',
    '    for (int e = head[u]; e; e = nxt[e]) {',
    '        if (!vis[to[e]]) dfs(to[e]);',
    '    }',
    '}',
    '',
    'int main() {',
    '    int n, m, s;',
    '    scanf("%d %d %d", &n, &m, &s);',
    '    for (int i = 0; i < m; i++) {',
    '        int u, v;',
    '        scanf("%d %d", &u, &v);',
    '        addEdge(u, v);',
    '    }',
    '    dfs(s);',
    '    printf("\\n");',
    '    return 0;',
    '}'
  ].join('\n');

  var SORT_CPP = [
    '#include <stdio.h>',
    '#include <algorithm>',
    'using namespace std;',
    '',
    'struct Node {',
    '    int id, score;',
    '} a[100005];',
    '',
    '// 分数高的在前，同分按编号小的在前',
    'bool cmp(const Node &x, const Node &y) {',
    '    if (x.score != y.score) return x.score > y.score;',
    '    return x.id < y.id;',
    '}',
    '',
    'int main() {',
    '    int n;',
    '    scanf("%d", &n);',
    '    for (int i = 0; i < n; i++) {',
    '        a[i].id = i + 1;',
    '        scanf("%d", &a[i].score);',
    '    }',
    '    sort(a, a + n, cmp);',
    '    for (int i = 0; i < n; i++) printf("%d %d\\n", a[i].id, a[i].score);',
    '    return 0;',
    '}'
  ].join('\n');

  var SORT_C = [
    '#include <stdio.h>',
    '#include <stdlib.h>',
    '',
    'typedef struct {',
    '    int id, score;',
    '} Node;',
    '',
    'Node a[100005];',
    '',
    '// 分数高的在前，同分按编号小的在前',
    'int cmp(const void *p, const void *q) {',
    '    Node x = *(Node *)p, y = *(Node *)q;',
    '    if (x.score != y.score) return y.score - x.score;',
    '    return x.id - y.id;',
    '}',
    '',
    'int main() {',
    '    int n;',
    '    scanf("%d", &n);',
    '    for (int i = 0; i < n; i++) {',
    '        a[i].id = i + 1;',
    '        scanf("%d", &a[i].score);',
    '    }',
    '    qsort(a, n, sizeof(Node), cmp);',
    '    for (int i = 0; i < n; i++) printf("%d %d\\n", a[i].id, a[i].score);',
    '    return 0;',
    '}'
  ].join('\n');

  // 这四个只用了 stdio，C 和 C++ 都能编译
  var common = [
    {
      name: '快读（读入大量数字）',
      code: READ,
      stdin: '5\n1 2 3 4 5',
      expect: '15'
    },
    {
      name: '二分查找（第一个 >= x）',
      code: BINARY,
      stdin: '5 2\n1 3 5 7 9\n5\n6',
      expect: '3\n-1'
    },
    {
      name: '并查集',
      code: DSU,
      stdin: '4 3\n1 1 2\n1 3 2\n2 1 3',
      expect: 'YES'
    },
    {
      name: 'DFS（邻接表）',
      code: DFS,
      stdin: '4 3 1\n1 2\n2 3\n3 4',
      expect: '1 2 3 4'
    }
  ];

  window.TEMPLATES = {
    cpp: common.concat([{
      name: '结构体排序（sort + cmp）',
      code: SORT_CPP,
      stdin: '3\n90 80 90',
      expect: '1 90\n3 90\n2 80'
    }]),
    c: common.concat([{
      name: '结构体排序（qsort）',
      code: SORT_C,
      stdin: '3\n90 80 90',
      expect: '1 90\n3 90\n2 80'
    }])
  };
})();
