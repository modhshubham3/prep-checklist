// Lessons: short explanation + hand-authored animated trace + predict-first question + playground starter.
// Frame shape: { l: line index in `code`, v: ALL variables after that line runs, s: narration }. "out" = accumulated console.log text.
window.LEARN = [
  {
    id: "variables-and-types",
    title: "Variables aur Types — data ka dabba aur uski kism",
    level: 1,
    goal: "let/const se value store karna, aur number vs string ka fark samajhna taaki \"5\" + 3 tumhe kabhi surprise na kare.",
    why: "Real code ka aadha bug yahin se aata hai: form se aayi value hamesha string hoti hai, aur tum use number samajh ke jodte ho. Interview mein 'output kya aayega' wale sawal isi fark pe bante hain. Jab tum khud type soch sakte ho, tab AI ka diya code bina andhe vishwas ke padh paate ho.",
    parts: [
      { h: "Idea", text: "Variable ek dabba hai jis par naam ka sticker laga hai, aur andar ek value. `let` ka dabba kholke andar ka saaman badal sakte ho. `const` seal-band dabba hai: ek baar bhar diya, dobara assign nahi kar sakte." },
      { h: "Types", text: "Har value ki ek kism (type) hoti hai. `5` number hai, `\"5\"` string (text) hai, `true` boolean hai. Quotes ke andar jo bhi hai wo text hai, chahe wo digits hi kyun na ho. `typeof x` batata hai dabbe mein kis kism ka saaman hai." },
      { h: "Syntax", text: "`let age = 25;` ya `const city = \"Pune\";`. Value badalni ho to `age = 26;` (let hai tabhi). Naam ke baad `=` ka matlab 'barabar' nahi, 'rakh do' hai." },
      { h: "Aam galti", text: "`+` ke do kaam hain: number + number = jodna, lekin string + kuch bhi = chipkana. Isliye `\"5\" + 3` ka jawab `\"53\"` hai, 8 nahi. Fix: `Number(\"5\") + 3` jo 8 deta hai." }
    ],
    code: [
      "const a = \"5\";",
      "let b = 5;",
      "let joined = a + 3;",
      "let added = b + 3;",
      "console.log(joined, added);",
      "console.log(typeof joined, typeof added);"
    ],
    frames: [
      { l: 0, v: { a: "5" }, s: "a banaya aur usme text \"5\" rakha (quotes hain, to ye string hai, number nahi)." },
      { l: 1, v: { a: "5", b: 5 }, s: "b mein asli number 5 rakha. Dono dekhne mein 5 hain, par kism alag hai." },
      { l: 2, v: { a: "5", b: 5, joined: "53" }, s: "a ek string hai, isliye + jodta nahi, chipkata hai: \"5\" aur 3 mil ke \"53\" bana (text)." },
      { l: 3, v: { a: "5", b: 5, joined: "53", added: 8 }, s: "b number hai, to + sach mein jodta hai: 5 + 3 = 8." },
      { l: 4, v: { a: "5", b: 5, joined: "53", added: 8, out: "53 8" }, s: "Print hua: 53 aur 8. Pehla text hai, doosra number." },
      { l: 5, v: { a: "5", b: 5, joined: "53", added: 8, out: "53 8\nstring number" }, s: "typeof batata hai: joined string hai, added number. Yehi fark poora surprise tha." }
    ],
    predict: {
      q: "Pehli console.log line (`console.log(joined, added)`) kya print karegi?",
      options: ["8 8", "53 8", "53 53", "8 53"],
      answer: 1,
      why: "a = \"5\" string hai, to a + 3 chipkta hai aur \"53\" banta hai. b = 5 number hai, to b + 3 = 8. Trace mein dekho: joined \"53\" (quotes ke saath) aur added 8 (bina quotes)."
    },
    tryIt: "// a ko Number(a) karke dekho: let joined = Number(a) + 3;  ab kya aata hai?\nconst a = \"5\";\nlet b = 5;\nlet joined = a + 3;\nlet added = b + 3;\nconsole.log(joined, added);\nconsole.log(typeof joined, typeof added);\n",
    exercises: []
  },
  {
    id: "conditions",
    title: "Conditions — if/else se faisla karna",
    level: 1,
    goal: "if / else if / else likhna, comparison aur && || se shart banana, aur == vs === ka fark jaanna.",
    why: "Har program faisle leta hai: login ho gaya ya nahi, discount milega ya nahi, number even hai ya nahi. FizzBuzz jaise interview sawal poore conditions ka khel hain. Jo condition tum khud soch ke likh sakte ho, wahi tum debug bhi kar paoge.",
    parts: [
      { h: "Idea", text: "Chauraahe pe ruk ke dekho: 'agar marks 90 se zyada, to A; warna agar 60 se zyada, to B; warna C'. Computer upar se neeche shart check karta hai, jo pehli sach (true) mile uska hissa chalata hai, baaki sab chhod deta hai." },
      { h: "Syntax", text: "`if (shart) { ... } else if (shart2) { ... } else { ... }`. Shart ke liye `>`, `<`, `>=`, `<=`, `===` (barabar), `!==`. Do shart jodne ke liye `&&` (dono sach) aur `||` (koi ek sach)." },
      { h: "Aam galti", text: "`=` rakhta hai, `===` compare karta hai. `==` type badal ke compare karta hai: `\"5\" == 5` true aata hai, `\"5\" === 5` false. Hamesha `===` use karo. Falsy values yaad rakho: `0`, `\"\"`, `null`, `undefined`, `NaN`, `false`. Khali array `[]` aur `\"0\"` truthy hain!" }
    ],
    code: [
      "let marks = 72;",
      "let grade = \"?\";",
      "if (marks >= 90) {",
      "  grade = \"A\";",
      "} else if (marks >= 60) {",
      "  grade = \"B\";",
      "} else {",
      "  grade = \"C\";",
      "}",
      "console.log(grade);"
    ],
    frames: [
      { l: 0, v: { marks: 72 }, s: "marks banaya, value 72." },
      { l: 1, v: { marks: 72, grade: "?" }, s: "grade ko abhi ek placeholder \"?\" diya. Faisla aage hoga." },
      { l: 2, v: { marks: 72, grade: "?" }, s: "Pehli shart: 72 >= 90? Nahi, false. To line 3 (grade = \"A\") skip, seedha agle else if par." },
      { l: 4, v: { marks: 72, grade: "?" }, s: "Doosri shart: 72 >= 60? Haan, true! Is block mein ghusenge." },
      { l: 5, v: { marks: 72, grade: "B" }, s: "grade ab \"B\". Baaki else wala block chalega hi nahi, kyunki ek shart sach mil gayi." },
      { l: 9, v: { marks: 72, grade: "B", out: "B" }, s: "if-else chain khatam, neeche aake grade print hua: B." }
    ],
    predict: {
      q: "marks = 72 ke liye aakhir mein kya print hoga?",
      options: ["A", "B", "C", "B aur C dono"],
      answer: 1,
      why: "72 >= 90 false, to A nahi. 72 >= 60 true, to grade = \"B\" ho gaya. Chain mein jaise hi ek block chal gaya, baaki else if / else ko dekha bhi nahi jaata, isliye C ya 'dono' nahi."
    },
    tryIt: "// marks ko 95 karke dekho, phir 40 karke. Phir ek nayi shart try karo: marks >= 60 && marks < 70\nlet marks = 72;\nlet grade = \"?\";\nif (marks >= 90) {\n  grade = \"A\";\n} else if (marks >= 60) {\n  grade = \"B\";\n} else {\n  grade = \"C\";\n}\nconsole.log(grade);\n",
    exercises: ["fizzbuzz", "count-evens"]
  },
  {
    id: "loops",
    title: "Loops — kaam ko baar-baar karna",
    level: 1,
    goal: "for loop likhna, accumulator (total jodte jana) pattern use karna, aur off-by-one galti pakadna.",
    why: "Jahan bhi 'har item ke liye' ya 'jab tak' sunai de, wahan loop hai: list ka total, sab users check karna, digits todna. Interview ke aadhe sawal loop + ek variable ka khel hain. Loop ko dimaag mein chalana seekh lo, phir AI ka code copy karna zaroori nahi rahega.",
    parts: [
      { h: "Idea", text: "Maan lo 4 dukaan se samaan ka bill jodna hai. Tum ek parchi pe total 0 se shuru karte ho, har dukaan ka amount us parchi pe jodte jaate ho. Wo parchi accumulator hai, aur 'har dukaan ke liye jodna' loop hai." },
      { h: "Syntax", text: "`for (shuru; shart; badlav) { kaam }`. Jaise `for (let i = 1; i <= 4; i++)`: i ko 1 se shuru karo, jab tak `i <= 4` sach hai kaam karo, har round ke baad `i++` (i ko 1 badhao). `while (shart) { ... }` bhi wahi, bas shuru aur badlav tum khud likhte ho." },
      { h: "Aam galti", text: "Off-by-one: `i < 4` likha to 4 chhoot jaata hai, `i <= 4` mein aata hai. Doosri galti: accumulator loop ke andar `let total = 0` kar dena, to har round reset ho jaata hai. Teesri: `while` mein badlav bhool jao to loop kabhi nahi rukta." }
    ],
    code: [
      "let total = 0;",
      "for (let i = 1; i <= 4; i++) {",
      "  total = total + i;",
      "}",
      "console.log(total);"
    ],
    frames: [
      { l: 0, v: { total: 0 }, s: "total banaya aur 0 rakha. Ye accumulator hai, yahin hum jodte jaayenge." },
      { l: 1, v: { total: 0, i: 1 }, s: "Loop shuru: i = 1. Shart 1 <= 4 sach hai, to andar jaate hain." },
      { l: 2, v: { total: 1, i: 1 }, s: "total = 0 + 1 = 1." },
      { l: 1, v: { total: 1, i: 2 }, s: "i++ se i = 2 hua. 2 <= 4 sach, phir andar." },
      { l: 2, v: { total: 3, i: 2 }, s: "total = 1 + 2 = 3." },
      { l: 1, v: { total: 3, i: 3 }, s: "i = 3, shart sach." },
      { l: 2, v: { total: 6, i: 3 }, s: "total = 3 + 3 = 6." },
      { l: 1, v: { total: 6, i: 4 }, s: "i = 4. 4 <= 4 sach hai (barabar bhi chalta hai, isliye <=). Ye aakhri round hai." },
      { l: 2, v: { total: 10, i: 4 }, s: "total = 6 + 4 = 10." },
      { l: 1, v: { total: 10 }, s: "i++ se i = 5. 5 <= 4 jhooth, loop khatam. i sirf loop ke andar jeeta hai, isliye ab dikh nahi raha." },
      { l: 4, v: { total: 10, out: "10" }, s: "Loop ke baad total print hua: 10." }
    ],
    predict: {
      q: "Is code ke ant mein total kya print hoga?",
      options: ["6", "10", "15", "4"],
      answer: 1,
      why: "i ki values 1, 2, 3, 4 hain (4 bhi, kyunki <= hai). 1+2+3+4 = 10. Agar tumne 6 socha, to tumne 4 ko chhod diya: ye off-by-one galti hai."
    },
    tryIt: "// i <= 4 ko i < 4 karke dekho: total kitna hota hai? Ya i <= 10 karke dekho.\nlet total = 0;\nfor (let i = 1; i <= 4; i++) {\n  total = total + i;\n}\nconsole.log(total);\n",
    exercises: ["sum-array", "count-evens", "fizzbuzz"]
  },
  {
    id: "arrays",
    title: "Arrays — items ki line, index 0 se",
    level: 1,
    goal: "array banana, push se badhana, length/index/indexOf use karna, aur loop se array bhar ke dekhna.",
    why: "Real data hamesha list ke roop mein aata hai: users, orders, prices. Aadhe interview sawal 'array diya hai, ye nikalo' type ke hote hain. Index 0 se shuru hota hai ye dimaag mein baith jaaye to off-by-one galtiyan kam ho jaati hain.",
    parts: [
      { h: "Idea", text: "Array ek line mein khade dabbe hain, har dabbe ka number (index) hai, aur ginti 0 se shuru hoti hai, 1 se nahi. `[10, 20, 30]` mein 10 index 0 par hai, 30 index 2 par. Total teen items, to length 3, par aakhri index length - 1 hota hai." },
      { h: "Syntax", text: "`let a = [];` khali array. `a.push(5)` peeche ek item jodta hai. `a[0]` pehla item, `a.length` kitne items. `a.indexOf(30)` batata hai 30 kis index par hai, na mile to `-1`." },
      { h: "Aam galti", text: "`a[a.length]` maangna: wo exist nahi karta (undefined). Aakhri item `a[a.length - 1]` hai. Aur indexOf ka `-1` ko 'mil gaya' mat samajhna: -1 matlab nahi mila." }
    ],
    code: [
      "let nums = [];",
      "for (let i = 1; i <= 3; i++) {",
      "  nums.push(i * 10);",
      "}",
      "console.log(nums.length, nums[0]);",
      "console.log(nums.indexOf(30), nums.indexOf(99));"
    ],
    frames: [
      { l: 0, v: { nums: [] }, s: "nums ek khali array hai, abhi koi dabba nahi." },
      { l: 1, v: { nums: [], i: 1 }, s: "Loop shuru, i = 1." },
      { l: 2, v: { nums: [10], i: 1 }, s: "push(1 * 10) ne peeche 10 jod diya. Ab nums mein 10 index 0 par hai." },
      { l: 1, v: { nums: [10], i: 2 }, s: "i = 2, loop phir chalega." },
      { l: 2, v: { nums: [10, 20], i: 2 }, s: "push(20): 20 index 1 par aaya." },
      { l: 1, v: { nums: [10, 20], i: 3 }, s: "i = 3, aakhri round." },
      { l: 2, v: { nums: [10, 20, 30], i: 3 }, s: "push(30): 30 index 2 par. Teen items ho gaye." },
      { l: 1, v: { nums: [10, 20, 30] }, s: "i++ se i = 4, 4 <= 3 jhooth, loop khatam. nums mein [10, 20, 30] hai." },
      { l: 4, v: { nums: [10, 20, 30], out: "3 10" }, s: "length 3 hai (teen items), nums[0] pehla item 10 hai (index 0)." },
      { l: 5, v: { nums: [10, 20, 30], out: "3 10\n2 -1" }, s: "30 index 2 par mila, to 2. 99 array mein hai hi nahi, to -1." }
    ],
    predict: {
      q: "Aakhri line (`console.log(nums.indexOf(30), nums.indexOf(99))`) kya print karegi?",
      options: ["30 -1", "2 -1", "3 -1", "2 undefined"],
      answer: 1,
      why: "indexOf item nahi, uski jagah (index) batata hai. 30 teesra item hai, par index 0 se shuru hota hai, to index 2. 99 nahi mila to -1 (undefined nahi, indexOf hamesha number deta hai)."
    },
    tryIt: "// i <= 3 ko i <= 5 karke dekho, phir nums[nums.length - 1] print karo (aakhri item).\nlet nums = [];\nfor (let i = 1; i <= 3; i++) {\n  nums.push(i * 10);\n}\nconsole.log(nums.length, nums[0]);\nconsole.log(nums.indexOf(30), nums.indexOf(99));\n",
    exercises: ["max-in-array", "second-largest", "remove-duplicates"]
  },
  {
    id: "strings",
    title: "Strings — text ek characters ki line hai",
    level: 1,
    goal: "string ke characters index se padhna, loop se ek-ek character dekhna, aur samajhna ki string badalti nahi, nayi banti hai.",
    why: "Palindrome, vowel count, reverse, anagram: sab string sawal hain, aur sab ka tareeka ek hi hai, characters par loop. Real kaam mein bhi log, naam, URL sab string hain. Ye ek pattern aa gaya to ek dozen sawal tum khud hal kar sakte ho.",
    parts: [
      { h: "Idea", text: "String bhi ek array jaisi line hai, bas dabbon mein ek-ek character hai. `\"cat\"` mein c index 0, a index 1, t index 2. Isliye `word[0]` pehla character aur `word.length` kitne characters." },
      { h: "Syntax", text: "Loop: `for (let i = 0; i < word.length; i++) { word[i] }`. Todna aur jodna: `\"a b c\".split(\" \")` se array `[\"a\",\"b\",\"c\"]`, aur `arr.join(\"-\")` se wapas string. Reverse ka tareeka: `word.split(\"\").reverse().join(\"\")`." },
      { h: "Aam galti", text: "String immutable hai: koi method (jaise `toUpperCase()`) asli string nahi badalta, nayi string return karta hai. Agar result kisi variable mein nahi rakha to wo kho jaata hai. Aur `word.length` ke baad bracket nahi lagta: `length` property hai, function nahi." }
    ],
    code: [
      "let word = \"cat\";",
      "let rev = \"\";",
      "for (let i = 0; i < word.length; i++) {",
      "  rev = word[i] + rev;",
      "}",
      "word.toUpperCase();",
      "console.log(rev, word);"
    ],
    frames: [
      { l: 0, v: { word: "cat" }, s: "word mein \"cat\" hai: c(0), a(1), t(2)." },
      { l: 1, v: { word: "cat", rev: "" }, s: "rev khali string se shuru. Isme ulta bana ke jodenge." },
      { l: 2, v: { word: "cat", rev: "", i: 0 }, s: "i = 0, aur 0 < 3 sach. Pehle character se shuru." },
      { l: 3, v: { word: "cat", rev: "c", i: 0 }, s: "word[0] = \"c\". Use rev ke AAGE lagaya: \"c\" + \"\" = \"c\"." },
      { l: 2, v: { word: "cat", rev: "c", i: 1 }, s: "i = 1, 1 < 3 sach." },
      { l: 3, v: { word: "cat", rev: "ac", i: 1 }, s: "word[1] = \"a\". Aage lagaya: \"a\" + \"c\" = \"ac\". Naya character hamesha aage aa raha hai, isliye ulta ban raha hai." },
      { l: 2, v: { word: "cat", rev: "ac", i: 2 }, s: "i = 2, 2 < 3 sach." },
      { l: 3, v: { word: "cat", rev: "tac", i: 2 }, s: "word[2] = \"t\". \"t\" + \"ac\" = \"tac\"." },
      { l: 2, v: { word: "cat", rev: "tac" }, s: "i = 3, 3 < 3 jhooth, loop khatam. rev = \"tac\" tayyar." },
      { l: 5, v: { word: "cat", rev: "tac" }, s: "toUpperCase() ne \"CAT\" naam ki nayi string banayi, par kisi variable mein rakhi nahi, to wo gayab. word ab bhi \"cat\" hai." },
      { l: 6, v: { word: "cat", rev: "tac", out: "tac cat" }, s: "Print hua: tac cat. word badla nahi, kyunki string immutable hai." }
    ],
    predict: {
      q: "Aakhri line kya print karegi?",
      options: ["tac cat", "tac CAT", "cat tac", "TAC CAT"],
      answer: 0,
      why: "Loop har character ko rev ke aage lagata hai: c, ac, tac. toUpperCase() nayi string \"CAT\" banata hai par word ko nahi badalta, aur wo nayi string kahin save bhi nahi hui. To word ab bhi \"cat\" hai."
    },
    tryIt: "// word = \"hello\" karke dekho. Phir line 6 ko word = word.toUpperCase(); karke dekho, ab word badlega.\nlet word = \"cat\";\nlet rev = \"\";\nfor (let i = 0; i < word.length; i++) {\n  rev = word[i] + rev;\n}\nword.toUpperCase();\nconsole.log(rev, word);\n",
    exercises: ["reverse-string", "count-vowels", "is-palindrome"]
  },
  {
    id: "functions",
    title: "Functions — kaam ka naam, input aur output",
    level: 2,
    goal: "parameter lene wala function likhna, return aur console.log ka fark samajhna, aur scope (variable kahan jeeta hai) pakadna.",
    why: "Interview mein har sawal 'ek function likho jo ...' hota hai, aur real code function ke tukdon se bana hota hai. Return vs print ka fark na samajhne se hi log 'mera function undefined de raha hai' wali galti karte hain. Function ko trace kar paoge to bug apne aap dikhne lagte hain.",
    parts: [
      { h: "Idea", text: "Function ek chhoti machine hai: tum input daalte ho (parameter), wo andar apna kaam karti hai, aur ek cheez wapas deti hai (return). Jaise juicer: phal daalo, juice nikalo. Andar ka goodha (andar ke variables) bahar nahi aata." },
      { h: "Syntax", text: "`function twice(x) { return x * 2; }`. Chalane ke liye `twice(5)`, jo wapas value deta hai, use `let r = twice(5);` mein rakh sakte ho. `return` pe function turant khatam ho jaata hai." },
      { h: "Aam galti", text: "`console.log` screen pe dikhata hai, par value wapas nahi deta. `return` value wapas deta hai jise aage use kar sakte ho. Return bhoolo to function `undefined` deta hai. Aur andar bane variable (`let y`) bahar nahi milte: wo scope ke bahar hain." }
    ],
    code: [
      "function twice(x) {",
      "  let y = x * 2;",
      "  return y;",
      "}",
      "let r = twice(5);",
      "console.log(r);",
      "console.log(typeof y);"
    ],
    frames: [
      { l: 0, v: { twice: "function" }, s: "Function sirf define hua, chala nahi. Bas naam yaad rakha gaya." },
      { l: 4, v: { twice: "function", x: 5 }, s: "twice(5) call hua. Function ke andar ghuse: parameter x ko 5 mila. x sirf function ke andar hai." },
      { l: 1, v: { twice: "function", x: 5, y: 10 }, s: "Andar y banaya: 5 * 2 = 10. y bhi sirf function ke andar jeeta hai." },
      { l: 2, v: { twice: "function", x: 5, y: 10, "return": 10 }, s: "return y: function 10 wapas dekar yahin khatam. Aage koi line hoti to wo na chalti." },
      { l: 4, v: { twice: "function", r: 10 }, s: "Wapas bahar aaye. x aur y gayab (scope khatam), aur wapas aayi value 10 r mein rakh di." },
      { l: 5, v: { twice: "function", r: 10, out: "10" }, s: "r print hua: 10." },
      { l: 6, v: { twice: "function", r: 10, out: "10\nundefined" }, s: "y bahar exist hi nahi karta, to typeof y \"undefined\" deta hai (error nahi, kyunki typeof safe hai)." }
    ],
    predict: {
      q: "Aakhri line (`console.log(typeof y)`) kya print karegi?",
      options: ["number", "undefined", "ReferenceError", "10"],
      answer: 1,
      why: "y function ke andar banaya gaya tha, scope ke bahar nahi dikhta. typeof ek aisa operator hai jo na-maujood variable pe error nahi deta, balki \"undefined\" deta hai. Agar sirf `console.log(y)` hota to ReferenceError aata."
    },
    tryIt: "// return y; wali line hata ke dekho: r kya ban jaata hai? Phir twice(7) bhi try karo.\nfunction twice(x) {\n  let y = x * 2;\n  return y;\n}\nlet r = twice(5);\nconsole.log(r);\nconsole.log(typeof y);\n",
    exercises: ["sum-of-digits", "is-prime"]
  },
  {
    id: "objects-and-maps",
    title: "Objects aur Maps — key se value, aur ginti ka pattern",
    level: 2,
    goal: "object (key -> value) banana, aur counting pattern `count[ch] = (count[ch] || 0) + 1` khud likhna.",
    why: "Ye interviews ka sabse bada pattern hai: char frequency, anagram, duplicates, first non-repeating, two-sum, sab 'kisko kitni baar dekha' pe tikte hain. Ek baar ye pattern haath mein aa gaya to ye saare sawal chhote lagne lagte hain. Aur ye tumhe nested loops (slow) se bachata hai.",
    parts: [
      { h: "Idea", text: "Object ek register hai: har page par ek naam (key) aur uske saamne ek value. 'banana' ke letters ginne hain: register mein 'b' ke saamne 1 likho, 'a' dikhe to uske saamne +1, naya letter dikhe to naya page kholke 1 likho. Ek hi pass mein ginti ho jaati hai." },
      { h: "Syntax", text: "`let count = {};`, `count[\"a\"] = 3;`, padhna `count[\"a\"]`. Jo key hai hi nahi uska jawab `undefined` hota hai, to `(count[ch] || 0)` ka matlab 'agar pehle nahi tha to 0 maan lo'. `Map` bhi yehi karta hai: `m.set(k, v)`, `m.get(k)`, `m.has(k)`." },
      { h: "Aam galti", text: "Ginti shuru karte waqt `count[ch]++` likhna: key nahi hai to `undefined + 1 = NaN` ban jaata hai. Hamesha `|| 0` ya `has` check lagao. Aur object print karne ke liye `JSON.stringify(count)` use karo taaki saaf text dikhe." }
    ],
    code: [
      "let word = \"banana\";",
      "let count = {};",
      "for (let i = 0; i < word.length; i++) {",
      "  let ch = word[i];",
      "  count[ch] = (count[ch] || 0) + 1;",
      "}",
      "console.log(JSON.stringify(count));"
    ],
    frames: [
      { l: 0, v: { word: "banana" }, s: "word = \"banana\": b(0) a(1) n(2) a(3) n(4) a(5)." },
      { l: 1, v: { word: "banana", count: {} }, s: "count ek khali register hai. Abhi kisi letter ka page nahi." },
      { l: 3, v: { word: "banana", count: {}, i: 0, ch: "b" }, s: "i = 0: ch = \"b\"." },
      { l: 4, v: { word: "banana", count: { b: 1 }, i: 0, ch: "b" }, s: "count[\"b\"] abhi undefined hai, to || 0 se 0 maana, 0 + 1 = 1. b ka naya page khula." },
      { l: 3, v: { word: "banana", count: { b: 1 }, i: 1, ch: "a" }, s: "i = 1: ch = \"a\"." },
      { l: 4, v: { word: "banana", count: { b: 1, a: 1 }, i: 1, ch: "a" }, s: "a pehli baar dikha, to naya page: a = 1." },
      { l: 3, v: { word: "banana", count: { b: 1, a: 1 }, i: 2, ch: "n" }, s: "i = 2: ch = \"n\"." },
      { l: 4, v: { word: "banana", count: { b: 1, a: 1, n: 1 }, i: 2, ch: "n" }, s: "n bhi pehli baar: n = 1." },
      { l: 3, v: { word: "banana", count: { b: 1, a: 1, n: 1 }, i: 3, ch: "a" }, s: "i = 3: ch = \"a\" phir aaya." },
      { l: 4, v: { word: "banana", count: { b: 1, a: 2, n: 1 }, i: 3, ch: "a" }, s: "Ab count[\"a\"] pehle se 1 hai, to (1 || 0) = 1, aur 1 + 1 = 2. Purana page, ginti badhi." },
      { l: 4, v: { word: "banana", count: { b: 1, a: 3, n: 2 }, i: 5, ch: "a" }, s: "Beech ke do round (i = 4 \"n\", i = 5 \"a\") bhi bilkul aise hi chale: n = 2, a = 3. Dono ek frame mein dikha diye." },
      { l: 2, v: { word: "banana", count: { b: 1, a: 3, n: 2 } }, s: "i = 6, 6 < 6 jhooth, loop khatam. Register poora." },
      { l: 6, v: { word: "banana", count: { b: 1, a: 3, n: 2 }, out: "{\"b\":1,\"a\":3,\"n\":2}" }, s: "Print hua: b 1 baar, a 3 baar, n 2 baar. Ek hi loop mein poori ginti." }
    ],
    predict: {
      q: "Aakhir mein kya print hoga?",
      options: ["{\"b\":1,\"a\":2,\"n\":2}", "{\"b\":1,\"a\":3,\"n\":2}", "{\"b\":1,\"a\":3,\"n\":1}", "{\"b\":1,\"a\":1,\"n\":1}"],
      answer: 1,
      why: "banana mein b ek baar, a teen baar (index 1, 3, 5), n do baar (index 2, 4). Har baar letter dikhne par uski ginti +1 hoti hai. Keys us order mein aati hain jis order mein pehli baar dikhi: b, a, n."
    },
    tryIt: "// word = \"mississippi\" karke dekho. Phir sabse zyada baar aane wala letter dhundne ka tareeka sochna.\nlet word = \"banana\";\nlet count = {};\nfor (let i = 0; i < word.length; i++) {\n  let ch = word[i];\n  count[ch] = (count[ch] || 0) + 1;\n}\nconsole.log(JSON.stringify(count));\n",
    exercises: ["char-frequency", "is-anagram", "first-non-repeating", "two-sum"]
  },
  {
    id: "recursion",
    title: "Recursion — function jo khud ko bulata hai",
    level: 3,
    goal: "recursion ko call stack ke roop mein dekhna: base case, recursive call, aur wapas laut ke jawab banana.",
    why: "Recursion ka darr isliye lagta hai kyunki log use 'jaadu' maante hain. Asal mein ye bas ek stack hai: calls upar chadhti hain, base case par ruk ke neeche utarti hain. Trees, nested arrays (flatten), fibonacci sab isi se hote hain, aur interviewer yahi check karta hai ki tum stack soch sakte ho ya nahi.",
    parts: [
      { h: "Idea", text: "Plates ka dher socho. Bada kaam mile to usse thoda chhota kaam banao aur plate ke upar rakh do: 'factorial(3) = 3 * factorial(2)'. Jab sabse chhota kaam (base case) seedha jawab de de, tab upar se ek-ek plate utaar ke jawab banate jao." },
      { h: "Syntax", text: "Do cheezein zaroori: (1) base case, jahan function khud ko nahi bulata, seedha jawab deta hai, jaise `if (n === 1) return 1;`. (2) recursive step, jo problem ko chhota karta hai: `return n * factorial(n - 1);`." },
      { h: "Aam galti", text: "Base case bhool gaye to function hamesha khud ko bulata rahega aur 'Maximum call stack size exceeded' error aayega. Doosri galti: recursive call ko chhota nahi kiya (n - 1 ki jagah n likh diya), to wo kabhi base case tak nahi pahunchta." }
    ],
    code: [
      "function factorial(n) {",
      "  if (n === 1) return 1;",
      "  return n * factorial(n - 1);",
      "}",
      "console.log(factorial(3));"
    ],
    frames: [
      { l: 0, v: { stack: [] }, s: "Function sirf define hua. Call stack abhi khali hai." },
      { l: 4, v: { stack: ["factorial(3)  n=3"] }, s: "factorial(3) call hua, stack par pehli plate rakhi gayi, n = 3." },
      { l: 1, v: { stack: ["factorial(3)  n=3"] }, s: "n === 1? 3 hai, to nahi. Base case nahi mila, aage badho." },
      { l: 2, v: { stack: ["factorial(3)  n=3", "factorial(2)  n=2"] }, s: "3 * factorial(2) likha hai, par factorial(2) ka jawab chahiye. Ruko, naya call: stack par doosri plate. factorial(3) intezaar mein." },
      { l: 1, v: { stack: ["factorial(3)  n=3", "factorial(2)  n=2"] }, s: "Naye call mein n = 2, 2 === 1? Nahi. Phir recursive step." },
      { l: 2, v: { stack: ["factorial(3)  n=3", "factorial(2)  n=2", "factorial(1)  n=1"] }, s: "2 * factorial(1): teesri plate. Stack ab 3 ooncha hai, dono upar wale intezaar mein." },
      { l: 1, v: { stack: ["factorial(3)  n=3", "factorial(2)  n=2", "factorial(1)  n=1"], "return": 1 }, s: "n === 1 sach! Base case mil gaya, ye call seedha 1 return karta hai. Yahan se utarna shuru." },
      { l: 2, v: { stack: ["factorial(3)  n=3", "factorial(2)  n=2"], "return": 2 }, s: "factorial(1) plate hat gayi. factorial(2) ko 1 mila: 2 * 1 = 2, aur wo 2 return karta hai." },
      { l: 2, v: { stack: ["factorial(3)  n=3"], "return": 6 }, s: "factorial(2) hat gaya. factorial(3) ko 2 mila: 3 * 2 = 6, return 6." },
      { l: 4, v: { stack: [], out: "6" }, s: "Stack khali. 6 console.log tak pahuncha aur print hua." }
    ],
    predict: {
      q: "console.log(factorial(3)) kya print karega?",
      options: ["1", "3", "6", "9"],
      answer: 2,
      why: "Calls neeche jaati hain: f(3) -> f(2) -> f(1). f(1) base case se 1 deta hai. Wapas aate waqt f(2) = 2 * 1 = 2, aur f(3) = 3 * 2 = 6. 1 sirf sabse andar wale call ka jawab hai, poore ka nahi."
    },
    tryIt: "// factorial(3) ko factorial(5) karke dekho (120 aana chahiye). Phir `if (n === 1) return 1;` hatao aur dekho kya error aata hai.\nfunction factorial(n) {\n  if (n === 1) return 1;\n  return n * factorial(n - 1);\n}\nconsole.log(factorial(3));\n",
    exercises: ["factorial", "fibonacci-n", "flatten-array"]
  },
  {
    id: "how-to-solve-a-problem",
    title: "Sawal kaise hal karein — haath se, phir code",
    level: 2,
    goal: "kisi bhi sawal ko restate -> examples -> haath se solve -> steps in words -> code -> edge cases ke 6 kadam mein todna.",
    why: "Tumhari asli dikkat syntax nahi, 'shuru kahan se karun' hai, aur AI wahi kadam tumhare liye karta hai. Interview mein wahi 5 minute tum bolke sochte ho, aur interviewer wahi dekhta hai. Jo sawal tum haath se hal kar sakte ho, wo code mein hamesha badal sakta hai.",
    parts: [
      { h: "6 kadam", text: "(1) Sawal apne shabdon mein dohrao. (2) 2-3 examples likho, ek aam aur ek ajeeb (khali, ek item). (3) Ek example haath se, kaagaz pe, step by step hal karo aur dhyaan do ki tum kya kar rahe ho. (4) Wo steps hindi/english mein likho. (5) Har step ko code ki ek line banao. (6) Edge cases pe chalake test karo." },
      { h: "Idea", text: "Code kuch nahi, tumhari haath ki process ko computer ki bhasha mein likhna hai. Yahan 'hi  there' (beech mein do space) mein words ginte hain: aankhon se ek-ek character dekho, jab space ke baad koi letter aaye, matlab nayi word shuru hui, count +1. Wo 'jab ... tab ...' seedha if ban gaya, 'har character' loop ban gaya, 'ginti' variable ban gaya." },
      { h: "Aam galti", text: "Seedha code likhne baith jaana. Aur sabse aam fasaav: `text.split(\" \").length` likhna. 'hi  there' mein ye 3 deta hai (beech mein khali string), jabki words 2 hain. Isiliye pehle haath se hal karo aur edge case socho: pehle hi examples mein double space daalna." }
    ],
    code: [
      "let text = \"hi  there\";",
      "let count = 0;",
      "for (let i = 0; i < text.length; i++) {",
      "  if (text[i] !== \" \" && (i === 0 || text[i - 1] === \" \")) {",
      "    count = count + 1;",
      "  }",
      "}",
      "console.log(count);"
    ],
    frames: [
      { l: 0, v: { text: "hi  there" }, s: "Haath se jaisa kaagaz pe likha: h(0) i(1) space(2) space(3) t(4) h(5) e(6) r(7) e(8). Do space jaanboojh ke, edge case." },
      { l: 1, v: { text: "hi  there", count: 0 }, s: "Haath se ginte waqt ungli pe ginti 0 se shuru karte ho. Wahi count = 0." },
      { l: 3, v: { text: "hi  there", count: 0, i: 0 }, s: "i = 0, character \"h\". Rule: 'letter ho AUR (pehla character ho YA pichla space ho)' to nayi word shuru. h letter hai aur i === 0, to rule sach." },
      { l: 4, v: { text: "hi  there", count: 1, i: 0 }, s: "Nayi word mili (\"hi\"), count = 1." },
      { l: 3, v: { text: "hi  there", count: 1, i: 1 }, s: "i = 1, \"i\". Letter hai, par pichla \"h\" hai, space nahi: ye wahi purani word ka hissa hai. Rule jhooth, count nahi badla." },
      { l: 3, v: { text: "hi  there", count: 1, i: 2 }, s: "i = 2, ye space hai. Space se kabhi nayi word shuru nahi hoti, rule jhooth." },
      { l: 3, v: { text: "hi  there", count: 1, i: 3 }, s: "i = 3, doosra space. Phir jhooth. Yahi wo jagah hai jahan split(\" \") ek khali word ginta, par hamara rule nahi ginta." },
      { l: 3, v: { text: "hi  there", count: 1, i: 4 }, s: "i = 4, \"t\". Letter hai aur pichla (index 3) space hai, to nayi word shuru: rule sach." },
      { l: 4, v: { text: "hi  there", count: 2, i: 4 }, s: "count = 2. \"there\" ki pehli letter mil gayi." },
      { l: 3, v: { text: "hi  there", count: 2, i: 8 }, s: "i = 5 se 8 (h, e, r, e): har ek letter hai par pichla character bhi letter hai, to har baar rule jhooth. Chaaron ek frame mein dikha diye, count 2 hi raha." },
      { l: 2, v: { text: "hi  there", count: 2 }, s: "i = 9, 9 < 9 jhooth, loop khatam." },
      { l: 7, v: { text: "hi  there", count: 2, out: "2" }, s: "Print hua: 2. Haath ka jawab bhi 2 tha, to code sahi hai. Ab edge cases try karo: khali string, sirf spaces." }
    ],
    predict: {
      q: "Is code se \"hi  there\" (do space ke saath) ke liye count kya print hoga?",
      options: ["2", "3", "4", "9"],
      answer: 0,
      why: "Count sirf tab badhta hai jab letter ho aur pichla character space ho (ya pehla ho). \"hi\" ke h par aur \"there\" ke t par yehi sach hota hai, to 2. Agar tumne 3 socha, to tumne split(\" \") wali galti ki, jahan beech ki khali string bhi gin li jaati."
    },
    tryIt: "// text ko \"  hello   world  \" karke dekho (bahut saare space). Phir \"\" (khali) karke dekho, count kya aaya?\nlet text = \"hi  there\";\nlet count = 0;\nfor (let i = 0; i < text.length; i++) {\n  if (text[i] !== \" \" && (i === 0 || text[i - 1] === \" \")) {\n    count = count + 1;\n  }\n}\nconsole.log(count);\n",
    exercises: ["word-count", "longest-word"]
  }
];
