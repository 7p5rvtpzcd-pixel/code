// 示例 / 对拍默认代码，按语言分开
window.SAMPLES = {
  cpp: [
    {
      name: '读 n 个数求和',
      code: [
        '#include <iostream>',
        'using namespace std;',
        '',
        'int main() {',
        '    int n;',
        '    cin >> n;',
        '    int sum = 0;',
        '    for (int i = 0; i < n; i++) {',
        '        int x;',
        '        cin >> x;',
        '        sum += x;',
        '    }',
        '    cout << sum << endl;',
        '    return 0;',
        '}'
      ].join('\n'),
      stdin: '5\n1 2 3 4 5',
      expect: '15'
    },
    {
      name: 'A+B（cin）',
      code: [
        '#include <iostream>',
        'using namespace std;',
        '',
        'int main() {',
        '    int a, b;',
        '    cin >> a >> b;',
        '    cout << a + b << endl;',
        '    return 0;',
        '}'
      ].join('\n'),
      stdin: '3 4',
      expect: '7'
    },
    {
      name: '冒泡排序（数组）',
      code: [
        '#include <iostream>',
        'using namespace std;',
        '',
        'int a[1005];',
        '',
        'int main() {',
        '    int n;',
        '    cin >> n;',
        '    for (int i = 0; i < n; i++) cin >> a[i];',
        '',
        '    for (int i = 0; i < n - 1; i++) {',
        '        for (int j = 0; j < n - 1 - i; j++) {',
        '            if (a[j] > a[j + 1]) {',
        '                int t = a[j];',
        '                a[j] = a[j + 1];',
        '                a[j + 1] = t;',
        '            }',
        '        }',
        '    }',
        '',
        '    for (int i = 0; i < n; i++) cout << a[i] << " ";',
        '    cout << endl;',
        '    return 0;',
        '}'
      ].join('\n'),
      stdin: '5\n5 2 9 1 7',
      expect: '1 2 5 7 9'
    },
    {
      name: '斐波那契（递归）',
      code: [
        '#include <cstdio>',
        '',
        'long long fib(int n) {',
        '    if (n <= 2) return 1;',
        '    return fib(n - 1) + fib(n - 2);',
        '}',
        '',
        'int main() {',
        '    printf("%lld\\n", fib(35));',
        '    return 0;',
        '}'
      ].join('\n'),
      stdin: '',
      expect: '9227465'
    },
    {
      name: '100 以内素数',
      code: [
        '#include <cstdio>',
        '',
        'int main() {',
        '    for (int n = 2; n <= 100; n++) {',
        '        int prime = 1;',
        '        for (int d = 2; d * d <= n; d++) {',
        '            if (n % d == 0) { prime = 0; break; }',
        '        }',
        '        if (prime) printf("%d ", n);',
        '    }',
        '    printf("\\n");',
        '    return 0;',
        '}'
      ].join('\n'),
      stdin: '',
      expect: '2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 53 59 61 67 71 73 79 83 89 97'
    },
    {
      name: 'STL: vector + sort',
      code: [
        '#include <iostream>',
        '#include <vector>',
        '#include <algorithm>',
        'using namespace std;',
        '',
        'int main() {',
        '    int n;',
        '    cin >> n;',
        '    vector<int> v(n);',
        '    for (int i = 0; i < n; i++) cin >> v[i];',
        '',
        '    sort(v.begin(), v.end());',
        '',
        '    for (int x : v) cout << x << " ";',
        '    cout << endl;',
        '    return 0;',
        '}'
      ].join('\n'),
      stdin: '5\n5 2 9 1 7',
      expect: '1 2 5 7 9'
    }
  ],

  c: [
    {
      name: '读 n 个数求和',
      code: [
        '#include <stdio.h>',
        '',
        'int main() {',
        '    int n;',
        '    scanf("%d", &n);',
        '',
        '    int sum = 0;',
        '    for (int i = 0; i < n; i++) {',
        '        int x;',
        '        scanf("%d", &x);',
        '        sum += x;',
        '    }',
        '',
        '    printf("%d\\n", sum);',
        '    return 0;',
        '}'
      ].join('\n'),
      stdin: '5\n1 2 3 4 5',
      expect: '15'
    },
    {
      name: 'A+B（scanf）',
      code: [
        '#include <stdio.h>',
        '',
        'int main() {',
        '    int a, b;',
        '    scanf("%d %d", &a, &b);',
        '    printf("%d\\n", a + b);',
        '    return 0;',
        '}'
      ].join('\n'),
      stdin: '3 4',
      expect: '7'
    },
    {
      name: '冒泡排序（数组）',
      code: [
        '#include <stdio.h>',
        '',
        'int a[1005];',
        '',
        'int main() {',
        '    int n;',
        '    scanf("%d", &n);',
        '    for (int i = 0; i < n; i++) scanf("%d", &a[i]);',
        '',
        '    for (int i = 0; i < n - 1; i++) {',
        '        for (int j = 0; j < n - 1 - i; j++) {',
        '            if (a[j] > a[j + 1]) {',
        '                int t = a[j];',
        '                a[j] = a[j + 1];',
        '                a[j + 1] = t;',
        '            }',
        '        }',
        '    }',
        '',
        '    for (int i = 0; i < n; i++) printf("%d ", a[i]);',
        '    printf("\\n");',
        '    return 0;',
        '}'
      ].join('\n'),
      stdin: '5\n5 2 9 1 7',
      expect: '1 2 5 7 9'
    },
    {
      name: '100 以内素数',
      code: [
        '#include <stdio.h>',
        '',
        'int main() {',
        '    for (int n = 2; n <= 100; n++) {',
        '        int prime = 1;',
        '        for (int d = 2; d * d <= n; d++) {',
        '            if (n % d == 0) { prime = 0; break; }',
        '        }',
        '        if (prime) printf("%d ", n);',
        '    }',
        '    printf("\\n");',
        '    return 0;',
        '}'
      ].join('\n'),
      stdin: '',
      expect: '2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 53 59 61 67 71 73 79 83 89 97'
    }
  ]
};

