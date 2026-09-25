# Machine coding round — C# problems

## String reverse — built-in ke bina
**Approach:** do pointers — ek shuru mein, ek end mein; dono ke characters swap karo aur beech ki taraf badho. String immutable hai, isliye pehle `char[]` banao.

Interviewer "built-in ke bina" isliye kehta hai ki `Reverse()` / `Array.Reverse` bol ke bach na jao — wo dekhna chahta hai ki tum loop aur indexing theek se likh sakte ho.

- Time: **O(n)**, Space: **O(n)** (char array; string immutable hai to ye zaroori hai)
- Follow-up: "Unicode emoji / combining characters?" — `char` UTF-16 unit hai, emoji do chars ka hota hai; sahi reverse ke liye `StringInfo` text elements
- Follow-up: "Recursion se?" — `Reverse(s.Substring(1)) + s[0]` — par O(n²) aur stack overflow ka risk

```csharp
static string Reverse(string s)
{
    var a = s.ToCharArray();
    for (int i = 0, j = a.Length - 1; i < j; i++, j--)
        (a[i], a[j]) = (a[j], a[i]);          // tuple swap
    return new string(a);
}
// Reverse("hello") → "olleh"
```

! Loop mein `result += s[i]` karke banana — har `+=` naya string banata hai, O(n²). `char[]` ya `StringBuilder` use karo.

## Palindrome check
**Palindrome** aage aur peeche se same padha jaaye: "madam", "racecar". **Approach:** do pointers — shuru aur end se compare karte hue beech tak aao; koi mismatch mila to false. Poora reverse string banane ki zaroorat nahi — O(1) extra space.

Interviewer ka follow-up almost pakka: "**Case aur spaces/punctuation ignore karo**" — "A man, a plan, a canal: Panama" palindrome hai. Tab non-alphanumeric skip karo aur `char.ToLowerInvariant` se compare.

- Time **O(n)**, Space **O(1)**

```csharp
static bool IsPalindrome(string s)
{
    int i = 0, j = s.Length - 1;
    while (i < j)
    {
        while (i < j && !char.IsLetterOrDigit(s[i])) i++;   // punctuation/space skip
        while (i < j && !char.IsLetterOrDigit(s[j])) j--;
        if (char.ToLowerInvariant(s[i]) != char.ToLowerInvariant(s[j])) return false;
        i++; j--;
    }
    return true;
}
// IsPalindrome("A man, a plan, a canal: Panama") → true
```

## Anagram check
**Anagram** — same letters, same count, alag order: "listen" / "silent". 

**Approach 1 (counting, best):** ek frequency array/Dictionary — pehli string ke har char pe +1, doosri ke har char pe −1; end mein sab zero hone chahiye. Length alag ho to turant false. Time **O(n)**.

**Approach 2 (sort):** dono ko sort karke compare. Simple par **O(n log n)**.

Sirf lowercase English letters ho to `int[26]` sabse tez; Unicode ho to `Dictionary<char,int>`.

```csharp
static bool IsAnagram(string a, string b)
{
    if (a.Length != b.Length) return false;
    var count = new int[26];
    for (int i = 0; i < a.Length; i++)
    {
        count[char.ToLower(a[i]) - 'a']++;
        count[char.ToLower(b[i]) - 'a']--;
    }
    return count.All(c => c == 0);
}

// Sort version
static bool IsAnagramSort(string a, string b) =>
    a.Length == b.Length && a.OrderBy(c => c).SequenceEqual(b.OrderBy(c => c));
```

## String mein first non-repeating character
**Approach:** do pass. Pehle pass mein har character ki **count** nikaalo (Dictionary / int array). Doosre pass mein **string ke original order** mein chalo aur pehla character jiski count 1 hai, wahi jawab. Count wali Dictionary pe loop mat karo — uska order guaranteed nahi.

- Time **O(n)**, Space **O(k)** (k = distinct characters)
- "swiss" → `w` (s teen baar, w ek baar, i ek baar — pehla w)

```csharp
static char? FirstNonRepeating(string s)
{
    var count = new Dictionary<char, int>();
    foreach (var c in s) count[c] = count.GetValueOrDefault(c) + 1;
    foreach (var c in s) if (count[c] == 1) return c;
    return null;                                   // sab repeat hote hain
}

// LINQ version (interview mein bol sakte ho, par samjhao ki GroupBy order preserve karta hai)
var first = s.GroupBy(c => c).FirstOrDefault(g => g.Count() == 1)?.Key;
```

## Array mein duplicates find karna
**Approach:** `HashSet` — har element add karo; `Add` false de (already hai) to wo duplicate hai. Ek pass, **O(n)** time, O(n) space. Duplicates unique chahiye to doosra HashSet.

**Nested loops** (har element ko baaki sabse compare) — O(n²), bade input pe bahut slow; interviewer ko pehle ye bata ke phir HashSet pe aao to achha lagta hai (optimization dikhta hai).

Special case: agar numbers **1..n** range mein hain aur extra space nahi dena, to index marking trick (value ko index maan ke us jagah negative karna).

