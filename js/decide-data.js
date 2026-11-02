// Decision-making scenarios. Learner picks an option + writes own reason FIRST, then sees why/askFirst/trap.
window.DECIDE = [
  {
    id: "sync-vs-async-endpoint",
    title: "Export endpoint timeout ho raha hai — sync rakhein ya async banayein?",
    tag: "API",
    situation: "Tumhare ASP.NET Core API ka /reports/export endpoint 50,000 rows ki Excel file banata hai. Query plus file generation mein 40-90 second lagte hain, aur Nginx ka timeout 60s hai, to roz ke ~30 requests mein se 6-7 par 504 aata hai. Users ko lagta hai kuch hua nahi, to woh dobara click karte hain aur server par duplicate load badhta hai. Sirf 5-6 finance log ye endpoint use karte hain, lekin DB ka CPU peak time mein pehle se 70% hota hai. Sprint mein 3 din bache hain.",
    question: "Tum is endpoint ko kaise theek karoge?",
    options: [
      { t: "Nginx aur Kestrel ka timeout 5 minute kar do", pro: "Ek line ka change hai, aaj hi deploy ho jata hai.", con: "Connection 90 second tak hold rehta hai, retry aur duplicate load waisa hi rehta hai, aur browser/load balancer ke apne timeouts alag se maar sakte hain." },
      { t: "Query optimise karo aur endpoint sync hi rakho", pro: "Faster query har jagah kaam aati hai, koi naya infra nahi chahiye.", con: "50k rows ki Excel generation khud slow hai, guarantee nahi ki 60 second ke neeche aa jayega aur data badhne par wapas wahi problem." },
      { t: "Export par date-range limit lagao (max 5k rows)", pro: "Simple hai, koi naya component nahi.", con: "Finance ka monthly full export ka workflow toot jata hai, woh 10 baar alag-alag export karenge." },
      { t: "Async job banao: POST par 202 + jobId, background worker file banaye, UI status poll karke download link de", pro: "Timeout ka concept hi khatam, jobId se duplicate click rok sakte ho, aur kitne exports parallel chalein ye tum control karte ho.", con: "Naye moving parts: job status storage, status endpoint, file cleanup, aur UI mein polling." }
    ],
    best: 3,
    why: "Yahan kaam ki duration (40-90s) HTTP request ki limit se hi bada hai, aur users ke retry se load aur badh raha hai. Timeout badhana symptom chhupata hai, problem nahi. Async job mein user ko turant jawab milta hai, aur tum worker concurrency limit karke DB ko bhi bacha sakte ho. Agar export 2-3 second ka hota to sync hi best hota, kyunki async ka extra complexity worth nahi. Query optimisation phir bhi karo, lekin woh async ke saath ek alag improvement hai, replacement nahi.",
    askFirst: [
      "Slow hissa kaunsa hai - DB query, Excel generation ya network? Maine profile kiya ya andaza lagaya?",
      "User ko file turant chahiye ya 2-3 minute chalega (email ya notification ke saath)?",
      "Peak par kitne exports ek saath chalte hain, aur DB par unka kitna asar hai?",
      "Kya codebase mein pehle se background job setup hai (Hangfire, BackgroundService, queue)?",
      "Generated file kahan rakhi jayegi, kitne din, aur kaun download kar sakta hai?"
    ],
    trap: "Timeout badha dena sabse aasaan lagta hai aur 'chal raha hai' ka feel deta hai. Lekin problem duration ki hai, timeout ki nahi, to kuch hafton mein data badhne par wahi 504 wapas aa jayega."
  },
  {
    id: "cache-or-not",
    title: "Slow dashboard query — cache lagayein ya nahi?",
    tag: "Performance",
    situation: "Manager ka /sales-summary dashboard load hone mein 6 second leta hai. Query 40 million rows wali Orders table par aggregate karti hai (date range aur region filter ke saath). Tumne execution plan dekh liya, indexes use ho rahe hain aur query ko aur tune karne ka koi bada mauka nahi dikha. Data sirf raat 2 baje ke ETL se update hota hai, din bhar nahi badalta. Subah 9-10 baje ke beech ~200 users dashboard kholte hain, aur zyada tar log wahi 15-20 common filter combinations dekhte hain.",
    question: "Tum kya karoge?",
    options: [
      { t: "Query ko aur tune karte raho, cache mat lagao", pro: "Stale data ka koi risk nahi, aur sab kuch ek hi jagah (DB) mein rehta hai.", con: "Tum already tune kar chuke ho, aur 40M rows ka aggregate 6s se bahut neeche aane ki umeed kam hai." },
      { t: "Result ko filters ke key par cache karo, ETL khatam hote hi invalidate ya refresh karo", pro: "Data din bhar same rehta hai to cache hit rate bahut high hoga aur response milliseconds mein aayega, bina stale data ke.", con: "ETL ke baad invalidation ka hook chahiye, aur subah 9 baje sabke ek saath cold cache maarne par load spike ho sakta hai." },
      { t: "Bada DB instance le lo aur live query hi chalao", pro: "Code mein koi change nahi.", con: "Har mahine ka extra kharcha, aur 6s shayad 3-4s hi hoga, wohi query 200 baar chalegi." },
      { t: "Cache karo, 24 ghante ka fixed TTL ke saath", pro: "Sabse simple implementation, ETL se koi coupling nahi.", con: "Cache kal 9 baje bana to aaj raat 2 baje ke ETL ke baad bhi purana data dikhayega, yaani subah ke users ko galat numbers." }
    ],
    best: 1,
    why: "Yahan teen cheezein ek saath sach hain: data ek hi baar badalta hai, query expensive hai, aur same filter combinations baar-baar mang rahe hain. Isliye cache ka hit rate high hoga aur staleness ka window predictable hai (ETL ke baad invalidate). Cold-start spike ke liye ETL ke baad common combinations ko pre-warm kar do. Agar data real-time hota, ya filter combinations hazaaron hote (low hit rate), ya result user/role ke hisaab se alag hota (cache key mein user chahiye), to pre-aggregated summary table behtar rasta hota.",
    askFirst: [
      "Data kitni baar aur kab badalta hai, aur kitni staleness business ko chalegi?",
      "Kitne alag-alag filter combinations hain, matlab cache hit rate kitna rahega?",
      "Kya result user ya role ke hisaab se alag hai (permissions)? Cache key mein kya jayega?",
      "Kya query tune ho chuki hai ya sirf andaza hai? Plan ya index check kiya?",
      "Cache kahan rahega - in-memory (IMemoryCache) ya shared (Redis)? Kitne app instances hain?"
    ],
    trap: "Do galat instincts hain: 'cache toh hamesha accha hota hai' ya 'cache se stale data aata hai, to kabhi mat lagao'. Sahi sawal ye hai ki data kitna badalta hai aur invalidate kab karna hai."
  },
  {
    id: "sql-vs-nosql-for-a-new-feature",
    title: "Naye feature ke liye SQL ya NoSQL?",
    tag: "Database",
    situation: "Tumhari SaaS app (ASP.NET Core + PostgreSQL) mein naya feature aa raha hai: har client apne custom feedback form ke fields define kar sakta hai (text, dropdown, rating - 5 se 30 fields). ~400 clients hain, har ek ke ~10k responses saal mein aate hain. Responses ko filter karna hai aur existing users aur branches tables se join karke report banani hai. Team 4 log ki hai, sab Postgres jaante hain, MongoDB koi chalata nahi. Ek senior bol raha hai 'schema flexible hai, to Mongo lo'.",
    question: "Tum responses kahan aur kaise store karoge?",
    options: [
      { t: "Postgres mein hi: fixed fields normal columns mein, custom answers ek jsonb column mein (jahan filter chahiye wahan index)", pro: "Users/branches se join, transactions aur existing backup/monitoring sab wahi rehta hai, aur flexible fields bhi mil jaate hain.", con: "jsonb ke andar ke fields par type safety aur constraints kam hain, aur heavy filtering ke liye index sochna padega." },
      { t: "Naya MongoDB cluster, responses wahan rakho", pro: "Flexible documents ke liye natural fit hai.", con: "Join ya report ke liye data do jagah mein hoga, naya system chalane, backup aur monitor karne ka bojh 4 logon par, aur consistency ka sawal." },
      { t: "EAV table (response_id, field_id, value) banao", pro: "Poori tarah relational, koi jsonb ya naya DB nahi.", con: "Ek response ke 30 fields ke liye 30 rows, queries aur pivot reports complex aur slow ho jaate hain." },
      { t: "Har client ke liye alag table ya dynamic ALTER TABLE chalao", pro: "Har client ke columns ka proper type aur index mil sakta hai.", con: "400 tables ya runtime DDL, migrations ka dard, aur permission/locking ke risk." }
    ],
    best: 0,
    why: "Is feature ka 'flexible' hissa sirf custom answers hain, baaki data (users, branches, client) strongly relational hai aur tumhe usse join bhi karna hai. Postgres ka jsonb isi jagah ke liye hai, aur 400 x 10k = 4M rows/year Postgres ke liye chhota scale hai. Naya DB add karne ka matlab 4 logon ki team par ek aur system chalane ka kharcha, bina kisi zaroorat ke. Agar data billions of events jaisa hota, ya join ki zaroorat hi na hoti aur team ko document DB ka experience hota, to alag sochte.",
    askFirst: [
      "Data ka shape kitna flexible hai, aur kaun sa hissa fixed hai? Kya sab kuch flexible hai ya sirf ek hissa?",
      "Kya iss data ko existing tables ke saath join ya transaction mein use karna hai?",
      "Expected volume aur growth kya hai (rows per year, reads vs writes)?",
      "Team ko kis tech ka experience hai, aur naya DB chalane (backup, monitoring, on-call) ki capacity hai?",
      "Kaunse queries sabse zyada chalengi - filter, aggregate, ya single response fetch?"
    ],
    trap: "'Schema flexible hai to NoSQL' sunne mein logical lagta hai, lekin tum poore DB ki jagah ek hi column ki flexibility dhoondh rahe ho. Naya system add karne ki hidden cost dikhti nahi."
  },
  {
    id: "hotfix-vs-rollback",
    title: "Prod mein bug aa gaya — hotfix ya rollback?",
    tag: "Release",
    situation: "Friday shaam 6 baje hain. Aaj 4 baje 14 PRs ka ek batch release hua tha. Ab support bata raha hai ki ~3% orders mein discount double lag raha hai: roz ~800 orders, yaani ~25 galat orders har ghante, aur har ek par paisa ja raha hai. Release mein koi destructive DB migration nahi, sirf ek nullable column add hua hai. Pichhle build par rollback ka button pipeline mein hai, jo pichhle mahine test hua tha (~10 minute). Root cause abhi nahi pata, jis module ka bug lag raha hai uske jaankar do mein se ek dev leave par hai. Tum on-call ho.",
    question: "Tum kya karoge?",
    options: [
      { t: "Seedha hotfix likho aur abhi push karo", pro: "Agar guess sahi nikla to fix aur naya code dono ek saath aa jayenge.", con: "Root cause pata nahi hai, Friday shaam ko ghabrahat mein bina poori testing ka fix naya bug la sakta hai." },
      { t: "Weekend monitor karo, Monday ko fix karo", pro: "Koi risky deployment nahi hota.", con: "Do din mein ~1200 galat orders, paise ka direct nuksan, aur customers ka bharosa." },
      { t: "Pichhle build par rollback karo, Monday ko root cause dhoondh ke test ke saath fix nikalo", pro: "10 minute mein bleeding ruk jati hai, ek tested path hai, aur fix par aaram se kaam ho sakta hai.", con: "Release ke baaki 13 acche PRs bhi wapas chale jaate hain, aur galat lag chuke orders ka data alag se theek karna padega." },
      { t: "Bug wale orders ko DB mein manually theek karte raho, release rehne do", pro: "Naye features user ko milte rehte hain.", con: "Ye code fix nahi hai, har ghante naye galat orders banenge aur manual DB writes khud ek risk hain." }
    ],
    best: 2,
    why: "Paise ka loss chal raha hai aur root cause unknown hai, to pehla kaam damage rokna hai, aur sabse safe tareeka wohi hai jo pehle test ho chuka ho: rollback. Release mein migration additive hai (nullable column), to purana code us column ke saath bhi chal jayega. Rollback ke baad galat discount wale orders ki list nikaal ke alag se fix karo. Agar migration destructive hoti ya naye format ka data likh chuki hoti, to rollback risky hota. Aur agar cause ek line ka confirmed hota aur turant tested ho sakta, to hotfix bhi sahi option ban sakta tha.",
    askFirst: [
      "Bug se abhi kitna nuksan ho raha hai aur kitni jaldi badh raha hai (paisa, data corruption, ya sirf UI glitch)?",
      "Release mein DB migration ya data change hai? Kya purana code naye schema ke saath chal sakta hai?",
      "Rollback ka rasta kab test hua, aur kitna time lagega?",
      "Root cause pata hai? Kya ek chhota, confirmed aur testable fix hai?",
      "Feature flag se bug wala hissa band ho sakta hai? Aur kaun-kaun is waqt available hai review ke liye?"
    ],
    trap: "Hero banke 'main abhi fix kar deta hoon' wala instinct tempting hai. Lekin Friday shaam, jaankar dev absent aur unknown cause ke saath hotfix ek naya incident banane ka sabse tez tareeka hai."
  },
  {
    id: "offset-vs-keyset-pagination",
    title: "Order history feed ki pagination — offset ya keyset?",
    tag: "Database",
    situation: "Mobile app ke 'Order history' feed ka API GET /orders?page=N&size=20 hai, aur Orders table mein 12 million rows hain, created_at desc sort mein. App infinite scroll use karta hai: sirf 'aur dikhao', koi 'page 57 par jao' ka option nahi. Naye orders har second aate rehte hain. Support se complaint aayi hai ki kuch users ko same order do baar dikhta hai, aur purane pages (page 2000+) load hone mein 4-5 second lagte hain. EF Core mein abhi Skip/Take use ho raha hai.",
    question: "Pagination ko kaise theek karoge?",
    options: [
      { t: "Offset hi rakho, bas created_at par index add kar do", pro: "Code mein minimal change, aur index se sort ka kharcha kam hota hai.", con: "Deep pages par DB ko phir bhi OFFSET tak rows skip karni padti hain, aur beech mein naye orders aane se duplicates wapas bhi aate rahenge." },
      { t: "Keyset (cursor) pagination: (created_at, id) ke basis par 'iske baad ke 20' ka query", pro: "Deep pages bhi utne hi fast jitna pehla page, aur naye inserts se duplicates ya skips nahi hote.", con: "'Page 57 par jao' ya total pages dikhana mushkil hota hai, aur cursor encode karna aur unique tie-breaker (id) dhyan se rakhna padta hai." },
      { t: "Page size 100 kar do taaki pages kam aayein", pro: "Ek line ka change.", con: "Har page bhaari, mobile data zyada, aur duplicates aur deep-page slowness ka root cause waisa hi rehta hai." },
      { t: "Pura history ek baar mein bhej do aur app mein paginate karo", pro: "Server pagination ka sawal hi khatam.", con: "Heavy users ke lakhon orders ka payload, mobile memory aur network par bojh, aur data stale ho jata hai." }
    ],
    best: 1,
    why: "Feed sirf aage jaata hai aur table ke top par rows lagataar aati rehti hain, to offset dono problems deta hai: deep pages slow (DB OFFSET tak rows ginta hai) aur shifting rows se duplicates. Keyset 'last seen (created_at, id) se chhote' wali condition lagata hai, jo index se seedha seek hoti hai. Id tie-breaker isliye ki same created_at wali rows na chhoote. Agar admin table ho jahan 'page number par jao' aur total count zaroori ho, ya data chhota ho (kuch hazaar rows), to offset bilkul theek rehta.",
    askFirst: [
      "User sirf aage-peeche jaata hai ya kisi bhi page number par kood sakta hai?",
      "Table kitni badi hai aur user kitna deep jaata hai? Kya data lagataar insert ho raha hai?",
      "Sort order kya hai, aur kya wo column unique hai ya tie-breaker chahiye?",
      "Kya UI ko total count ya total pages dikhane hain?",
      "Query ka actual plan kya hai - index use ho raha hai ya poora scan?"
    ],
    trap: "Skip/Take sabse pehle yaad aata hai aur chhote data par chal bhi jata hai, isliye hum use hi pakad lete hain. Dikkat tab dikhti hai jab data badhta hai aur rows ke beech mein insert hone lagte hain."
  },
  {
    id: "where-to-store-the-jwt",
    title: "Angular SPA mein JWT kahan rakhein?",
    tag: "Security",
    situation: "Tum Angular SPA (app.acme.com) bana rahe ho, jiska ASP.NET Core API (api.acme.com) bhi company ka hi hai, aur dono par tumhara control hai. App mein sensitive customer data hai. Login ke baad API JWT deti hai. Page par ek third-party chat widget aur analytics script bhi load hote hain. Abhi koi mobile client nahi hai. Ek tutorial localStorage mein token rakhna sikha raha hai, 'sab yahi karte hain'. Security review 2 hafte mein hai.",
    question: "Token kahan rakhoge?",
    options: [
      { t: "localStorage mein rakho aur interceptor se Authorization header lagao", pro: "Sabse aasaan, refresh par bhi token bacha rehta hai, tutorials mein sab yahi hai.", con: "Koi bhi XSS (ya compromised third-party script) token seedha padh ke bhej sakta hai." },
      { t: "sessionStorage mein rakho", pro: "Tab band hote hi token chala jata hai.", con: "XSS ke liye ye bhi JavaScript se readable hai, to security ka asli problem waisa hi hai." },
      { t: "Backend token ko HttpOnly, Secure, SameSite cookie mein set kare; Angular ko token dikhe hi nahi; saath mein CSRF protection lagao", pro: "JavaScript token padh hi nahi sakta, to XSS se token chori nahi hota, aur same-site setup mein simple chalta hai.", con: "CSRF ka dhyan rakhna padta hai (SameSite aur anti-forgery token), withCredentials/CORS setup chahiye, aur ye cross-site ya mobile clients ke liye fit nahi." },
      { t: "Access token sirf memory mein, refresh token HttpOnly cookie mein", pro: "Access token ka exposure window chhota, cross-origin APIs ke liye bhi flexible.", con: "Zyada moving parts: silent refresh, page reload par token dobara lena, aur token rotation sahi karna padta hai." }
    ],
    best: 2,
    why: "Yahan frontend aur API same site par hain, tum dono control karte ho, aur page par third-party scripts hain, to token ko JavaScript se door rakhna sabse bada fayda hai. HttpOnly cookie token chori ko rokti hai, aur SameSite plus anti-forgery CSRF ko sambhalta hai. Dhyan rakho ki XSS phir bhi user ki taraf se requests bhej sakta hai, to CSP aur input sanitization alag se chahiye; cookie sirf token theft rokti hai. Agar API cross-site ho, mobile ya third-party clients bhi ho, to memory mein access token aur HttpOnly refresh cookie wala option behtar rahega.",
    askFirst: [
      "SPA aur API same site (domain) par hain ya alag? Dono par mera control hai?",
      "Page par kaun-kaun si third-party scripts chalti hain, aur XSS ka risk kitna hai?",
      "Data kitna sensitive hai, aur security review ya compliance ki kya requirement hai?",
      "Kya mobile ya third-party API clients bhi aayenge jinhe Authorization header chahiye?",
      "Token expire hone par refresh ka plan kya hai, aur logout par token kaise revoke hoga?"
    ],
    trap: "'Sab localStorage use karte hain' ka matlab 'safe hai' nahi hota, bas aasaan hai. Aur doosri galti: sochna ki cookie lagane se CSRF aur XSS dono apne aap solve ho gaye."
  },
  {
    id: "use-ai-generated-code-you-dont-understand",
    title: "AI ka diya code samajh nahi aaya — use karein?",
    tag: "Career",
    situation: "Mangalvar hai. Task hai users ka CSV import (5,000 rows tak) validation ke saath, deadline kal shaam, aur PR review kal subah 11 baje. Tumne AI se code maanga, usne ~80 lines diye aur 20 rows ki test file par chal bhi gaya. Code mein Parallel.ForEach ke andar ek hi DbContext par SaveChanges hai, ek Regex hai jo samajh nahi aaya, aur ek try/catch hai jo errors chup-chaap nigal leta hai. Pichhle kuch mahine se tum aisa hi copy-paste karte aaye ho, aur review mein kabhi 'ye kyun kiya' ka jawab nahi dena pada. Senior ne bola hai is baar woh random lines poochhenge.",
    question: "Tum kya karoge?",
    options: [
      { t: "Test pass ho gaya, PR bhej do aur review mein dekhenge", pro: "Sabse tez, deadline ka pressure kam.", con: "Tum us code ko explain nahi kar paoge, aur real bugs (shared DbContext, nigle hue errors) production mein jayenge." },
      { t: "AI ka code hata do aur sab kuch khud likho, AI ko haath mat lagao", pro: "Poori understanding banti hai, aur koi unknown line nahi rehti.", con: "Time zyada lagega aur ek achhe tool ka fayda chhod rahe ho." },
      { t: "AI se 'explain karo' bolo aur uski explanation review mein suna do", pro: "Explanation jaldi mil jati hai.", con: "Padhna aur samajhna alag hai, explanation galat ya surface-level ho sakti hai, aur tumne khud kuch verify nahi kiya." },
      { t: "Pehle khud approach likho, phir AI code se compare karo, har line samjho aur test karo", pro: "Tumhari soch banti hai, AI ki galti pakad paoge, aur review mein har line explain kar paoge.", con: "Shuru mein dheema lagta hai, aur khud approach likhne mein 20-30 minute lagte hain." }
    ],
    best: 3,
    why: "AI use karna galat nahi hai, lekin jo code tum samjha nahi sakte woh tumhara nahi, ek ajnabi ka hai jis par tumhara naam hai. Yahan teen real problems hain jo sirf padhne se pakadi jaati hain: DbContext thread-safe nahi hota (Parallel.ForEach mein ye bug hai), chup try/catch silently data kho sakta hai, aur 20 rows ka test 5,000 rows ke bad data ko nahi pakadta. Pehle khud 20-30 minute approach likhne se tumhare paas ek mental model hota hai, jisse AI ke code ko judge kar sako. Chhote boilerplate (jaise DTO mapping) mein itna ritual zaroori nahi, lekin test aur review phir bhi skip nahi karna. Raat 2 baje production incident mein AI chat tumhare saath nahi hogi, tumhari samajh hogi.",
    askFirst: [
      "Kya main har line ka matlab apne words mein bata sakta hoon, aur ye kyun likhi gayi?",
      "Maine khud pehle approach socha tha? Mere hisaab se problem kaise solve hoti?",
      "Is code ke failure ke cases kya hain (bad rows, concurrency, 5,000 rows, duplicate emails)?",
      "Kya mere paas real test hai jo AI ke code ko todne ki koshish kare, ya sirf happy path chalaya?",
      "Review mein koi pooche 'ye kyun' to mera jawab kya hoga?"
    ],
    trap: "Code chalta hua dikha, to lagta hai kaam hua. Asli kaam 'chalta hai' nahi, 'mujhe pata hai kyun chalta hai aur kab tootega' hota hai, aur bina samjhe copy karte rehne se tumhara judgement kabhi nahi banega."
  },
  {
    id: "microservices-vs-modular-monolith-for-a-4-person-team",
    title: "4 logon ki team — microservices ya modular monolith?",
    tag: "Architecture",
    situation: "Tum ek B2B invoicing SaaS startup mein ho. Team 4 developers ki hai aur koi dedicated DevOps nahi. ~300 customers hain aur peak par ~40 req/sec. Roadmap mein 4 areas hain: billing, inventory, notifications, reporting. CTO conference se aaya hai aur bol raha hai 'Netflix jaisa microservices karenge'. Abhi ek ASP.NET Core app aur ek Postgres hai, jo hafte mein ek baar ek VM par deploy hota hai. Agle 6 mahine mein 3 bade features aane hain aur product-market fit abhi dhundh rahe ho, to requirements badalti rehti hain.",
    question: "Architecture kaisa rakhoge?",
    options: [
      { t: "Modular monolith: ek deployable, lekin clear modules, apne schemas, aur ek module doosre ki tables ko seedha query na kare", pro: "Ek deploy, ek debug, simple operations, aur baad mein zaroorat par module ko service banana aasaan hota hai.", con: "Boundaries ka discipline khud rakhna padta hai, koi tool tumhe force nahi karega." },
      { t: "Chaaron areas ke 4 microservices, har ek ka apna DB", pro: "Independent deploy aur scaling, aur team boundaries saaf.", con: "4 logon ko distributed system ka poora bojh: network failures, distributed transactions, service discovery, tracing, CI/CD x4, aur requirements badalne par har baar cross-service change." },
      { t: "Jaisa hai waisa hi chalne do, structure ki zaroorat nahi", pro: "Aaj ka kaam fastest, koi refactor nahi.", con: "Features badhne par sab kuch ek doosre se juda ho jata hai, aur baad mein split karna ya modify karna dard ban jata hai." },
      { t: "Do hisse karo: core monolith aur notifications/reporting alag service", pro: "Heavy reporting core ko slow nahi karegi, aur shuruaat chhoti hai.", con: "Abhi koi proven scaling problem nahi hai, to deployment aur network complexity bina wajah add ho rahi hai." }
    ],
    best: 0,
    why: "Microservices ek organisational aur scaling problem ka solution hain, aur tumhari team ke paas dono nahi hain: 4 log, 40 req/sec, aur requirements abhi badal rahi hain. Aise mein service boundaries galat ban sakti hain, aur galat boundary monolith mein refactor karna aasaan hai, services ke beech mein mehnga. Modular monolith se tum structure aur discipline paate ho bina operational bojh ke. Agar teams 20+ hoti, alag modules ko alag scale karna hota (jaise reporting 100x load), ya alag compliance boundaries hoti, to services ka case banta.",
    askFirst: [
      "Hamara asli problem kya hai - scaling, team independence, deploy speed, ya sirf architecture ka shauk?",
      "Team kitni badi hai, aur kya hamare paas distributed system (tracing, CI/CD, on-call) chalane ka experience aur time hai?",
      "Kya koi module ko alag scale ya alag deploy karne ki zaroorat abhi proof ke saath hai?",
      "Requirements kitni stable hain? Boundaries galat nikle to badalna kitna mehnga padega?",
      "Operations kaun sambhalega agar 4 services raat ko gir jayein?"
    ],
    trap: "Big company ki architecture copy karna 'professional' lagta hai, aur CTO ya conference ka dabaav bhi hota hai. Lekin unki problems aur team size tumhari nahi hain."
  },
  {
    id: "add-an-index-or-rewrite-the-query",
    title: "Slow query — index add karein ya query rewrite?",
    tag: "Database",
    situation: "SQL Server mein 'is mahine ke shipped orders' ki report 8 second leti hai. Orders table mein 20 million rows hain. Query mein WHERE YEAR(OrderDate) = 2026 AND MONTH(OrderDate) = 10 AND Status = 'Shipped' hai. OrderDate par non-clustered index pehle se hai, phir bhi execution plan mein Index Scan dikh raha hai. Table par roz ~50k inserts hote hain, aur DBA bol raha hai naya index add karne se writes slow honge aur storage badhegi. Fix aaj hi chahiye.",
    question: "Pehle kya karoge?",
    options: [
      { t: "(Status, OrderDate) par naya composite index banao", pro: "Status par seek mil jayega, aur ye ek familiar solution hai.", con: "YEAR()/MONTH() column par function lagne se OrderDate par seek phir bhi nahi hoga, aur DBA ki write cost wali chinta bhi valid hai." },
      { t: "Naya index banao jisme saare select ke columns INCLUDE hon", pro: "Covering index lookups bachata hai.", con: "Bahut bada index, write aur storage ka bojh, aur asli problem (non-sargable predicate) waisa hi." },
      { t: "WHERE ko range mein badlo (OrderDate >= '2026-10-01' AND OrderDate < '2026-11-01') aur plan dobara dekho", pro: "Existing index par seek ho sakta hai, koi naya index nahi, koi write cost nahi.", con: "Agar plan phir bhi slow nikla to aage ka kaam (covering index ya statistics) dekhna padega." },
      { t: "Query mein WITH (NOLOCK) lagao aur RECOMPILE hint daalo", pro: "Do second mein change ho jata hai.", con: "NOLOCK dirty reads deta hai aur bottleneck lock nahi tha, to speed lagbhag same rahegi." }
    ],
    best: 2,
    why: "Column par function lagaoge (YEAR(OrderDate)) to SQL Server us column ke index par seek nahi kar sakta aur poora index scan karta hai. Yahi tumhara 'Index Scan' ka reason hai, isliye naya index banane se pehle predicate ko sargable banao. Range rewrite free hai aur turant testable hai, uske baad plan aur actual time dekho. Agar plan ab seek dikhaye lekin phir bhi key lookups ya sort mein time jaye, tab ek chhota covering index sochna sahi hoga, aur DBA ke write cost wale point ko ek reading ke saath tolna.",
    askFirst: [
      "Execution plan mein asli bottleneck kya hai - scan, key lookup, sort, ya spill?",
      "Kya WHERE condition index ke columns par seek kar sakti hai, ya column par function laga hai?",
      "Table par kitne reads aur kitne writes hote hain, aur naye index ki write cost kya hogi?",
      "Statistics up to date hain? Estimated aur actual rows mein kitna fark hai?",
      "Fix ke baad kaise measure karunga ki sach mein behtar hua?"
    ],
    trap: "Slow query = 'index lagao' ek reflex ban gaya hai. Lekin galat tarah ki query par index bhi kaam nahi karta, aur har index writes ko slow karta hai."
  },
  {
    id: "build-vs-buy-library",
    title: "PDF invoice generation — khud banayein ya library lein?",
    tag: "Process",
    situation: "Tumhare ASP.NET Core invoicing app ko har order ke baad PDF invoice banana hai: logo, line items ki table, GST breakup, aur items zyada hon to multi-page. ~300 invoices/din banenge, aur layout kabhi-kabhi badalta rahega. Team 3 log ki hai, kisi ne PDF ka kaam pehle nahi kiya. Product closed-source commercial hai aur budget limited hai. App ek 512 MB RAM wale chhote container par chalta hai. Deadline 1 hafta hai.",
    question: "PDF kaise banaoge?",
    options: [
      { t: "PDF spec padh ke khud ka generator likho", pro: "Poora control, koi dependency nahi.", con: "Fonts, page breaks, tables, Unicode, aur edge cases mein hafte kha jayenge, aur ye tumhara core business bhi nahi hai." },
      { t: "Ek maintained .NET PDF library chuno (license, activity, docs dekh kar) aur 1 din ka spike karke confirm karo", pro: "Tables aur multi-page jaise hard parts pehle se solved hain, aur 1 hafte mein fit ho jata hai.", con: "Dependency aur uska license/version risk aata hai, aur kuch libraries ke commercial ya AGPL license closed-source ke liye problem ho sakte hain." },
      { t: "Third-party PDF SaaS API par invoice data bhejo", pro: "Setup sabse tez, infra ka bojh nahi.", con: "Customer ka financial data bahar jata hai, per-call kharcha, aur uptime ke liye tum us par depend karte ho." },
      { t: "HTML template banao aur headless Chrome se PDF render karo", pro: "HTML/CSS jaante ho to layout aasaan hai.", con: "Chromium chalana 512 MB container par bhaari hai, memory aur cold start ka dard, aur deployment complex." }
    ],
    best: 1,
    why: "PDF generation ek solved, boring problem hai jisme tumhara koi competitive edge nahi, to library lena sahi hai. Lekin 'library le lo' tab tak adhura hai jab tak license (closed-source product ke liye), maintenance activity, aur tumhare jaise tables/multi-page layout ka ek chhota spike nahi hota. 512 MB container aur chhoti team ke context mein headless Chrome aur SaaS dono mehnge padte hain. Agar invoice ka layout bahut complex HTML jaisa hota aur infra bada hota, ya data bahar bhejna allowed hota, to baaki options bhi chalte. Yahi sawal date picker jaise UI components ke liye bhi poochho: khud banana tabhi worth hai jab wo tumhara core ho ya library fit na ho.",
    askFirst: [
      "Ye feature mere business ka core hai ya support function? Kya ise khud banane se mujhe koi edge milega?",
      "Library ka license kya hai, aur kya wo closed-source commercial product ke saath compatible hai?",
      "Library maintained hai (last release, open issues, community) aur docs kaisi hain?",
      "Meri asli requirements (tables, multi-page, fonts, GST layout) kya library sambhal leti hai? Ek chhota spike karke dekha?",
      "Deployment constraints kya hain (memory, OS, network), aur data bahar bhejna allowed hai?"
    ],
    trap: "Do ulte instincts: 'khud bana lete hain, kya mushkil hai' (hidden complexity), ya 'pehli Google result wali library utha lo' (license aur maintenance dekhe bina). Dono mein jaanch skip ho rahi hai."
  },
  {
    id: "vague-requirement-from-manager",
    title: "Manager ka vague requirement — coding se pehle kya karein?",
    tag: "Process",
    situation: "Monday standup ke baad manager ne Slack par likha: 'Customers ko reports bahut chahiye, dashboard mein reports add kar do, is sprint mein. Priority high.' Sprint 2 hafte ka hai aur frontend plus backend dono tum akele dekhte ho. Koi spec, mockup ya example nahi hai. Pichhli baar aise ek 'chhote' feature ke baad ek hafte baad bola gaya tha 'ye woh nahi tha jo chahiye tha', aur rework hua. Manager ke din mein 4 meetings hote hain, unse time milna mushkil hai.",
    question: "Tum kya karoge?",
    options: [
      { t: "15 minute maango, 4-5 targeted sawal poochho, 5 line ka written summary bhejke confirm karwao, phir sabse chhota slice banao", pro: "Galat cheez banane ka risk sabse kam, aur written confirmation baad ke 'ye to nahi bola tha' se bachata hai.", con: "Manager ka time lagta hai aur coding shuru karne mein thodi der hoti hai." },
      { t: "Common sense se 5 popular reports bana do aur demo mein dikha do", pro: "Jaldi kuch dikhane ko mil jata hai.", con: "Tum apni guess par 2 hafte laga doge, aur jaise pichhli baar hua, galat cheez bana ke rework hone ka chance bahut hai." },
      { t: "AI se spec likhwa ke manager ko approve ke liye bhej do", pro: "Draft jaldi ban jata hai aur manager ka kaam kam hota hai.", con: "AI tumhare customers aur business ko nahi jaanta, generic spec banata hai, aur manager bina soche 'ok' bol sakta hai." },
      { t: "Bolo 'requirement clear nahi hai, clear hone par batana'", pro: "Tumhari responsibility ka line saaf rehti hai.", con: "Sprint ka time nikalta jata hai, manager ko tum blocker lagoge, aur sawal poochne ki jagah tum bas wait kar rahe ho." }
    ],
    best: 0,
    why: "Vague requirement ka matlab aksar ye hota hai ki manager ke dimaag mein ek specific problem hai jo abhi words mein nahi aayi. Targeted sawal poochna (kaun user, kaun sa decision lena hai, kaun sa data, kitni baar, export chahiye?) usko surface karta hai. 5 line ka written summary sabse kaam ki cheez hai: wo tumhe aur manager dono ko ek page par laata hai, aur baad ke rework ko roka jata hai. Phir sabse chhota usable slice banao aur jaldi dikhao. Agar manager unreachable ho, to sawal Slack par bhejo aur apni assumptions likh ke batao ki 'main ye maan ke chal raha hoon, galat ho to bata dena'.",
    askFirst: [
      "Ye reports kaun use karega, aur unhe kaun sa decision lena hai ya kaun si problem solve karni hai?",
      "Kaun sa data, kitne time ka, aur kitni baar (live, daily, on-demand)?",
      "Output kaisa hona chahiye - table, chart, export (Excel/PDF), email?",
      "Success kaise dikhega, aur sprint mein 'done' ka matlab kya hai? Kya koi example ya competitor ka report hai?",
      "Agar manager nahi mile, to mere assumptions kya hain jo main likh ke confirm karwa sakta hoon?"
    ],
    trap: "Vague requirement par seedha coding shuru karna 'proactive' lagta hai. Lekin galat cheez jaldi banana galat cheez dhire banane se bhi buri hai."
  },
  {
    id: "estimate-under-deadline-pressure",
    title: "'Thursday tak ho jayega na?' — estimate kaise do?",
    tag: "Career",
    situation: "Monday 11 baje manager ne poochha: 'Bulk invoice approval feature Thursday tak ho jayega na? Client ko demo promise kar diya hai.' Feature mein multi-select, approve, email, audit log, aur ek third-party accounting API ke saath sync hai. Us API ka sandbox key tumhe abhi tak mila nahi hai. Ek milte-julte feature mein tumhe pehle 4 din lage the. Is hafte Wednesday ko tumhari production-support duty bhi hai (aadha din). Manager ka chehra dekh ke lagta hai woh 'haan' sunna chahta hai.",
    question: "Tum kya jawab doge?",
    options: [
      { t: "'Haan, ho jayega'", pro: "Manager turant khush, koi tension nahi.", con: "Unknowns (API sandbox, support duty) ignore karke commitment di, miss hone par credibility zyada girti hai." },
      { t: "'Nahi ho sakta, ye realistic nahi hai'", pro: "Seedha aur honest lagta hai.", con: "Bina breakdown ke 'nahi' sirf ek rakhi hui raay hai, manager ke paas koi option nahi bachta, aur tum rukawat jaise lagte ho." },
      { t: "Apne andaaze ko chupke se double karke 'agle Monday tak' bol do", pro: "Khud ko miss hone se bacha lete ho.", con: "Manager ko scope ya priorities badalne ka mauka nahi milta, aur andaza kaise bana ye pata nahi chalta, to trust aur negotiation dono kamzor." },
      { t: "30-45 minute mein tod ke dekho, phir core ko pakka date ke saath aur risky hisse ko unknown ke saath batao, aur options do", pro: "Manager ko real information aur choices milte hain (scope kaato, API baad mein, ya date khiskao), aur tumhari credibility banti hai.", con: "Turant 'haan/na' nahi milta, aur thoda sa kaam pehle karna padta hai." }
    ],
    best: 3,
    why: "Estimate ek jawab nahi, ek range plus assumptions hota hai, aur manager ko 'haan' ya 'na' se zyada options chahiye hote hain. Thodi der mein task tod ke tum dekh sakte ho ki UI, approve aur audit log core hain (jo tumhe pata hai), aur API sync sabse bada unknown hai kyunki key bhi nahi mila. Isliye bolo: 'core Thursday tak pakka, API sync unknown hai jab tak sandbox key na mile; kal dopahar tak confirm karunga.' Phir options do: demo mein sync mock karo, scope kam karo, ya date badhao. Agar feature tumne pehle bilkul isi jaisa kiya hota aur koi unknown na hota, to seedha 'haan' bhi theek hota.",
    askFirst: [
      "Kya sach mein 'Thursday' fixed hai, ya demo ki date flexible hai? Demo mein exactly kya dikhana hai?",
      "Task ko chhote hisson mein tod do - kaun sa hissa mujhe confidently pata hai, kaun sa unknown?",
      "Dependencies kya hain (API key, sandbox, design, doosre log), aur woh kab milenge?",
      "Meri availability kitni hai (support duty, meetings, leave), aur pichhla similar kaam kitne din ka tha?",
      "Agar late hota hoon to kya cut ho sakta hai (scope), aur kaun decide karega?"
    ],
    trap: "Manager ke chehre par dabaav mein 'haan' bol dena sabse aasaan raasta hai. Lekin aaj ka chhota awkward pal, Thursday ke miss hue demo se bahut sasta hai."
  }
];
