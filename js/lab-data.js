// Logic-building lab: 24 exercises. Each solution is machine-verified by `node tools/check-lab.js lab`.
window.LAB = [
  // ===================== LEVEL 1 =====================
  {
    id: "sum-array",
    title: "Array ka sum",
    level: 1,
    topic: "Loops",
    prompt: "Function sumArray(nums) ek array of numbers leta hai aur un sabka total (sum) return karta hai. Khali array ho to 0 return karo. Example: [1, 2, 3] -> 6.",
    fn: "sumArray",
    starter: `function sumArray(nums) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [[1, 2, 3]], expect: 6 },
      { args: [[10]], expect: 10 },
      { args: [[5, 5, 5, 5]], expect: 20 },
      { args: [[-1, -2, 3]], expect: 0 },
      { args: [[]], expect: 0, hidden: true },
      { args: [[100, 200, 300]], expect: 600, hidden: true }
    ],
    approachQs: [
      "Input kya hai aur output kya hai? Output ek number hai ya array?",
      "Kaunsa kaam baar-baar repeat hoga (har element ke saath)?",
      "Loop ke beech mein tumhe kya yaad rakhna padega?",
      "Agar array khali ho to kya return hona chahiye?"
    ],
    hints: [
      "Socho jaise tum haath se gino: ek-ek number uthate ho aur ek running total mein jodte jaate ho. Total kahan likhoge?",
      "Ek variable banao jo shuru mein 0 ho (total). Phir array ke har element par loop chalao aur har baar total badhao.",
      "Steps: let total = 0; -> for har element: total = total + element; -> loop ke baad total return karo. Khali array mein loop chalega hi nahi, to 0 hi mil jayega."
    ],
    solution: `function sumArray(nums) {
  let total = 0;            // running total, shuru mein 0
  for (let i = 0; i < nums.length; i++) {
    total = total + nums[i]; // har element jodo
  }
  return total;
}
`,
    why: "Running total (accumulator) ka idea har jagah aata hai: cart ka total, report ke totals, counters. Loop + ek variable jo beech mein state yaad rakhta hai, yeh logic ka sabse basic building block hai.",
    edge: ["empty array", "single element", "negative numbers"]
  },
  {
    id: "max-in-array",
    title: "Sabse bada number",
    level: 1,
    topic: "Arrays",
    prompt: "Function maxInArray(nums) array ka sabse bada number return karta hai. Agar array khali hai to null return karo. Built-in Math.max mat use karo, loop se socho. Example: [3, 9, 2] -> 9.",
    fn: "maxInArray",
    starter: `function maxInArray(nums) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [[3, 9, 2]], expect: 9 },
      { args: [[-5, -2, -9]], expect: -2 },
      { args: [[7]], expect: 7 },
      { args: [[4, 4, 4]], expect: 4 },
      { args: [[]], expect: null, hidden: true },
      { args: [[1, 100, 50, 100]], expect: 100, hidden: true }
    ],
    approachQs: [
      "Agar tum cards ek-ek karke dekh rahe ho, to ab tak ka sabse bada card kaise yaad rakhoge?",
      "Har naye number ko kis se compare karoge?",
      "Shuruaati 'best so far' kya hoga? Kya 0 sahi hai jab saare numbers negative ho sakte hain?",
      "Khali array ke liye kya return karoge?"
    ],
    hints: [
      "Ek variable socho jo 'ab tak ka sabse bada' yaad rakhta hai. Har naye number par poocho: kya yeh usse bada hai?",
      "Pehle khali array ko alag handle karo. Phir 'best' ko pehle element se shuru karo (0 se nahi, kyunki negatives ho sakte hain) aur baaki elements par loop chalao.",
      "Steps: agar length 0 -> return null. let best = nums[0]. for i = 1 se end tak: agar nums[i] > best to best = nums[i]. End mein best return."
    ],
    solution: `function maxInArray(nums) {
  if (nums.length === 0) {
    return null; // khali array
  }
  let best = nums[0]; // pehla element hi shuru mein sabse bada
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] > best) {
      best = nums[i];
    }
  }
  return best;
}
`,
    why: "'Best so far' tracking ka pattern max, min, latest date, highest price jaise sab kaamon mein aata hai. Saath mein yeh seekhte ho ki starting value galat (jaise 0) ho to negative data par bug aata hai.",
    edge: ["empty array", "all negative numbers", "single element", "duplicates of the max"]
  },
  {
    id: "reverse-string",
    title: "String ulta karo",
    level: 1,
    topic: "Strings",
    prompt: "Function reverseString(text) ek string leta hai aur uska ulta (reverse) string return karta hai. Spaces aur capital letters jaise hain waise hi rehne do, bas order ulta karo. Example: 'hello' -> 'olleh'. Koshish karo ki .reverse() ke bina loop se karo.",
    fn: "reverseString",
    starter: `function reverseString(text) {
  // yahan apna code likho
}
`,
    tests: [
      { args: ["hello"], expect: "olleh" },
      { args: ["ab cd"], expect: "dc ba" },
      { args: ["Hello World"], expect: "dlroW olleH" },
      { args: ["a"], expect: "a" },
      { args: [""], expect: "", hidden: true },
      { args: ["racecar"], expect: "racecar", hidden: true },
      { args: ["  ab  "], expect: "  ba  ", hidden: true },
      { args: [" x y "], expect: " y x ", hidden: true }
    ],
    approachQs: [
      "Input string hai, output bhi string. 'hello' ke characters kis order mein padhne padenge?",
      "Kya tum string ko peeche se aage ki taraf padh sakte ho? Index kahan se shuru hoga?",
      "Naya result kahan banaoge, aur har character ko usme kaise jodoge?",
      "Khali string dene par kya hoga?"
    ],
    hints: [
      "Socho: reverse karna matlab last character pehle, phir uske pehle wala, aur aise hi pehle character tak. Tum string ko kis taraf se padhoge?",
      "Ek khali result string banao. Index ko last position (length - 1) se shuru karke 0 tak ghatate hue loop chalao, aur har character result mein jodo.",
      "Steps: let result = ''; for (let i = text.length - 1; i >= 0; i--) { result = result + text[i]; } return result;"
    ],
    solution: `function reverseString(text) {
  let result = "";
  // peeche se aage ki taraf chalo
  for (let i = text.length - 1; i >= 0; i--) {
    result = result + text[i];
  }
  return result;
}
`,
    why: "Index se peeche chalna (countdown loop) aur string build karna dono bahut common hain. Real kaam mein yeh text transform, parsing aur formatting mein kaam aata hai.",
    edge: ["empty string", "single character", "spaces inside", "mixed case"]
  },
  {
    id: "count-vowels",
    title: "Vowels ginti",
    level: 1,
    topic: "Conditions",
    prompt: "Function countVowels(text) string mein kitne vowels (a, e, i, o, u) hain wo return karta hai. Capital aur small dono count honge (A aur a same hain). Baaki sab characters ignore karo. Example: 'hello' -> 2.",
    fn: "countVowels",
    starter: `function countVowels(text) {
  // yahan apna code likho
}
`,
    tests: [
      { args: ["hello"], expect: 2 },
      { args: ["AEIOU"], expect: 5 },
      { args: ["xyz"], expect: 0 },
      { args: ["Programming is fun"], expect: 5 },
      { args: [""], expect: 0, hidden: true },
      { args: ["Education"], expect: 5, hidden: true },
      { args: ["rhythm"], expect: 0, hidden: true }
    ],
    approachQs: [
      "Input string hai, output ek number (count). Har character ke baare mein tumhe kya decide karna hai?",
      "Kaise check karoge ki ek character vowel hai ya nahi? Kitne vowels hain?",
      "Capital 'A' aur small 'a' ko same kaise bana sakte ho?",
      "Count ko loop ke beech mein kahan rakhoge?"
    ],
    hints: [
      "Har character ko ek-ek karke dekho aur khud se poocho: kya yeh vowel hai? Agar haan, to ek gina do.",
      "Pehle text ko ek hi case mein kar lo (lowercase). Phir ek string 'aeiou' rakho aur dekho ki current character uske andar milta hai ya nahi.",
      "Steps: let count = 0; const lower = text.toLowerCase(); for har character ch: if ('aeiou'.includes(ch)) count++; end mein count return."
    ],
    solution: `function countVowels(text) {
  const vowels = "aeiou";
  const lower = text.toLowerCase(); // A aur a ko same banane ke liye
  let count = 0;
  for (let i = 0; i < lower.length; i++) {
    if (vowels.includes(lower[i])) {
      count++;
    }
  }
  return count;
}
`,
    why: "Har item par ek condition lagakar count karna (filter + count) validation, reports aur search mein roz aata hai. Case-insensitive compare bhi bahut common requirement hai.",
    edge: ["empty string", "uppercase letters", "no vowels", "spaces and symbols"]
  },
  {
    id: "word-count",
    title: "Words ginti",
    level: 1,
    topic: "Strings",
    prompt: "Function wordCount(text) string mein words ki sankhya return karta hai. Words kisi bhi whitespace (space, tab, newline) se alag hote hain, aur extra spaces ignore karne hain. Khali ya sirf spaces wali string ke liye 0 return karo. Example: '  hello   world  ' -> 2.",
    fn: "wordCount",
    starter: `function wordCount(text) {
  // yahan apna code likho
}
`,
    tests: [
      { args: ["hello world"], expect: 2 },
      { args: ["the quick brown fox"], expect: 4 },
      { args: ["  hello   world  "], expect: 2 },
      { args: ["one"], expect: 1 },
      { args: [""], expect: 0, hidden: true },
      { args: ["     "], expect: 0, hidden: true },
      { args: ["a\tb\nc"], expect: 3, hidden: true }
    ],
    approachQs: [
      "Input string, output number. 'Word' ki tumhari definition kya hai?",
      "Words ke beech separator kya hai, aur agar separator ek se zyada baar aaye to?",
      "Kya tum string ko words ki list mein tod sakte ho? Ya characters dekhkar 'word shuru hua' detect karoge?",
      "Khali string ya sirf spaces par kya answer aana chahiye?"
    ],
    hints: [
      "Pehle chhote example par haath se socho: '  hi   there ' mein kitne words hain, aur kaise pata chala? Extra spaces ko kaise sambhaloge?",
      "Do raaste hain: (a) pehle trim() karke whitespace par split karo aur length lo, ya (b) characters par loop chalao aur gino ki kitni baar space ke baad non-space aaya. Dono mein khali string ka alag dhyan rakho.",
      "Raasta (a): const t = text.trim(); agar t === '' to 0 return; warna t ko regex /\\s+/ par split karo (matlab ek ya zyada whitespace) aur uski length return karo."
    ],
    solution: `function wordCount(text) {
  const trimmed = text.trim(); // aage-peeche ke spaces hatao
  if (trimmed === "") {
    return 0; // khali ya sirf spaces
  }
  // \\s+ matlab ek ya zyada whitespace (space, tab, newline)
  const words = trimmed.split(/\\s+/);
  return words.length;
}
`,
    why: "User input aur text files ko parse karna roz ka kaam hai, aur wahan extra spaces, tabs aur khali input hamesha aate hain. split + trim ka combo form validation, search aur log parsing mein bahut kaam aata hai.",
    edge: ["empty string", "only spaces", "multiple spaces between words", "tabs and newlines", "leading/trailing spaces"]
  },
  {
    id: "fizzbuzz",
    title: "FizzBuzz",
    level: 1,
    topic: "Conditions",
    prompt: "Function fizzBuzz(n) 1 se n tak ki list (array of strings) return karta hai. Jo number 3 se divisible ho uski jagah 'Fizz', 5 se divisible ho to 'Buzz', dono se divisible ho to 'FizzBuzz', warna number ko string bana kar likho. n = 0 par khali array. Example: fizzBuzz(5) -> ['1', '2', 'Fizz', '4', 'Buzz'].",
    fn: "fizzBuzz",
    starter: `function fizzBuzz(n) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [5], expect: ["1", "2", "Fizz", "4", "Buzz"] },
      { args: [1], expect: ["1"] },
      { args: [3], expect: ["1", "2", "Fizz"] },
      { args: [15], expect: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"] },
      { args: [0], expect: [], hidden: true },
      { args: [10], expect: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz"], hidden: true }
    ],
    approachQs: [
      "Output ek array hai jisme n items hain. Har item kis number ke liye banega?",
      "Number 3 se divisible hai ya nahi, yeh kaise check karoge?",
      "Agar number 3 aur 5 dono se divisible ho (jaise 15), to kaunsi condition pehle check karni chahiye aur kyun?",
      "Result array ko loop ke dauraan kaise bharoge?"
    ],
    hints: [
      "Pehle 15 ke baare mein socho: wo 3 se bhi divisible hai aur 5 se bhi. Agar tum pehle sirf 3 wali condition check karoge to kya galat hoga?",
      "Loop 1 se n tak chalao. Har number par if / else if / else lagao. Divisibility ke liye remainder operator % use hota hai. Sabse specific condition (dono) sabse pehle rakho.",
      "Steps: const result = []; for i = 1..n: if (i % 15 === 0) push 'FizzBuzz'; else if (i % 3 === 0) push 'Fizz'; else if (i % 5 === 0) push 'Buzz'; else push String(i). return result."
    ],
    solution: `function fizzBuzz(n) {
  const result = [];
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) {        // 3 aur 5 dono se divisible, pehle check karo
      result.push("FizzBuzz");
    } else if (i % 3 === 0) {
      result.push("Fizz");
    } else if (i % 5 === 0) {
      result.push("Buzz");
    } else {
      result.push(String(i));  // number ko string banao
    }
  }
  return result;
}
`,
    why: "FizzBuzz sikhata hai ki if / else if ka order matter karta hai: specific case pehle, general baad mein. Real code mein rules engine, pricing tiers aur validation chain isi tarah likhe jaate hain.",
    edge: ["n = 0", "n = 1", "multiples of both 3 and 5", "order of conditions"]
  },
  {
    id: "sum-of-digits",
    title: "Digits ka sum",
    level: 1,
    topic: "Math",
    prompt: "Function sumOfDigits(n) ek non-negative integer leta hai aur uske saare digits ka sum return karta hai. Example: 123 -> 1 + 2 + 3 = 6. 0 ka answer 0 hai.",
    fn: "sumOfDigits",
    starter: `function sumOfDigits(n) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [123], expect: 6 },
      { args: [7], expect: 7 },
      { args: [9999], expect: 36 },
      { args: [98765], expect: 35 },
      { args: [0], expect: 0, hidden: true },
      { args: [100], expect: 1, hidden: true }
    ],
    approachQs: [
      "Input ek number hai, output bhi ek number. Number ke last digit ko alag kaise nikaloge?",
      "Last digit nikalne ke baad bacha hua number kaise banaoge (last digit hatakar)?",
      "Yeh process kab tak repeat hoga, aur kab ruk jayega?",
      "Sum ko beech mein kahan store karoge?"
    ],
    hints: [
      "Socho 123 mein se last digit 3 kaise nikalte hain? Aur phir 12 kaise bacha? Do alag operations chahiye.",
      "Remainder (% 10) last digit deta hai. Integer division (n / 10 ka neeche wala hissa, Math.floor) last digit hata deta hai. Jab tak n 0 na ho jaye, yeh dono dohrao.",
      "Steps: let sum = 0; while (n > 0) { sum = sum + n % 10; n = Math.floor(n / 10); } return sum. (Tum chaaho to number ko string bana kar bhi kar sakte ho.)"
    ],
    solution: `function sumOfDigits(n) {
  let sum = 0;
  while (n > 0) {
    sum = sum + (n % 10);     // last digit jodo
    n = Math.floor(n / 10);   // last digit hata do
  }
  return sum;
}
`,
    why: "While loop jab chalta hai jab tak koi condition badal na jaye, aur % tathaa / se number todna checksum, ID validation aur base conversion jaise kaamon mein aata hai.",
    edge: ["zero", "single digit", "digits that are zero (100)", "large numbers"]
  },
  {
    id: "is-palindrome",
    title: "Palindrome check",
    level: 1,
    topic: "Strings",
    prompt: "Function isPalindrome(text) true return karta hai agar text aage se aur peeche se same padhta hai, warna false. Capital/small ka farq nahi, aur spaces tathaa punctuation (letters aur digits ke alawa sab) ignore karo. Khali string palindrome mani jaayegi. Example: 'A man, a plan, a canal: Panama' -> true.",
    fn: "isPalindrome",
    starter: `function isPalindrome(text) {
  // yahan apna code likho
}
`,
    tests: [
      { args: ["madam"], expect: true },
      { args: ["hello"], expect: false },
      { args: ["A man, a plan, a canal: Panama"], expect: true },
      { args: ["race a car"], expect: false },
      { args: [""], expect: true, hidden: true },
      { args: ["a"], expect: true, hidden: true },
      { args: ["No lemon, no melon"], expect: true, hidden: true },
      { args: ["ab"], expect: false, hidden: true },
      { args: ["race_car"], expect: true, hidden: true },
      { args: ["a_ba"], expect: true, hidden: true },
      { args: ["1a2"], expect: false, hidden: true },
      { args: ["12321"], expect: true, hidden: true }
    ],
    approachQs: [
      "Palindrome ka matlab kya hai? Pehla aur aakhri character ke baare mein kya sach hona chahiye?",
      "Spaces, commas aur capital letters ko kaise handle karoge? Compare karne se pehle kya karna padega?",
      "Kya tum do positions (ek aage se, ek peeche se) ek saath chala sakte ho? Wo kab milenge?",
      "Khali string aur single character par kya answer hoga?"
    ],
    hints: [
      "Pehle text ko 'saaf' karo: sirf letters aur digits rakho, sab lowercase. Uske baad sawaal bahut seedha ho jata hai.",
      "Saaf string ke liye do pointers use karo: left = 0 se aage badhta hai, right = last se peeche aata hai. Agar kabhi dono jagah ke characters alag mile to false. Agar pointers cross ho jayein to true.",
      "Steps: cleaned = '' banao; har char ko lowercase karke dekho, agar 'a'-'z' ya '0'-'9' ke beech hai to cleaned mein jodo. Phir left = 0, right = cleaned.length - 1; while (left < right) { agar cleaned[left] !== cleaned[right] return false; left++; right--; } return true."
    ],
    solution: `function isPalindrome(text) {
  // Step 1: sirf letters/digits rakho, sab lowercase
  let cleaned = "";
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    const isLetter = ch >= "a" && ch <= "z";
    const isDigit = ch >= "0" && ch <= "9";
    if (isLetter || isDigit) {
      cleaned = cleaned + ch;
    }
  }

  // Step 2: do pointers, dono sire se beech ki taraf
  let left = 0;
  let right = cleaned.length - 1;
  while (left < right) {
    if (cleaned[left] !== cleaned[right]) {
      return false;
    }
    left++;
    right--;
  }
  return true;
}
`,
    why: "Do pointers (ek aage se, ek peeche se) ek bahut powerful pattern hai jo arrays aur strings ki kai problems solve karta hai. Input ko pehle normalize (clean) karna real kaam mein bhi har jagah zaroori hai.",
    edge: ["empty string", "single character", "mixed case", "spaces and punctuation", "digits"]
  },
  {
    id: "count-evens",
    title: "Even numbers ginti",
    level: 1,
    topic: "Conditions",
    prompt: "Function countEvens(nums) array mein kitne even numbers hain wo return karta hai. 0 bhi even hota hai aur negative even numbers (jaise -2) bhi count honge. Khali array ke liye 0. Example: [1, 2, 3, 4] -> 2.",
    fn: "countEvens",
    starter: `function countEvens(nums) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [[1, 2, 3, 4]], expect: 2 },
      { args: [[2, 4, 6]], expect: 3 },
      { args: [[1, 3]], expect: 0 },
      { args: [[7]], expect: 0 },
      { args: [[]], expect: 0, hidden: true },
      { args: [[-2, -3, 0]], expect: 2, hidden: true }
    ],
    approachQs: [
      "Input array of numbers, output ek count. Even number ki pehchaan kya hai?",
      "Computer mein 'even hai ya nahi' kaise check karte hain (remainder ke saath)?",
      "Count ko kab badhana hai aur kab nahi?",
      "0 aur negative numbers ke baare mein kya sochna chahiye?"
    ],
    hints: [
      "Even number woh hai jo 2 se bilkul divide ho jaye, yaani remainder 0. Is idea ko code mein kaise likhoge?",
      "Remainder operator % use karo: n % 2 === 0 matlab even. Array ke har element par yeh condition lagao aur sahi hone par counter badhao.",
      "Steps: let count = 0; for har number in nums: if (number % 2 === 0) count++; end mein count return."
    ],
    solution: `function countEvens(nums) {
  let count = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] % 2 === 0) { // remainder 0 matlab even
      count++;
    }
  }
  return count;
}
`,
    why: "Remainder (%) ka use even/odd, alternating rows, pagination aur cyclic logic mein hota hai. Condition lagakar count karna filter jaisa hi pattern hai jo reports mein bahut kaam aata hai.",
    edge: ["empty array", "zero", "negative numbers", "no evens"]
  },
  {
    id: "capitalize-words",
    title: "Har word ka pehla letter bada",
    level: 1,
    topic: "Strings",
    prompt: "Function capitalizeWords(text) har word ka pehla letter capital aur baaki letters small karke naya string return karta hai. Words single space se alag hote hain, aur spaces jaise hain waise hi rehne do. Khali string par khali string. Example: 'hELLO woRLD' -> 'Hello World'.",
    fn: "capitalizeWords",
    starter: `function capitalizeWords(text) {
  // yahan apna code likho
}
`,
    tests: [
      { args: ["hello world"], expect: "Hello World" },
      { args: ["HELLO wORLD"], expect: "Hello World" },
      { args: ["javascript is fun"], expect: "Javascript Is Fun" },
      { args: ["a"], expect: "A" },
      { args: [""], expect: "", hidden: true },
      { args: ["a  b"], expect: "A  B", hidden: true }
    ],
    approachQs: [
      "Input string, output bhi string. Ek single word ko 'Capitalized' banane ke liye kya karna padega?",
      "Sentence ko words mein kaise todoge, aur wapas kaise jodoge?",
      "Word ka pehla letter aur baaki hissa alag kaise nikaloge?",
      "Khali word (jaise double space ke beech) aaye to kya hoga?"
    ],
    hints: [
      "Pehle sirf ek word ke liye socho: 'wORLD' ko 'World' kaise banaoge? Phir wohi kaam har word par lagana hai.",
      "text.split(' ') se words ki list milti hai. Har word ka pehla character toUpperCase aur baaki toLowerCase karo, aur sab ko join(' ') se wapas jodo.",
      "Steps: const words = text.split(' '); const result = []; for har word: result.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()); return result.join(' '). charAt(0) khali word par '' deta hai, to crash nahi hoga."
    ],
    solution: `function capitalizeWords(text) {
  const words = text.split(" ");
  const result = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // pehla letter bada, baaki chhote. charAt(0) khali word par "" deta hai
    const fixed = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    result.push(fixed);
  }
  return result.join(" ");
}
`,
    why: "Names, titles aur addresses ko clean aur format karna UI aur data-cleaning mein roz aata hai. split, transform har piece, phir join: yeh teen-step pattern bahut common hai.",
    edge: ["empty string", "single letter word", "already capitalized", "extra spaces between words"]
  },

  // ===================== LEVEL 2 =====================
  {
    id: "two-sum",
    title: "Do numbers ka sum",
    level: 2,
    topic: "Maps",
    prompt: "Function twoSum(nums, target) do alag positions dhoondhta hai jinke numbers ka sum target ho, aur un positions (indices) ka array [i, j] return karta hai, jahan i < j. Maan lo hamesha exactly ek hi solution hai. Example: twoSum([2, 7, 11, 15], 9) -> [0, 1], kyunki 2 + 7 = 9.",
    fn: "twoSum",
    starter: `function twoSum(nums, target) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [[2, 7, 11, 15], 9], expect: [0, 1] },
      { args: [[3, 2, 4], 6], expect: [1, 2] },
      { args: [[3, 3], 6], expect: [0, 1] },
      { args: [[1, 5, 3, 7], 10], expect: [2, 3] },
      { args: [[-1, -2, -3, -4, -5], -8], expect: [2, 4], hidden: true },
      { args: [[0, 4, 3, 0], 0], expect: [0, 3], hidden: true }
    ],
    approachQs: [
      "Output numbers nahi, positions (indices) hain. Yeh dhyan mein rakho.",
      "Agar tum ek number x par ho, to jodidaar number (partner) kitna chahiye?",
      "Brute force mein har pair check karna padta hai. Kya pehle dekhe hue numbers ko yaad rakhkar partner jaldi dhoondh sakte ho?",
      "Yaad rakhne ke liye kaunsa data structure chahiye jisme 'value -> index' store ho?"
    ],
    hints: [
      "Har number ke liye ek hi sawaal poocho: mujhe jodi banane ke liye kaunsa number chahiye, aur kya woh pehle hi dikh chuka hai?",
      "Ek Map banao jisme har dekhe hue number ko uske index ke saath store karo. Har naye number par target - number nikalo aur Map mein dhoondho. Mil gaya to jawab ready, warna current number ko Map mein daal do.",
      "Steps: const seen = new Map(); for j = 0..: need = target - nums[j]; if (seen.has(need)) return [seen.get(need), j]; seen.set(nums[j], j). Pehle check karo, baad mein set karo, taaki ek hi element khud se pair na ban jaye."
    ],
    solution: `function twoSum(nums, target) {
  const seen = new Map(); // number -> index jahan dekha tha
  for (let j = 0; j < nums.length; j++) {
    const need = target - nums[j];   // partner jo chahiye
    if (seen.has(need)) {
      return [seen.get(need), j];    // pehle wala index chhota hoga
    }
    seen.set(nums[j], j);            // check ke baad store karo
  }
  return null; // sawaal ke hisaab se kabhi nahi aayega
}
`,
    why: "Map se 'pehle dekha hua yaad rakhna' nested loop (O(n^2)) ko ek loop (O(n)) mein badal deta hai. Lookup-by-key ka yeh idea caching, joins aur duplicate detection mein roz kaam aata hai.",
    edge: ["same value twice ([3, 3])", "negative numbers", "zeros", "answer at the end of array"]
  },
  {
    id: "remove-duplicates",
    title: "Duplicates hatao",
    level: 2,
    topic: "Arrays",
    prompt: "Function removeDuplicates(arr) naya array return karta hai jisme har value sirf ek baar ho. Har value ka pehla occurrence rakho aur original order same rakho. Khali array par khali array. Example: [1, 2, 2, 3, 1] -> [1, 2, 3].",
    fn: "removeDuplicates",
    starter: `function removeDuplicates(arr) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [[1, 2, 2, 3, 1]], expect: [1, 2, 3] },
      { args: [[3, 1, 2]], expect: [3, 1, 2] },
      { args: [["a", "b", "a"]], expect: ["a", "b"] },
      { args: [[4, 4, 3, 3, 4, 2]], expect: [4, 3, 2] },
      { args: [[]], expect: [], hidden: true },
      { args: [[5, 5, 5]], expect: [5], hidden: true }
    ],
    approachQs: [
      "Input array, output bhi naya array. Kaunse elements output mein jayenge?",
      "Kaise pata karoge ki ek value pehle aa chuki hai?",
      "Order original rakhna hai. Isse tumhare approach par kya asar padta hai?",
      "Yaad rakhne ke liye kaunsa structure sabse tez rahega?"
    ],
    hints: [
      "Array ko left se right padho. Har element par poocho: kya yeh pehle aa chuka hai? Agar nahi, to hi result mein daalo.",
      "'Pehle dekha' yaad rakhne ke liye Set use karo (usme has() aur add() tez hote hain). Result ke liye alag array rakho taaki order bana rahe.",
      "Steps: const seen = new Set(); const result = []; for har item: if (!seen.has(item)) { seen.add(item); result.push(item); } return result."
    ],
    solution: `function removeDuplicates(arr) {
  const seen = new Set(); // jo values aa chuki hain
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (!seen.has(item)) {  // pehli baar dikha
      seen.add(item);
      result.push(item);    // order original hi rahega
    }
  }
  return result;
}
`,
    why: "Set 'yeh pehle aaya kya?' ka sabse tez jawab deta hai. Data cleaning, unique IDs aur import ke duplicate rows hatane mein yeh pattern bahut kaam aata hai.",
    edge: ["empty array", "all same values", "no duplicates", "order must stay original"]
  },
  {
    id: "char-frequency",
    title: "Character frequency",
    level: 2,
    topic: "Maps",
    prompt: "Function charFrequency(text) ek object return karta hai jisme har character ke liye uski ginti ho. Case-sensitive hai ('A' aur 'a' alag), space bhi character hai, aur keys pehli baar dikhne ke order mein honi chahiye. Digits ke keys ka order JavaScript alag karta hai — is problem mein sirf letters aur spaces aayenge. Khali string par {}. Example: 'hello' -> { h: 1, e: 1, l: 2, o: 1 }.",
    fn: "charFrequency",
    starter: `function charFrequency(text) {
  // yahan apna code likho
}
`,
    tests: [
      { args: ["hello"], expect: { h: 1, e: 1, l: 2, o: 1 } },
      { args: ["aaa"], expect: { a: 3 } },
      { args: ["abcabc"], expect: { a: 2, b: 2, c: 2 } },
      { args: ["a b"], expect: { a: 1, " ": 1, b: 1 } },
      { args: [""], expect: {}, hidden: true },
      { args: ["Aa"], expect: { A: 1, a: 1 }, hidden: true }
    ],
    approachQs: [
      "Output ek object hai: key = character, value = kitni baar aaya. Kaisa dikhega 'aab' ke liye?",
      "Har character par do situations hain: pehli baar dikha, ya pehle dekha ja chuka. Dono mein kya karoge?",
      "Kaise check karoge ki key object mein pehle se hai ya nahi?",
      "Kya space ya capital letters ko alag treat karna hai?"
    ],
    hints: [
      "Socho jaise tally marks lagate ho: har character ke naam ka ek khana hai, aur aane par us khane mein ek aur nishaan.",
      "Ek khali object lo. Har character par dekho: agar object mein uski entry hai to count badhao, nahi hai to 1 se shuru karo.",
      "Steps: const freq = {}; for har ch in text: if (freq[ch] === undefined) freq[ch] = 1; else freq[ch] = freq[ch] + 1; return freq."
    ],
    solution: `function charFrequency(text) {
  const freq = {};
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (freq[ch] === undefined) {
      freq[ch] = 1;            // pehli baar dikha
    } else {
      freq[ch] = freq[ch] + 1; // pehle dekha tha, ginti badhao
    }
  }
  return freq;
}
`,
    why: "Frequency map (counting by key) sabse zyada use hone wala pattern hai: analytics, grouping, top-N, duplicate finding, anagram sab isi par bante hain. SQL ka GROUP BY + COUNT yahi hai.",
    edge: ["empty string", "spaces", "uppercase vs lowercase", "same character repeated"]
  },
  {
    id: "is-anagram",
    title: "Anagram check",
    level: 2,
    topic: "Maps",
    prompt: "Function isAnagram(a, b) true return karta hai agar dono strings ke characters same hain aur same baar aate hain (sirf order alag ho sakta hai), warna false. Capital/small ka farq ignore karo; baaki characters (spaces bhi) normal characters ki tarah count honge. Example: 'listen' aur 'silent' -> true.",
    fn: "isAnagram",
    starter: `function isAnagram(a, b) {
  // yahan apna code likho
}
`,
    tests: [
      { args: ["listen", "silent"], expect: true },
      { args: ["hello", "world"], expect: false },
      { args: ["Listen", "Silent"], expect: true },
      { args: ["abc", "ab"], expect: false },
      { args: ["", ""], expect: true, hidden: true },
      { args: ["aab", "abb"], expect: false, hidden: true },
      { args: ["rat", "car"], expect: false, hidden: true },
      { args: ["a b", "ab"], expect: false, hidden: true },
      { args: ["dormitory", "dirty room"], expect: false, hidden: true },
      { args: ["a b", "ba "], expect: true, hidden: true }
    ],
    approachQs: [
      "Anagram ka matlab kya hai? Dono strings mein kya same hona chahiye?",
      "Sabse pehle kaunsa quick check lag sakta hai jo kaam bacha de (length)?",
      "Kya tum ek string ke characters ginkar dusri string se 'cut' kar sakte ho?",
      "Capital letters ko kaise handle karoge?"
    ],
    hints: [
      "Order ki chinta mat karo; sirf yeh dekho ki har character kitni baar aaya. Agar dono strings ki ginti same hai to anagram hai.",
      "Dono ko lowercase karo, lengths alag hon to seedha false. Phir pehli string ki character-ginti ek object mein banao, aur dusri string ke characters us ginti mein se ghatao.",
      "Steps: a, b ko lowercase; length alag -> false. counts = {}; a ke har char par counts[ch]++ (0 se shuru). b ke har char par agar counts[ch] nahi hai ya 0 hai to false; warna counts[ch]--. End mein true."
    ],
    solution: `function isAnagram(a, b) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x.length !== y.length) {
    return false; // length alag to anagram ho hi nahi sakta
  }
  const counts = {};
  // pehli string ke characters ginte hain
  for (let i = 0; i < x.length; i++) {
    const ch = x[i];
    counts[ch] = (counts[ch] || 0) + 1;
  }
  // dusri string ke characters ghatate hain
  for (let i = 0; i < y.length; i++) {
    const ch = y[i];
    if (!counts[ch]) {
      return false; // yeh character bacha hi nahi
    }
    counts[ch]--;
  }
  return true;
}
`,
    why: "Do collections ko 'content ke hisaab se' compare karna (order ignore) frequency map se hota hai. Yahi idea data reconciliation, duplicate-detection aur search mein aata hai.",
    edge: ["different lengths", "empty strings", "different case", "same letters but different counts"]
  },
  {
    id: "factorial",
    title: "Factorial",
    level: 2,
    topic: "Recursion",
    prompt: "Function factorial(n) non-negative integer n ka factorial return karta hai (n * (n-1) * ... * 1). Special case: factorial(0) = 1. Recursion ya loop, jo samajh aaye. Example: factorial(5) -> 120.",
    fn: "factorial",
    starter: `function factorial(n) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [5], expect: 120 },
      { args: [3], expect: 6 },
      { args: [1], expect: 1 },
      { args: [10], expect: 3628800 },
      { args: [0], expect: 1, hidden: true },
      { args: [7], expect: 5040, hidden: true },
      { args: [12], expect: 479001600, hidden: true }
    ],
    approachQs: [
      "factorial(4) ko haath se likho. Kya factorial(4) aur factorial(3) ke beech koi rishta dikhta hai?",
      "Sabse chhota case kaunsa hai jiska jawab seedha pata hai?",
      "Agar tum recursion use karo to function apne aap ko kis chhote input ke saath bulayega?",
      "Agar loop use karo to running product kahan rakhoge?"
    ],
    hints: [
      "Dhyan do: 5! = 5 * 4!. Matlab bade problem ka jawab chhote problem ke jawab se bana sakte ho.",
      "Recursion mein do cheezein chahiye: base case (n 0 ya 1 ho to 1 return) aur recursive case (n * factorial(n - 1)). Loop mein: result = 1 se shuru karke 2..n tak multiply karo.",
      "Recursive: if (n <= 1) return 1; return n * factorial(n - 1);  Loop: let result = 1; for (let i = 2; i <= n; i++) result = result * i; return result;"
    ],
    solution: `function factorial(n) {
  if (n <= 1) {
    return 1; // base case: 0! = 1 aur 1! = 1
  }
  return n * factorial(n - 1); // n! = n * (n-1)!
}
`,
    why: "Recursion ka core: base case plus 'chhota problem' ka rishta. Folder trees, nested comments, menus aur JSON traversal jaise real kaam recursion se hi solve hote hain.",
    edge: ["n = 0", "n = 1", "base case missing leads to infinite recursion"]
  },
  {
    id: "fibonacci-n",
    title: "N-th Fibonacci",
    level: 2,
    topic: "Recursion",
    prompt: "Function fibonacci(n) Fibonacci sequence ka n-th number return karta hai, jahan fib(0) = 0 aur fib(1) = 1, aur uske baad har number pichhle do ka sum hai. Sequence: 0, 1, 1, 2, 3, 5, 8... Example: fibonacci(6) -> 8.",
    fn: "fibonacci",
    starter: `function fibonacci(n) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [6], expect: 8 },
      { args: [5], expect: 5 },
      { args: [10], expect: 55 },
      { args: [2], expect: 1 },
      { args: [0], expect: 0, hidden: true },
      { args: [1], expect: 1, hidden: true },
      { args: [20], expect: 6765, hidden: true }
    ],
    approachQs: [
      "Sequence haath se likho: 0, 1, 1, 2, 3, 5... Naya number kaise banta hai?",
      "Kaunse do starting values pehle se pata hain (n = 0 aur n = 1)?",
      "Loop se karoge to har step par kitni values yaad rakhni padengi?",
      "n = 0 aur n = 1 par loop ka kya hoga?"
    ],
    hints: [
      "Har naya number pichhle do numbers ka sum hai. Isliye tumhe hamesha sirf do pichhli values yaad rakhni hain.",
      "Do variables rakho: prev (fib 0) aur curr (fib 1). n baar aage badho: next = prev + curr, phir prev = curr, curr = next. n = 0 aur 1 pehle alag handle kar sakte ho.",
      "Steps: if (n === 0) return 0; let prev = 0, curr = 1; for (let i = 2; i <= n; i++) { const next = prev + curr; prev = curr; curr = next; } return curr;"
    ],
    solution: `function fibonacci(n) {
  if (n === 0) {
    return 0;
  }
  let prev = 0; // fib(0)
  let curr = 1; // fib(1)
  for (let i = 2; i <= n; i++) {
    const next = prev + curr; // naya = pichhle do ka sum
    prev = curr;
    curr = next;
  }
  return curr;
}
`,
    why: "Do variables ko saath mein update karna (rolling window) aur 'pichhle results se agla result' banana dynamic programming ki neev hai. Isse yeh bhi dikhta hai ki bina soche recursion exponential slow ho sakta hai.",
    edge: ["n = 0", "n = 1", "larger n (20+) should still be fast"]
  },
  {
    id: "is-prime",
    title: "Prime number check",
    level: 2,
    topic: "Math",
    prompt: "Function isPrime(n) true return karta hai agar n prime hai (sirf 1 aur khud se divisible), warna false. Dhyan do: 1 prime nahi hai, 0 aur negative numbers bhi prime nahi hain. Example: isPrime(17) -> true, isPrime(18) -> false.",
    fn: "isPrime",
    starter: `function isPrime(n) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [17], expect: true },
      { args: [18], expect: false },
      { args: [2], expect: true },
      { args: [97], expect: true },
      { args: [1], expect: false, hidden: true },
      { args: [0], expect: false, hidden: true },
      { args: [-7], expect: false, hidden: true },
      { args: [25], expect: false, hidden: true }
    ],
    approachQs: [
      "Prime ki definition apne shabdon mein likho. Kaunse numbers turant 'nahi' hain?",
      "Kisi number ko kaise pata karoge ki wo kisi aur number se divide hota hai?",
      "Kin numbers tak divisor dhoondhna kaafi hai (n tak, ya kam)?",
      "1, 0 aur negative numbers par kya jawab hoga?"
    ],
    hints: [
      "Pehle chhote numbers (n < 2) ko turant false kar do. Baaki ke liye bas ek divisor mil jaye to prime nahi hai.",
      "2 se shuru karke try karo: agar n % i === 0 for koi i, to prime nahi. Aage i tak jaane ki zaroorat n tak nahi, i * i <= n tak hi kaafi hai kyunki divisors jodi mein aate hain.",
      "Steps: if (n < 2) return false; for (let i = 2; i * i <= n; i++) { if (n % i === 0) return false; } return true;"
    ],
    solution: `function isPrime(n) {
  if (n < 2) {
    return false; // 0, 1 aur negative prime nahi
  }
  // sirf sqrt(n) tak check karna kaafi hai
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) {
      return false; // divisor mil gaya
    }
  }
  return true;
}
`,
    why: "Early return (jaldi se false de dena) aur loop ki range ko smart tareeke se kam karna efficiency ki pehli seedhi hai. Edge cases (0, 1, negatives) pehle handle karna validation code ki aadat banata hai.",
    edge: ["1", "0 and negatives", "2 (smallest prime)", "perfect squares like 25"]
  },
  {
    id: "second-largest",
    title: "Doosra sabse bada",
    level: 2,
    topic: "Arrays",
    prompt: "Function secondLargest(nums) array ka doosra sabse bada distinct (alag) value return karta hai. Duplicates ek hi value gini jaayengi. Agar 2 se kam distinct values hain to null return karo. Example: [10, 20, 20] -> 10, aur [5, 5, 5] -> null.",
    fn: "secondLargest",
    starter: `function secondLargest(nums) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [[1, 2, 3]], expect: 2 },
      { args: [[10, 20, 20]], expect: 10 },
      { args: [[-1, -5, -3]], expect: -3 },
      { args: [[3, 1]], expect: 1 },
      { args: [[5, 5, 5]], expect: null, hidden: true },
      { args: [[]], expect: null, hidden: true },
      { args: [[7]], expect: null, hidden: true },
      { args: [[9, 10, 2]], expect: 9, hidden: true },
      { args: [[100, 25, 3, 100]], expect: 25, hidden: true }
    ],
    approachQs: [
      "'Distinct' ka matlab yahan kya hai? [10, 20, 20] mein doosra sabse bada 20 kyun nahi?",
      "Kya sirf ek loop mein sabse bada aur doosra sabse bada dono yaad rakh sakte ho?",
      "Naya number aaye to kab largest badlega, kab sirf second badlega, kab kuch nahi?",
      "Jab kuch mila hi nahi (kam distinct values), to kya return karoge?"
    ],
    hints: [
      "Do variables socho: largest aur second. Shuru mein dono 'abhi kuch nahi' hain. Har number ko dono ke saath compare karo.",
      "Number > largest ho to purana largest ab second ban jata hai aur number naya largest. Number largest se chhota par second se bada (aur largest ke barabar nahi) ho to wo naya second. Shuru mein null use karo kyunki negatives bhi ho sakte hain.",
      "Steps: let largest = null, second = null; for har n: if (largest === null || n > largest) { second = largest; largest = n; } else if (n < largest && (second === null || n > second)) { second = n; } End mein second return."
    ],
    solution: `function secondLargest(nums) {
  let largest = null;
  let second = null;
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    if (largest === null || n > largest) {
      second = largest; // purana largest ab second ban gaya
      largest = n;
    } else if (n < largest && (second === null || n > second)) {
      second = n;       // largest se chhota par second se bada
    }
    // n === largest ho to kuch nahi (duplicate)
  }
  return second; // kam distinct values par null hi rahega
}
`,
    why: "Ek hi pass mein do cheezein track karna (top-2, running min/max) sorting se sasta aur tez hota hai. Leaderboards, 'runner-up' aur top-N queries isi par bante hain.",
    edge: ["all values equal", "empty or single element", "negative numbers", "max value repeated"]
  },
  {
    id: "first-non-repeating",
    title: "Pehla unique character",
    level: 2,
    topic: "Maps",
    prompt: "Function firstNonRepeating(text) string ka pehla character return karta hai jo poori string mein sirf ek hi baar aaya hai. Agar aisa koi nahi hai (ya string khali hai) to null return karo. Case-sensitive hai. Example: 'swiss' -> 'w'.",
    fn: "firstNonRepeating",
    starter: `function firstNonRepeating(text) {
  // yahan apna code likho
}
`,
    tests: [
      { args: ["swiss"], expect: "w" },
      { args: ["leetcode"], expect: "l" },
      { args: ["aabbc"], expect: "c" },
      { args: ["stress"], expect: "t" },
      { args: ["aabb"], expect: null, hidden: true },
      { args: [""], expect: null, hidden: true },
      { args: ["a"], expect: "a", hidden: true },
      { args: ["abcabc"], expect: null, hidden: true }
    ],
    approachQs: [
      "'Pehla jo ek hi baar aaya' ko jaanne ke liye tumhe kya pata hona chahiye har character ke baare mein?",
      "Kya ek hi pass mein jawab mil sakta hai, ya pehle ginti karni padegi?",
      "Ginti ke baad kis order mein characters dekhoge?",
      "Agar koi unique character nahi mila to kya return karoge?"
    ],
    hints: [
      "Pehle poori string ki ek ginti bana lo (kaun kitni baar aaya). Sirf ginti dekhkar tum decide nahi kar sakte kaun 'pehla' hai, order ke liye dobara string hi chalani padegi.",
      "Do passes: pass 1 mein frequency object banao. Pass 2 mein string ko original order mein dobara chalao aur pehla character return karo jiski ginti 1 hai.",
      "Steps: const count = {}; for har ch: count[ch] = (count[ch] || 0) + 1; phir for har ch (dobara, original order): if (count[ch] === 1) return ch; End mein return null."
    ],
    solution: `function firstNonRepeating(text) {
  const count = {};
  // pass 1: har character ki ginti
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    count[ch] = (count[ch] || 0) + 1;
  }
  // pass 2: original order mein pehla jiski ginti 1 hai
  for (let i = 0; i < text.length; i++) {
    if (count[text[i]] === 1) {
      return text[i];
    }
  }
  return null; // koi unique nahi mila
}
`,
    why: "Do-pass approach (pehle data summarise, phir dobara use) bahut common hai. Frequency map aur original order ko saath mein use karna 'first unique', 'first error' jaise queries ka base hai.",
    edge: ["empty string", "every character repeats", "unique at the end", "case-sensitivity"]
  },

  // ===================== LEVEL 3 =====================
  {
    id: "valid-parentheses",
    title: "Brackets sahi hain?",
    level: 3,
    topic: "Stacks",
    prompt: "Function isValid(text) ek string leta hai jisme sirf brackets ( ) [ ] { } hain. true return karo agar har opening bracket ka sahi type ka closing bracket sahi order mein aata hai, warna false. Khali string valid hai. Example: '([]{})' -> true, '([)]' -> false.",
    fn: "isValid",
    starter: `function isValid(text) {
  // yahan apna code likho
}
`,
    tests: [
      { args: ["()"], expect: true },
      { args: ["()[]{}"], expect: true },
      { args: ["(]"], expect: false },
      { args: ["([)]"], expect: false },
      { args: ["{[]}"], expect: true },
      { args: [""], expect: true, hidden: true },
      { args: ["("], expect: false, hidden: true },
      { args: [")"], expect: false, hidden: true }
    ],
    approachQs: [
      "Jab ek closing bracket aata hai, to usse kaun sa opening bracket match hona chahiye (sabse purana ya sabse naya)?",
      "Opening brackets ko kaise yaad rakhoge taaki sabse naya pehle mile?",
      "Closing bracket aane par agar yaad rakhne ke liye kuch bacha hi nahi ho, to kya matlab hua?",
      "String khatam hone par agar kuch opening brackets bache hain to?"
    ],
    hints: [
      "Socho plates ka dher: jo plate sabse upar rakhi, wohi sabse pehle uthegi. Brackets ka matching bhi aisa hi hai: sabse naya opening sabse pehle band hona chahiye.",
      "Ek stack (array jisme push/pop use karo) rakho. Opening bracket mile to push. Closing mile to pop karke dekho ki sahi jodi ka opening hai ya nahi. Closing ke liye 'kaunsa opening chahiye' ek object mein likh sakte ho.",
      "Steps: pairs = { ')': '(', ']': '[', '}': '{' }; stack = []; for har ch: agar ch pairs ka key hai: agar stack khali ya stack.pop() !== pairs[ch] -> return false; warna (opening) stack.push(ch). End mein return stack.length === 0."
    ],
    solution: `function isValid(text) {
  // closing -> uska matching opening
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = []; // abhi tak khule hue brackets
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (pairs[ch] === undefined) {
      stack.push(ch);              // opening bracket, yaad rakho
    } else {
      const top = stack.pop();     // sabse naya khula bracket
      if (top !== pairs[ch]) {
        return false;              // galat jodi ya kuch khula hi nahi tha
      }
    }
  }
  return stack.length === 0;       // sab band hone chahiye
}
`,
    why: "Stack 'last in, first out' wala structure hai: undo/redo, nested HTML/JSON parsing, expression evaluation aur call stacks sab isi se chalte hain. Compilers aur linters bhi brackets isi tarah check karte hain.",
    edge: ["empty string", "only closing bracket", "only opening bracket", "wrong order like ([)]", "leftover openings at the end"]
  },
  {
    id: "flatten-array",
    title: "Nested array ko flat karo",
    level: 3,
    topic: "Recursion",
    prompt: "Function flattenArray(arr) ek nested array leta hai (arrays ke andar arrays, kisi bhi depth tak) aur ek single-level flat array return karta hai, original order mein. Example: [1, [2, [3, [4]]]] -> [1, 2, 3, 4]. Khali inner arrays se kuch nahi aata. Built-in .flat() mat use karo.",
    fn: "flattenArray",
    starter: `function flattenArray(arr) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [[1, [2, 3]]], expect: [1, 2, 3] },
      { args: [[1, [2, [3, [4]]]]], expect: [1, 2, 3, 4] },
      { args: [[1, 2, 3]], expect: [1, 2, 3] },
      { args: [[[1, [2]], [3, [[4]]]]], expect: [1, 2, 3, 4] },
      { args: [[]], expect: [], hidden: true },
      { args: [[[], [1]]], expect: [1], hidden: true }
    ],
    approachQs: [
      "Array ke har item ke saath do cheezein ho sakti hain: wo number hai, ya wo khud ek array hai. Dono ke liye kya karoge?",
      "Kaise check karoge ki ek item array hai ya nahi?",
      "Agar item array hai, to kya tum wohi function us par dobara use kar sakte ho?",
      "Result ko kahan collect karoge taaki order sahi rahe?"
    ],
    hints: [
      "Socho: ek chhota array flat karna to aasan hai. Agar andar phir array mile, to wohi kaam us par karna hai. Kaam apne aap ko dohra raha hai.",
      "Loop chalao. Item array hai to flattenArray(item) ka result result mein jod do (spread ya loop se). Array nahi hai to seedha push. Array check ke liye Array.isArray(item).",
      "Steps: const result = []; for har item: if (Array.isArray(item)) { const inner = flattenArray(item); for har x in inner: result.push(x); } else { result.push(item); } return result."
    ],
    solution: `function flattenArray(arr) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (Array.isArray(item)) {
      const inner = flattenArray(item); // recursion: andar wale ko flat karo
      for (let j = 0; j < inner.length; j++) {
        result.push(inner[j]);
      }
    } else {
      result.push(item); // normal value seedha daalo
    }
  }
  return result;
}
`,
    why: "Nested data (JSON, folder trees, comments with replies, menus) ko traverse karna recursion ka sabse real use hai. 'Agar yeh bhi container hai to wohi kaam dobara' wali soch yahan seekhte ho.",
    edge: ["empty array", "empty inner arrays", "deep nesting", "already flat array"]
  },
  {
    id: "longest-word",
    title: "Sabse lamba word",
    level: 3,
    topic: "Strings",
    prompt: "Function longestWord(text) string ka sabse lamba word return karta hai. Words whitespace se alag hote hain aur extra spaces ignore karo. Agar do words barabar lambe hon to jo pehle aaye wo return karo. Khali ya sirf spaces wali string par '' return karo. Example: 'I love programming' -> 'programming'.",
    fn: "longestWord",
    starter: `function longestWord(text) {
  // yahan apna code likho
}
`,
    tests: [
      { args: ["I love programming"], expect: "programming" },
      { args: ["cat dog"], expect: "cat" },
      { args: ["hello"], expect: "hello" },
      { args: ["a bb cc d"], expect: "bb" },
      { args: [""], expect: "", hidden: true },
      { args: ["  a  bb  "], expect: "bb", hidden: true },
      { args: ["   "], expect: "", hidden: true },
      { args: ["hi\tthere"], expect: "there", hidden: true },
      { args: ["ab\ncdef gh"], expect: "cdef", hidden: true }
    ],
    approachQs: [
      "Pehle string ko words mein kaise todoge, extra spaces ke saath bhi?",
      "'Best so far' kya hoga aur kis cheez se compare hoga (length se)?",
      "Tie hone par pehla word rakhna hai. Isse tumhari comparison ('>' ya '>=') par kya farq padta hai?",
      "Khali string par split ka kya result aata hai, aur uska kya karoge?"
    ],
    hints: [
      "Yeh max-in-array jaisa hi sawaal hai, bas 'bada' ka matlab 'zyada length' hai. Pehle words ki list banao, phir best word track karo.",
      "trim() karke whitespace par split karo (regex /\\s+/). Dhyan rakho ki khali string split karne par [''] milta hai, jiski length 0 hai, to best '' hi rahega. Best ko tabhi badlo jab word.length STRICTLY bada ho (isse tie mein pehla rehta hai).",
      "Steps: const words = text.trim().split(/\\s+/); let best = ''; for har word: if (word.length > best.length) best = word; return best."
    ],
    solution: `function longestWord(text) {
  // trim + whitespace par split. Khali string par [""] milta hai (theek hai)
  const words = text.trim().split(/\\s+/);
  let best = "";
  for (let i = 0; i < words.length; i++) {
    if (words[i].length > best.length) { // strictly bada, tie mein pehla rahega
      best = words[i];
    }
  }
  return best;
}
`,
    why: "Strings ko todna aur phir 'best so far' track karna search results, log analysis aur text processing mein bahut aata hai. Tie-breaking rule (> vs >=) clear rakhna real specs mein bhi zaroori hota hai.",
    edge: ["empty string", "only spaces", "tie between words", "extra spaces", "single word"]
  },
  {
    id: "chunk-array",
    title: "Array ke tukde karo",
    level: 3,
    topic: "Arrays",
    prompt: "Function chunkArray(arr, size) array ko size-size ke tukdon (chunks) mein baant kar array of arrays return karta hai. Aakhri chunk chhota ho sakta hai. Maan lo size >= 1. Khali array par []. Example: chunkArray([1, 2, 3, 4, 5], 2) -> [[1, 2], [3, 4], [5]].",
    fn: "chunkArray",
    starter: `function chunkArray(arr, size) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [[1, 2, 3, 4, 5], 2], expect: [[1, 2], [3, 4], [5]] },
      { args: [[1, 2, 3, 4], 2], expect: [[1, 2], [3, 4]] },
      { args: [["a", "b", "c"], 2], expect: [["a", "b"], ["c"]] },
      { args: [[1, 2, 3], 1], expect: [[1], [2], [3]] },
      { args: [[], 3], expect: [], hidden: true },
      { args: [[1, 2, 3], 5], expect: [[1, 2, 3]], hidden: true }
    ],
    approachQs: [
      "Output array of arrays hai. [1,2,3,4,5] aur size 2 ke liye chunks kahan se kahan tak hain (index ke hisaab se)?",
      "Loop ka index har baar kitna aage badhna chahiye?",
      "Array ka ek hissa (slice) kaise nikaloge, aur kya aakhri chhota hissa apne aap sahi niklega?",
      "Size array se bada ho to kya hoga?"
    ],
    hints: [
      "Socho kitaab ke pages ko bundle mein baant rahe ho: pehle 2, phir agle 2, phir bache hue. Har bundle ek nayi shuruaat par shuru hota hai.",
      "Loop ka counter 1 ke bajay size se badhao (i += size). Har baar arr.slice(i, i + size) se ek chunk lo. slice end se bahar jaane par crash nahi karta, bas bachi hui cheezein deta hai.",
      "Steps: const result = []; for (let i = 0; i < arr.length; i += size) { result.push(arr.slice(i, i + size)); } return result;"
    ],
    solution: `function chunkArray(arr, size) {
  const result = [];
  // i har baar size se aage badhta hai: 0, size, 2*size, ...
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size)); // aakhri chunk apne aap chhota nikalega
  }
  return result;
}
`,
    why: "Data ko batches mein todna pagination, bulk API calls, aur database inserts mein roz aata hai. i += size jaisa custom loop step aur slice ka use yahan seekhte ho.",
    edge: ["empty array", "size larger than array", "size 1", "last chunk smaller"]
  },
  {
    id: "merge-sorted-arrays",
    title: "Do sorted arrays merge karo",
    level: 3,
    topic: "Arrays",
    prompt: "Function mergeSorted(a, b) do already sorted (chhote se bade) arrays ko ek sorted array mein jodkar return karta hai. Duplicates rakhne hain. Koi ek ya dono khali ho sakte hain. Example: mergeSorted([1, 3, 5], [2, 4, 6]) -> [1, 2, 3, 4, 5, 6]. Concat + sort mat karo, do pointers use karo.",
    fn: "mergeSorted",
    starter: `function mergeSorted(a, b) {
  // yahan apna code likho
}
`,
    tests: [
      { args: [[1, 3, 5], [2, 4, 6]], expect: [1, 2, 3, 4, 5, 6] },
      { args: [[5, 6], [1, 2]], expect: [1, 2, 5, 6] },
      { args: [[1, 1], [1, 2]], expect: [1, 1, 1, 2] },
      { args: [[-3, 0, 4], [-2, 5]], expect: [-3, -2, 0, 4, 5] },
      { args: [[], [1, 2]], expect: [1, 2], hidden: true },
      { args: [[1, 2], []], expect: [1, 2], hidden: true },
      { args: [[], []], expect: [], hidden: true }
    ],
    approachQs: [
      "Dono arrays pehle se sorted hain. Result ka agla (sabse chhota) element kahan se aa sakta hai?",
      "Har array ke liye ek 'abhi kahan hoon' position kaise rakhoge?",
      "Har step par kya compare karoge, aur jisko liya uski position ka kya karoge?",
      "Jab ek array khatam ho jaye aur doosre mein elements bache hon to?"
    ],
    hints: [
      "Socho do lines mein khade log height ke order mein: tum dono lines ke aage wale ko dekhte ho, jo chhota hai use nikaalte ho. Phir wohi dohrate ho.",
      "Do pointers i (a ke liye) aur j (b ke liye), dono 0 se. Jab tak dono arrays mein elements bache hain, a[i] aur b[j] mein chhota result mein daalo aur sirf us array ka pointer aage badhao. Phir jo bacha hai use result ke end mein jodo.",
      "Steps: result = []; i = 0; j = 0; while (i < a.length && j < b.length) { if (a[i] <= b[j]) { push a[i]; i++ } else { push b[j]; j++ } } phir while (i < a.length) push a[i++]; while (j < b.length) push b[j++]; return result."
    ],
    solution: `function mergeSorted(a, b) {
  const result = [];
  let i = 0; // a mein position
  let j = 0; // b mein position
  // dono mein elements bache hain: chhota wala nikalo
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      result.push(a[i]);
      i++;
    } else {
      result.push(b[j]);
      j++;
    }
  }
  // jo array bacha hai uska baaki hissa seedha jodo
  while (i < a.length) {
    result.push(a[i]);
    i++;
  }
  while (j < b.length) {
    result.push(b[j]);
    j++;
  }
  return result;
}
`,
    why: "Do pointers se do sorted lists ko ek pass mein merge karna merge sort ka dil hai, aur database merge-joins tathaa log-merging mein bhi yahi hota hai. Yeh sikhata hai ki 'already sorted hona' ek fayda hai jo sort dobara karne se bachata hai.",
    edge: ["one or both arrays empty", "duplicates across arrays", "all of one array smaller than the other", "negative numbers"]
  }
];