```csharp
static List<int> Duplicates(int[] arr)
{
    var seen = new HashSet<int>();
    var dup  = new HashSet<int>();
    foreach (var x in arr)
        if (!seen.Add(x)) dup.Add(x);     // Add false = pehle se tha
    return dup.ToList();
}
// Duplicates([1,2,3,2,4,1,2]) → [2, 1]

// LINQ
var dups = arr.GroupBy(x => x).Where(g => g.Count() > 1).Select(g => g.Key);
```

## Array mein second largest number
**Approach:** ek hi loop mein do variables — `first` aur `second`. Naya number `first` se bada → purana first, second ban jaata hai. `first` se chhota par `second` se bada **aur first ke barabar nahi** → second update. Sort karne ki zaroorat nahi (O(n log n)) — ye O(n) hai.

Edge cases jo interviewer poochhega: **duplicates** (`[5, 5, 3]` → 3, 5 nahi), **saare same** (`[4,4,4]` → koi second nahi), **negative numbers** (isliye `int.MinValue` se shuru), array mein ek hi element.

```csharp
static int? SecondLargest(int[] a)
{
    int? first = null, second = null;
    foreach (var x in a)
    {
        if (first == null || x > first) { second = first; first = x; }
        else if (x != first && (second == null || x > second)) second = x;
    }
    return second;                          // null = distinct second nahi hai
}
// SecondLargest([10, 5, 10, 8]) → 8

// LINQ (chhota, par O(n log n))
var s = a.Distinct().OrderByDescending(x => x).Skip(1).FirstOrDefault();
```

## FizzBuzz aur uske variants
1 se n tak print karo — 3 se divisible → "Fizz", 5 se → "Buzz", dono se → "FizzBuzz", warna number. **Trap:** 15 wala check **pehle** karo (ya dono conditions jodo), warna 15 pe sirf "Fizz" aayega.

Variants jo poochhe jaate hain: rules configurable banao (7 → "Bazz" jodna ho to code na badle) — `Dictionary`/list of (divisor, word) pe loop, words jodo, khaali ho to number. Ye Open/Closed dikhata hai.

```csharp
for (int i = 1; i <= 15; i++)
{
    if (i % 15 == 0) Console.WriteLine("FizzBuzz");
    else if (i % 3 == 0) Console.WriteLine("Fizz");
    else if (i % 5 == 0) Console.WriteLine("Buzz");
    else Console.WriteLine(i);
}

// Extensible version
var rules = new (int Div, string Word)[] { (3, "Fizz"), (5, "Buzz"), (7, "Bazz") };
for (int i = 1; i <= 21; i++)
{
    var word = string.Concat(rules.Where(r => i % r.Div == 0).Select(r => r.Word));
    Console.WriteLine(word.Length > 0 ? word : i.ToString());
}
```

## Factorial aur Fibonacci — loop aur recursion dono
**Factorial** n! = 1 × 2 × … × n. **Fibonacci**: 0, 1, 1, 2, 3, 5, 8… (har number pichhle do ka jod).

Loop version aam taur pe better hai — O(n), O(1) space. Recursion samajhne mein saaf hai par har call stack pe jaata hai (bade n pe `StackOverflowException`).

**Fibonacci ka trap**: naive recursion `Fib(n-1) + Fib(n-2)` **O(2ⁿ)** hai — same values baar-baar calculate hoti hain (Fib(40) pe seconds lagte hain). Interviewer yahi dekhna chahta hai ki tum ye pakdo aur **memoization** ya loop pe jao.

**Overflow**: 13! `int` mein nahi aata, 21! `long` mein nahi — bade ke liye `BigInteger`. Ye bolna bonus points hai.

```csharp
static long Factorial(int n)                 // loop
{
    long r = 1;
    for (int i = 2; i <= n; i++) r *= i;
    return r;
}
static long FactorialRec(int n) => n <= 1 ? 1 : n * FactorialRec(n - 1);

static long Fib(int n)                       // loop, O(n)
{
    long a = 0, b = 1;
    for (int i = 0; i < n; i++) (a, b) = (b, a + b);
    return a;
}

static long FibMemo(int n, Dictionary<int, long>? memo = null)   // recursion + memo, O(n)
{
    memo ??= new();
    if (n < 2) return n;
    if (memo.TryGetValue(n, out var v)) return v;
    return memo[n] = FibMemo(n - 1, memo) + FibMemo(n - 2, memo);
}
```

! `Fib(n-1) + Fib(n-2)` bina memo ke — exponential time. Isko pakadna hi sawaal ka asli point hai.

## Prime number check
**Prime** — 1 se bada, sirf 1 aur khud se divisible. **Approach:** 2 se **√n** tak check karo — agar n ka koi divisor √n se bada hai, to uska jodidaar √n se chhota hoga, jo pehle hi mil jaata. Isse O(n) se **O(√n)**.

Optimizations: 2 ko alag handle karo, phir sirf **odd** numbers check karo. Loop condition `i * i <= n` (floating point `Math.Sqrt` se bachne ke liye; bade n pe `i <= n / i` overflow se bachata hai).