// 对拍默认代码（按语言）
window.DEFAULT_GEN = {
  cpp: [
    '#include <iostream>',
    '#include <cstdlib>',
    '#include <ctime>',
    'using namespace std;',
    '',
    'int main() {',
    '    srand(time(0));',
    '    int n = 1 + rand() % 10;',
    '    cout << n << endl;',
    '    for (int i = 0; i < n; i++) cout << 1 + rand() % 100 << " ";',
    '    cout << endl;',
    '    return 0;',
    '}'
  ].join('\n'),
  c: [
    '#include <stdio.h>',
    '#include <stdlib.h>',
    '#include <time.h>',
    '',
    'int main() {',
    '    srand(time(0));',
    '    int n = 1 + rand() % 10;',
    '    printf("%d\\n", n);',
    '    for (int i = 0; i < n; i++) printf("%d ", 1 + rand() % 100);',
    '    printf("\\n");',
    '    return 0;',
    '}'
  ].join('\n')
};

window.DEFAULT_BRUTE = {
  cpp: [
    '#include <iostream>',
    'using namespace std;',
    '',
    'int a[20], n;',
    '',
    'long long sumFrom(int i) {',
    '    if (i == n) return 0;',
    '    return a[i] + sumFrom(i + 1);',
    '}',
    '',
    'int main() {',
    '    cin >> n;',
    '    for (int i = 0; i < n; i++) cin >> a[i];',
    '    cout << sumFrom(0) << endl;',
    '    return 0;',
    '}'
  ].join('\n'),
  c: [
    '#include <stdio.h>',
    '',
    'int a[20], n;',
    '',
    'long long sumFrom(int i) {',
    '    if (i == n) return 0;',
    '    return a[i] + sumFrom(i + 1);',
    '}',
    '',
    'int main() {',
    '    scanf("%d", &n);',
    '    for (int i = 0; i < n; i++) scanf("%d", &a[i]);',
    '    printf("%lld\\n", sumFrom(0));',
    '    return 0;',
    '}'
  ].join('\n')
};