Follow-up: "1 se N tak saare primes" → **Sieve of Eratosthenes** — O(n log log n).

```csharp
static bool IsPrime(int n)
{
    if (n < 2) return false;
    if (n % 2 == 0) return n == 2;
    for (int i = 3; i <= n / i; i += 2)          // i*i <= n, bina overflow
        if (n % i == 0) return false;
    return true;
}

static List<int> PrimesUpTo(int n)              // Sieve
{
    var composite = new bool[n + 1];
    var primes = new List<int>();
    for (int i = 2; i <= n; i++)
    {
        if (composite[i]) continue;
        primes.Add(i);
        for (long j = (long)i * i; j <= n; j += i) composite[j] = true;
    }
    return primes;
}
```

## Two sum
Array aur target diya hai — do elements dhoondho jinka jod target ho (indices lautao). `[2, 7, 11, 15]`, target 9 → `[0, 1]`.

**Brute force**: har pair check — O(n²). **Best**: ek **Dictionary** (value → index). Har element pe dekho ki `target - x` pehle dekha hai kya; haan to jawab mil gaya; nahi to `x` ko dictionary mein daalo. **Ek pass, O(n)**.

Follow-ups: array **sorted** hai to **two pointers** (shuru aur end se) — O(n) time, O(1) space. Saare pairs chahiye / duplicates allowed — batao kaise handle karoge.

```csharp
static (int, int)? TwoSum(int[] nums, int target)
{
    var seen = new Dictionary<int, int>();          // value → index
    for (int i = 0; i < nums.Length; i++)
    {
        if (seen.TryGetValue(target - nums[i], out int j)) return (j, i);
        seen[nums[i]] = i;
    }
    return null;
}

static (int, int)? TwoSumSorted(int[] a, int target)   // sorted input
{
    int i = 0, j = a.Length - 1;
    while (i < j)
    {
        int sum = a[i] + a[j];
        if (sum == target) return (i, j);
        if (sum < target) i++; else j--;
    }
    return null;
}
```

## Sentence mein word frequency count
**Approach:** sentence ko words mein todo (spaces aur punctuation pe), lowercase karo, aur `Dictionary<string,int>` mein har word ki count badhao. Phir zaroorat ho to count ke hisaab se sort.

Details jo dikhane chahiye: `StringSplitOptions.RemoveEmptyEntries` (double spaces se khaali entries), punctuation hatana, case-insensitive (`StringComparer.OrdinalIgnoreCase` wali dictionary ya lowercase). LINQ version bhi bol sakte ho.

```csharp
static Dictionary<string, int> WordFrequency(string text)
{
    var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
    var words = text.Split(new[] { ' ', ',', '.', '!', '?', ';', ':', '\n', '\t' },
                           StringSplitOptions.RemoveEmptyEntries);
    foreach (var w in words) counts[w] = counts.GetValueOrDefault(w) + 1;
    return counts;
}

// LINQ + top 3
var top = Regex.Matches(text.ToLower(), @"\w+")
    .GroupBy(m => m.Value)
    .OrderByDescending(g => g.Count()).ThenBy(g => g.Key)
    .Take(3)
    .Select(g => $"{g.Key}: {g.Count()}");
```

## List of objects ko LINQ se group aur sort karna
Classic machine-round task: employees/orders ki list di, "department-wise group karo, har group ka count/total, aur sort karo". Isme GroupBy, aggregates, OrderBy/ThenBy, projection sab dikhte hain.

Dhyan: `GroupBy` ke baad `g.Key` aur aggregates (`Count`, `Sum`, `Average`, `Max`) se naya anonymous object/record banao; multi-level sort `OrderBy(...).ThenBy(...)`; composite key ke liye anonymous type `new { e.Dept, e.City }`.

```csharp
record Employee(string Name, string Dept, string City, decimal Salary);

var emps = new List<Employee>
{
    new("Asha", "IT", "Pune", 90000), new("Ravi", "IT", "Ahmedabad", 70000),
    new("Meena", "HR", "Pune", 50000), new("Karan", "IT", "Pune", 85000)
};

var byDept = emps
    .GroupBy(e => e.Dept)
    .Select(g => new
    {
        Dept = g.Key,
        Count = g.Count(),
        Total = g.Sum(e => e.Salary),
        Avg = g.Average(e => e.Salary),
        Names = string.Join(", ", g.OrderBy(e => e.Name).Select(e => e.Name))
    })
    .OrderByDescending(x => x.Total)
    .ThenBy(x => x.Dept);

var byDeptCity = emps.GroupBy(e => new { e.Dept, e.City })       // composite key
                     .Select(g => $"{g.Key.Dept}/{g.Key.City}: {g.Count()}");
```

## Employee list se department-wise max salary — LINQ mein
Do versions poochhe jaate hain: (1) sirf **max salary** per department, (2) **us employee ka naam bhi** jiski salary max hai (aur ties bhi handle karo). Doosra zyada important hai — SQL wale "department highest salary with name" jaisa hi.

.NET 6+ mein `MaxBy()` seedha max wala **object** deta hai (par ties mein sirf ek). Ties chahiye to pehle max nikaalo, phir filter.

```csharp
// 1. Sirf max salary
var maxSal = emps.GroupBy(e => e.Dept)
                 .Select(g => new { Dept = g.Key, Max = g.Max(e => e.Salary) });

// 2. Top earner ka naam (.NET 6+ MaxBy — tie pe ek hi)
var top = emps.GroupBy(e => e.Dept)
              .Select(g => g.MaxBy(e => e.Salary)!);

// 3. Ties bhi
var topWithTies = emps.GroupBy(e => e.Dept)
    .SelectMany(g =>
    {
        var max = g.Max(e => e.Salary);
        return g.Where(e => e.Salary == max);
    });

// Purana tareeka (MaxBy se pehle)
var top2 = emps.GroupBy(e => e.Dept)
               .Select(g => g.OrderByDescending(e => e.Salary).First());
```

## String mein vowels aur characters count karna
**Approach:** har character pe loop — vowel set mein hai to vowel count, letter hai par vowel nahi to consonant, digit, space wagairah alag. Vowels ke liye `HashSet<char>` ya `"aeiou".Contains()` (chhota string, dono chal jaate hain). Case ka dhyan — `char.ToLower`.

Har character ki frequency chahiye to `Dictionary<char,int>` ya lowercase English ke liye `int[26]`.

```csharp
static (int vowels, int consonants, int digits, int spaces) CountChars(string s)
{
    const string V = "aeiou";
    int v = 0, c = 0, d = 0, sp = 0;
    foreach (var ch in s.ToLowerInvariant())
    {
        if (char.IsLetter(ch)) { if (V.Contains(ch)) v++; else c++; }
        else if (char.IsDigit(ch)) d++;
        else if (char.IsWhiteSpace(ch)) sp++;
    }
    return (v, c, d, sp);
}

var freq = "programming".GroupBy(ch => ch).ToDictionary(g => g.Key, g => g.Count());
// r:2, g:2, m:2, o:1, p:1, a:1, i:1, n:1
```

## Sentence mein words reverse karna
Do alag sawaal hote hain — pehle clarify karo:
- **Words ka order ulta**: "I love C#" → "C# love I"
- **Har word ke letters ulte, order same**: "I love C#" → "I evol #C"

Approach: split on spaces (`RemoveEmptyEntries` se extra spaces handle), phir order reverse ya har word reverse, phir join. Built-in ke bina karna ho to split ke baad two-pointer swap words ke array pe.

```csharp
static string ReverseWords(string s)
{
    var words = s.Split(' ', StringSplitOptions.RemoveEmptyEntries);
    for (int i = 0, j = words.Length - 1; i < j; i++, j--)
        (words[i], words[j]) = (words[j], words[i]);
    return string.Join(' ', words);
}
// "  I love   C# " → "C# love I"

static string ReverseEachWord(string s) =>
    string.Join(' ', s.Split(' ').Select(w => new string(w.Reverse().ToArray())));
// "I love C#" → "I evol #C"
```

> Pehle poochho: order ulta karna hai ya har word? Clarifying question poochhna bhi score karta hai.

## Array rotate karna
Array ko k position **right** rotate: `[1,2,3,4,5]`, k=2 → `[4,5,1,2,3]`. Pehle `k = k % n` karo (k array length se bada ho sakta hai, aur n=0 ka dhyan).

**Approach 1 — extra array**: `result[(i + k) % n] = a[i]`. O(n) time, O(n) space. Simple.

**Approach 2 — reversal trick (in-place, O(1) space)**: poora array reverse, phir pehle k reverse, phir baaki reverse. Interviewer aksar yahi dekhna chahta hai.

Left rotate ke liye `k = n - k`.

```csharp
static void RotateRight(int[] a, int k)
{
    int n = a.Length;
    if (n == 0) return;
    k %= n;
    Reverse(a, 0, n - 1);        // [5,4,3,2,1]
    Reverse(a, 0, k - 1);        // [4,5,3,2,1]
    Reverse(a, k, n - 1);        // [4,5,1,2,3]
}
static void Reverse(int[] a, int i, int j)
{
    for (; i < j; i++, j--) (a[i], a[j]) = (a[j], a[i]);
}
```

## Missing number in array 1..n
1 se n tak ke numbers mein se ek gayab hai (array size n−1). **Approach 1 — sum formula**: expected sum `n(n+1)/2` minus actual sum = missing. O(n), O(1). Bade n pe overflow ka dhyan — `long` use karo.

**Approach 2 — XOR** (overflow-free): 1..n sab ka XOR aur array ke sab ka XOR — jo bacha wahi missing (same numbers XOR mein cancel ho jaate hain).

Follow-up: **do numbers missing** hon to sum aur sum-of-squares, ya HashSet; **array sorted** hai to binary search (index vs value mismatch).

```csharp
static int Missing(int[] a, int n)
{
    long expected = (long)n * (n + 1) / 2;
    long actual = 0;
    foreach (var x in a) actual += x;
    return (int)(expected - actual);
}

static int MissingXor(int[] a, int n)
{
    int x = 0;
    for (int i = 1; i <= n; i++) x ^= i;
    foreach (var v in a) x ^= v;
    return x;
}
// Missing([1,2,4,5], 5) → 3
```

## Do arrays ka common element
**Approach:** chhote array ka `HashSet` banao, doosre array pe loop karke jo set mein hai wo common. O(n + m). Result mein duplicate na aayein to result bhi HashSet. LINQ mein seedha `Intersect()` (andar HashSet hi use karta hai, aur distinct deta hai).

Follow-ups: **dono sorted** hain → two pointers, O(n + m), O(1) extra space. **Duplicates count ke saath** chahiye (`[1,2,2,3]` aur `[2,2,4]` → `[2,2]`) → Dictionary se counts.

```csharp
static List<int> Common(int[] a, int[] b)
{
    var set = new HashSet<int>(a);
    var result = new HashSet<int>();
    foreach (var x in b) if (set.Contains(x)) result.Add(x);
    return result.ToList();
}

var common = a.Intersect(b).ToList();            // LINQ

static List<int> CommonSorted(int[] a, int[] b)  // dono sorted
{
    var r = new List<int>(); int i = 0, j = 0;
    while (i < a.Length && j < b.Length)
    {
        if (a[i] == b[j]) { if (r.Count == 0 || r[^1] != a[i]) r.Add(a[i]); i++; j++; }
        else if (a[i] < b[j]) i++; else j++;
    }
    return r;
}
```

## Matrix / 2D array traversal
C# mein do tarah ke 2D arrays: **rectangular** `int[,]` (`GetLength(0)` rows, `GetLength(1)` columns) aur **jagged** `int[][]` (array of arrays, har row ki length alag ho sakti hai, `a[i].Length`).

Common tasks: row-wise/column-wise sum, **transpose**, diagonal sum, **spiral order**, matrix rotate 90°. Spiral sabse zyada poocha jaata hai — boundaries (top, bottom, left, right) rakho aur har side ke baad boundary andar khiskao.

```csharp
int[,] m = { { 1, 2, 3 }, { 4, 5, 6 }, { 7, 8, 9 } };
int rows = m.GetLength(0), cols = m.GetLength(1);

int diag = 0;
for (int i = 0; i < rows; i++) diag += m[i, i];            // 1 + 5 + 9 = 15

static List<int> Spiral(int[,] m)
{
    var r = new List<int>();
    int top = 0, bottom = m.GetLength(0) - 1, left = 0, right = m.GetLength(1) - 1;
    while (top <= bottom && left <= right)
    {
        for (int j = left; j <= right; j++) r.Add(m[top, j]);    top++;
        for (int i = top; i <= bottom; i++) r.Add(m[i, right]);  right--;
        if (top <= bottom) { for (int j = right; j >= left; j--) r.Add(m[bottom, j]); bottom--; }
        if (left <= right) { for (int i = bottom; i >= top; i--) r.Add(m[i, left]);   left++; }
    }
    return r;
}
// Spiral → 1 2 3 6 9 8 7 4 5
```

## Sorted array mein binary search
**Approach:** sorted array mein beech ka element dekho — target barabar hai to mila; target chhota hai to left half, bada hai to right half. Har step mein search space aadha → **O(log n)**. 10 lakh elements mein max ~20 comparisons.

Details jo galti karwate hain:
- `mid = lo + (hi - lo) / 2` — `(lo + hi) / 2` bade indices pe **overflow** kar sakta hai.
- Loop condition `lo <= hi` aur update `lo = mid + 1` / `hi = mid - 1` — warna infinite loop.
- Follow-up: pehla/aakhri occurrence (duplicates), insert position.
- Built-in: `Array.BinarySearch` / `List.BinarySearch` (not found pe negative number deta hai — insert position ka bitwise complement).

```csharp
static int BinarySearch(int[] a, int target)
{
    int lo = 0, hi = a.Length - 1;
    while (lo <= hi)
    {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

static int BinarySearchRec(int[] a, int t, int lo, int hi)
{
    if (lo > hi) return -1;
    int mid = lo + (hi - lo) / 2;
    return a[mid] == t ? mid : a[mid] < t ? BinarySearchRec(a, t, mid + 1, hi) : BinarySearchRec(a, t, lo, mid - 1);
}
```

! Unsorted array pe binary search — galat jawab dega, error nahi. Pehli shart: array sorted ho.

## Bubble sort aur selection sort hath se
**Bubble sort** — baar-baar paas ke elements compare karo aur galat order mein ho to swap. Har pass ke baad sabse bada element end mein "bubble" ho jaata hai. **Optimization**: kisi pass mein ek bhi swap nahi hua to array sorted hai — ruk jao (best case O(n)).

**Selection sort** — har position ke liye baaki array ka **minimum** dhoondho aur us position pe swap karo. Swaps kam (n−1), par comparisons hamesha O(n²).

Dono **O(n²)** hain — asli code mein `Array.Sort` (introsort, O(n log n)) use hota hai. Interviewer sirf loops aur swap logic check karta hai. Follow-up: stable kaun hai? Bubble **stable** (equal elements ka order bana rehta hai), selection **nahi**.

```csharp
static void BubbleSort(int[] a)
{
    for (int i = 0; i < a.Length - 1; i++)
    {
        bool swapped = false;
        for (int j = 0; j < a.Length - 1 - i; j++)      // end ke i elements already sorted
            if (a[j] > a[j + 1]) { (a[j], a[j + 1]) = (a[j + 1], a[j]); swapped = true; }
        if (!swapped) break;                             // pehle hi sorted
    }
}

static void SelectionSort(int[] a)
{
    for (int i = 0; i < a.Length - 1; i++)
    {
        int min = i;
        for (int j = i + 1; j < a.Length; j++) if (a[j] < a[min]) min = j;
        (a[i], a[min]) = (a[min], a[i]);
    }
}
```

## Linked list reverse
**Approach (iterative, sabse common):** teen pointers — `prev` (null se shuru), `curr` (head), `next`. Har node pe: next save karo, `curr.Next = prev` (link ulta), phir `prev = curr`, `curr = next`. End mein `prev` naya head hai. **O(n)** time, **O(1)** space.

Recursive version bhi poocha ja sakta hai — baaki list reverse karo, phir `head.Next.Next = head; head.Next = null`. O(n) stack space.

Galtiyan: `next` save kiye bina link todna (baaki list kho jaati hai), aur purane head ka `Next` null na karna (cycle).

```csharp
class Node { public int Val; public Node? Next; public Node(int v) => Val = v; }

static Node? Reverse(Node? head)
{
    Node? prev = null, curr = head;
    while (curr != null)
    {
        var next = curr.Next;     // aage ka hissa bachao
        curr.Next = prev;         // link ulta
        prev = curr;
        curr = next;
    }
    return prev;
}

static Node? ReverseRec(Node? head)
{
    if (head?.Next == null) return head;
    var newHead = ReverseRec(head.Next);
    head.Next.Next = head;
    head.Next = null;
    return newHead;
}
// 1→2→3→null  becomes  3→2→1→null
```

## Sum of digits, Armstrong aur perfect number
Teeno ka base ek hi trick hai: **number ke digits nikaalna** — `n % 10` se last digit, `n / 10` se last digit hatao, jab tak n 0 na ho.

- **Sum of digits**: 1234 → 10.
- **Armstrong number**: har digit ki power (digits ki ginti) ka jod = number. 153 = 1³ + 5³ + 3³. 9474 = 9⁴+4⁴+7⁴+4⁴.
- **Perfect number**: apne proper divisors ka jod = number. 6 = 1+2+3, 28 = 1+2+4+7+14. Divisors √n tak dhoondho (jodidaar ke saath).

Negative input ka dhyan — `Math.Abs`.

```csharp
static int DigitSum(int n)
{
    n = Math.Abs(n); int s = 0;
    while (n > 0) { s += n % 10; n /= 10; }
    return s;
}

static bool IsArmstrong(int n)
{
    int digits = n.ToString().Length, sum = 0, t = n;
    while (t > 0) { int d = t % 10; sum += (int)Math.Pow(d, digits); t /= 10; }
    return sum == n;
}

static bool IsPerfect(int n)
{
    if (n < 2) return false;
    int sum = 1;
    for (int i = 2; i * i <= n; i++)
        if (n % i == 0) { sum += i; if (i != n / i) sum += n / i; }
    return sum == n;
}
```

## Reverse a number — digit by digit
**Approach:** `while (n != 0)` — last digit `n % 10` nikaalo, `rev = rev * 10 + digit`, phir `n /= 10`. 1234 → 4321.

Edge cases jo interviewer check karta hai:
- **Negative** — C# mein `%` negative ke saath negative deta hai (`-123 % 10 = -3`), to ye formula negative ke liye bhi sahi chal jaata hai: -123 → -321.
- **Trailing zeros** — 1200 → 21 (00 gayab — expected hai).
- **Overflow** — 1,999,999,999 ka reverse int mein nahi aata. `long` mein calculate karo ya `checked` / range check karke 0 lautao (LeetCode wala variant).

```csharp
static int ReverseNumber(int n)
{
    long rev = 0;
    while (n != 0)
    {
        rev = rev * 10 + n % 10;
        n /= 10;
    }
    return rev is > int.MaxValue or < int.MinValue ? 0 : (int)rev;   // overflow guard
}
// 1234 → 4321, -560 → -65
```

## Palindrome number check
Number aage-peeche se same: 121, 1331. **Approach 1**: number reverse karo (upar wala tareeka) aur original se compare. **Approach 2 (overflow-free, better)**: sirf **aadha** number reverse karo — jab reversed half, bache hue number se bada ya barabar ho jaaye, ruk jao; phir compare (odd digits pe beech wala digit `/10` se hatao).

Edge cases: **negative number palindrome nahi** (-121 ulta 121-), **10 ke multiples** (10, 100 — 0 pe khatam, 0 se shuru nahi ho sakte) palindrome nahi, 0 palindrome hai.

String bana ke check karna (`n.ToString()` reverse) bhi chalega — par interviewer aksar "string ke bina" bolta hai.

```csharp
static bool IsPalindromeNumber(int x)
{
    if (x < 0 || (x % 10 == 0 && x != 0)) return false;
    int half = 0;
    while (x > half)
    {
        half = half * 10 + x % 10;
        x /= 10;
    }
    return x == half || x == half / 10;      // odd digits: beech wala hatao
}
// 12321 → x=12, half=123 → 12 == 123/10 → true
```

## Swap two numbers — temp ke saath aur bina temp ke
**Temp ke saath** — sabse saaf aur hamesha sahi: `temp = a; a = b; b = temp;`

**Bina temp ke** (interviewer ka favourite trick):
- **Arithmetic**: `a = a + b; b = a - b; a = a - b;` — par bade numbers pe `a + b` **overflow** kar sakta hai (C# unchecked mein wrap hoke phir bhi sahi result aa jaata hai, par `checked` mein exception) — ye bolna bonus hai.
- **XOR**: `a ^= b; b ^= a; a ^= b;` — overflow nahi. Par agar `a` aur `b` **same variable/memory** ho (jaise `arr[i]` aur `arr[j]` jab i == j), to value 0 ho jaati hai.
- **Modern C#: tuple swap** `(a, b) = (b, a);` — bina temp ke, saaf, aur production mein yahi likho.

```csharp
int a = 5, b = 10;

int temp = a; a = b; b = temp;            // 1. temp

a = a + b; b = a - b; a = a - b;          // 2. arithmetic (overflow risk)

a ^= b; b ^= a; a ^= b;                   // 3. XOR

(a, b) = (b, a);                          // 4. tuple — asli code mein yahi
```

## Largest number in array — foreach + max
**Approach:** pehle element ko max maano (0 ya `int.MinValue` nahi — agar saare negative hon to 0 galat jawab dega... `int.MinValue` chalega par pehla element sabse saaf), phir baaki pe loop karke bada mile to update. **O(n)**, ek pass.

Edge cases: **khaali array** (exception phenko ya null lautao — clarify karo), **saare negative**. LINQ `Max()` khaali sequence pe `InvalidOperationException` deta hai.

Follow-up: min aur max dono ek hi loop mein; largest ka index bhi.

```csharp
static int Largest(int[] a)
{
    if (a.Length == 0) throw new ArgumentException("Array khaali hai");
    int max = a[0];
    foreach (var x in a) if (x > max) max = x;
    return max;
}

static (int min, int max) MinMax(int[] a)
{
    int min = a[0], max = a[0];
    foreach (var x in a) { if (x < min) min = x; if (x > max) max = x; }
    return (min, max);
}
// LINQ: a.Max() — khaali pe exception
```

! `int max = 0;` se shuru karna — `[-5, -2, -9]` pe jawab 0 aayega jo array mein hai hi nahi.

# Machine coding round — practical parts

## 30 minute mein chhota CRUD Web API
Machine round mein aksar laptop deke kehte hain: "Products ka CRUD API banao, EF Core ke saath, 30 minute mein." Ye speed aur structure dono check karta hai. **Plan pehle se ratt lo** taaki time sochne mein na jaaye:

1. `dotnet new webapi -n ProductApi` (Swagger already hota hai — testing ke liye dikhao).
2. **Entity + DbContext** — `Product { Id, Name, Price, Stock }`, `AppDbContext`. Time bachane ke liye **InMemory** ya **SQLite** provider (bolo ki asli mein PostgreSQL hota).
3. **DTOs** — `CreateProductDto` (validation attributes ke saath), `ProductDto`. Entity seedha expose mat karo — interviewer notice karta hai.
4. **Controller** `[ApiController]` — GET all (paging ke saath bonus), GET by id (404), POST (201 + CreatedAtAction), PUT (404/204), DELETE (404/204).
5. **Async** everywhere, `AsNoTracking` reads pe.
6. Time bache to: **service layer** (controller patla), global exception handler, ek unit test.

Bolte-bolte karo: "yahan DTO isliye", "404 isliye" — thinking dikhana code jitna hi important hai.

```csharp
[ApiController, Route("api/[controller]")]
public class ProductsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<ProductDto>> List(int page = 1, int size = 20) =>
        await db.Products.AsNoTracking().OrderBy(p => p.Id)
            .Skip((page - 1) * size).Take(size)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price)).ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductDto>> Get(int id) =>
        await db.Products.Where(p => p.Id == id).Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .FirstOrDefaultAsync() is { } dto ? dto : NotFound();

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(CreateProductDto d)
    {
        var p = new Product { Name = d.Name, Price = d.Price };
        db.Products.Add(p);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = p.Id }, new ProductDto(p.Id, p.Name, p.Price));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id) =>
        await db.Products.Where(p => p.Id == id).ExecuteDeleteAsync() == 0 ? NotFound() : NoContent();
}

public record CreateProductDto([Required, StringLength(100)] string Name, [Range(0.01, 1_000_000)] decimal Price);
public record ProductDto(int Id, string Name, decimal Price);
```

## Diya hua SQL slow hai — optimize karke dikhao
Interviewer ek slow query deta hai. Andaze se index mat lagao — **process dikhao**:

1. **Query samjho** — kya chahiye, kaunse filters, joins, sort.
2. **`EXPLAIN ANALYZE`** chalao — Seq Scan kahan hai, estimated vs actual rows, kaunsa node sabse zyada time le raha hai.
3. **Common culprits dhoondho** — neeche wali list dekho.
- Filter/join column pe **index missing** (khaas kar foreign key)
- Column pe **function** (`WHERE DATE(created_at) = ...`, `lower(email)`) — index use nahi hota → range condition ya expression index
- `SELECT *` — sirf zaroori columns (Index Only Scan ka mauka)
- **`LIKE '%x%'`** — trigram index ya full-text
- **Correlated subquery** jo har row pe chalti hai → JOIN / `EXISTS`
- `OR` conditions jo index tod dein → `UNION ALL` ya alag indexes
- `NOT IN` with NULLs → `NOT EXISTS`
- Bina `LIMIT` ke bada result, `OFFSET` bahut gehra → keyset pagination
- Stale statistics → `ANALYZE`
4. **Fix lagao, dobara `EXPLAIN ANALYZE`** — pehle/baad ka time dikhao.
5. Index ka **trade-off** bolo (writes slow, disk).

```sql
-- Pehle (Seq Scan, function on column)
SELECT * FROM orders WHERE DATE(created_at) = '2026-09-01' AND customer_id = 7;

-- Baad
CREATE INDEX CONCURRENTLY idx_orders_cust_created ON orders (customer_id, created_at);
SELECT id, amount, status FROM orders
WHERE customer_id = 7
  AND created_at >= '2026-09-01' AND created_at < '2026-09-02';
```

## Diya hua code review karna aur bugs batana
Code review round mein ek chhota C# snippet milta hai jisme jaan-boojh ke bugs hote hain. Systematically dekho — checklist dimaag mein rakho:

**Correctness**: null checks (`NullReferenceException`), off-by-one loops, `==` string/object comparison, integer division, exception swallow (`catch {}`), galat `async` (`async void`, `.Result`), `First()` jahan khaali ho sakta hai, collection loop mein modify.

**Resources**: `IDisposable` bina `using` (connection, stream, `HttpClient` new har baar), DbContext lifetime.

**Security**: SQL string concatenation (**SQL injection**), passwords/secrets hardcoded ya logged, input validation missing, entity seedha return (over-exposure).

**Performance**: loop ke andar DB call (N+1), `ToList()` filter se pehle, string concat loop mein, bekaar ka `Count() > 0` (→ `Any()`).

**Design/readability**: magic numbers, bahut lambe methods, naming, duplicated code, hardcoded config.

Bolte waqt **severity ke order** mein bolo (pehle crash/security, phir performance, phir style), aur har bug ka **fix** bhi batao.

```csharp
// Review karo:
public List<User> Search(string name)
{
    var conn = new SqlConnection(_cs);                                    // 1. using nahi — connection leak
    conn.Open();
    var cmd = new SqlCommand("SELECT * FROM Users WHERE Name = '" + name + "'", conn);  // 2. SQL injection
    var list = new List<User>();
    var r = cmd.ExecuteReader();
    while (r.Read()) list.Add(new User { Name = r["Name"].ToString() });  // 3. SELECT * par sirf Name
    if (list.Count() > 0) _log.Info("Found users for " + name);           // 4. Count() → Any(); PII log
    return list;                                                           // 5. paging nahi
}
```

## Angular mein chhota component + service + HTTP call
Frontend machine task: "Users ki list API se laao aur dikhao, loading aur error state ke saath." Structure dikhana hai:

1. **Service** (`providedIn: 'root'`) — `HttpClient` se `getUsers(): Observable<User[]>`. API call component mein nahi.
2. **Interface** `User` — typed response.
3. **Component** — service inject, `users$` observable, template mein **`async` pipe** (subscribe/unsubscribe khud) — ya signals.
4. **Loading aur error states** — ye bhoolna common hai aur interviewer notice karta hai.
5. `@for` mein **`track`**, `provideHttpClient()` config mein.
6. Bonus: search box with `debounceTime` + `switchMap`.

```typescript
export interface User { id: number; name: string; email: string; }

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  getUsers() { return this.http.get<User[]>('/api/users'); }
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    @if (state$ | async; as s) {
      @if (s.loading) { <p>Loading…</p> }
      @else if (s.error) { <p class="err">{{ s.error }}</p> }
      @else { <ul> @for (u of s.users; track u.id) { <li>{{ u.name }} — {{ u.email }}</li> } </ul> }
    }`
})
export class UsersComponent {
  private svc = inject(UserService);
  state$ = this.svc.getUsers().pipe(
    map(users => ({ loading: false, error: '', users })),
    startWith({ loading: true, error: '', users: [] as User[] }),
    catchError(() => of({ loading: false, error: 'Users load nahi hue', users: [] as User[] }))
  );
}
```
