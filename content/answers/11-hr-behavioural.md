# HR aur behavioural

## Tell me about yourself — 60–90 second intro
Ye sawaal almost har round ki shuruaat hai, aur interviewer yahin se agle sawaal chunta hai — to intro mein wahi cheezein daalo jin pe tum aaram se baat kar sakte ho. **Life story nahi, professional pitch** — 60–90 second.

**Structure (Present → Past → Future):**
1. **Present** — abhi kya karte ho: role, kitne saal, main stack. "Main X saal se .NET full-stack developer hoon — ASP.NET Core Web APIs, Angular, PostgreSQL."
2. **Highlight** — 1–2 cheezein jo tumne banayi, **impact ke saath** (numbers): "ek real-time tracking system jo har second hazaaron GPS messages process karta hai", "Redis caching se API response time X se Y".
3. **Past (short)** — degree/shuruaat ek line mein.
4. **Future** — kyun yahan: "ab main aise role mein jaana chahta hoon jahan bade scale ke systems pe kaam ho / architecture mein zyada ownership mile" — company ke role se jodo.

Galtiyan: resume line-by-line padhna, personal details (family, hobbies) pehle, bahut lamba bolna, "main hardworking hoon" jaise khokhle adjectives bina example ke.

> Apna intro note mein likh ke 10 baar bol ke practice karo — timer lagake. Real numbers daalo (message rate, users, latency improvement).

## Why are you leaving your current company?
Interviewer check karta hai: kya tum negative ho, kya tum yahan bhi jaldi chhod doge, aur kya reason genuine hai. **Kabhi current company, manager ya team ki burai mat karo** — chahe sach ho.

**Growth ki taraf bolo, bhaagne ki taraf nahi:**
- "Current role mein maine bahut seekha — real-time systems, Kafka, Redis. Ab main aise environment mein jaana chahta hoon jahan bade scale / product pe kaam ho aur design decisions mein zyada role mile."
- "Main apne stack ko deepen karna chahta hoon — cloud / microservices / architecture — aur aapke yahan ye kaam hai."
- Salary ek reason ho sakta hai, par **akela** reason mat batao; "growth aur fair compensation dono" theek hai.

Jo nahi bolna: "manager achha nahi", "kaam bahut hai", "office politics", "bore ho gaya". Agar poochhe "koi problem thi kya?" — "Nahi, achha experience raha, bas agla step chahiye."

## Sabse bada technical challenge jo tumne solve kiya — STAR mein
Har behavioural sawaal ("challenge", "mistake", "conflict", "deadline") ka jawab **STAR** format mein do — structured lagta hai aur bhatakte nahi:

| Letter | Matlab | Kitna |
| --- | --- | --- |
| **S**ituation | Context — project, system, kya chal raha tha | 1–2 line |
| **T**ask | Tumhari zimmedari / kya solve karna tha | 1 line |
| **A**ction | **Tumne** kya kiya — step by step, technical detail | sabse lamba hissa |
| **R**esult | Outcome — numbers ke saath, aur kya seekha | 1–2 line |

Action mein **"main"** bolo, "hum" nahi — interviewer tumhara contribution jaanna chahta hai. Result mein number: "response time 4s se 300ms", "memory crashes band", "downtime zero".

Achhe challenge stories ke types: production issue jo tumne debug kiya (root cause tak), performance improvement, ek system jo scale nahi ho raha tha, ek unclear requirement jo tumne clarify karke deliver ki.

> 2–3 STAR stories apne notes mein pehle se tayyar rakho — wahi stories challenge, mistake, pressure, sab sawaalon mein thodi ghuma ke kaam aati hain.

## Koi galti jo tumse hui — aur tumne kya seekha
Interviewer honesty aur **ownership** dekhta hai. "Kabhi galti nahi hui" = red flag. Aisi galti chuno jo **real ho par career-ending na ho**, aur jisse tumne kuch **process-level** seekha.

**Structure:** kya hua (short, bina bahaane) → **tumne turant kya kiya** (fix, communicate) → **kya seekha aur ab kya alag karte ho** (ye sabse important hissa).

Example type: "Ek baar maine bina proper testing ke ek DB change production pe daala, ek report galat aane lagi. Maine turant rollback kiya, team ko bataya, data theek kiya. Uske baad se main har migration pehle staging pe test karta hoon aur rollback script saath rakhta hoon."

Galtiyan: kisi aur ko blame karna, fake galti ("main zyada kaam karta hoon"), ya itni badi galti jo trust tod de.

## Team member ya senior se conflict — kaise handle kiya
Dekha jaata hai ki tum **professionally** disagree kar sakte ho ya nahi. Jawab mein ye dikhna chahiye:

- Disagreement **technical/kaam** pe tha, personal nahi.
- Tumne **pehle unki baat samjhi** (unka reason kya tha).
- **Data / facts** se baat ki — benchmark, POC, docs — opinion se nahi.
- **Private mein** baat ki, meeting mein ladai nahi.
- Final decision agar tumhare against gaya to bhi **commit kiya** ("disagree and commit").
- Result: relation achha raha, ya better solution nikla.

Example type: "Ek senior caching ke bina direct DB query chahte the; maine load test karke numbers dikhaye, phir hum dono ne milke ek hybrid approach li."

## Strengths aur weaknesses
**Strengths**: 2–3 jo **role se related** hon, aur har ek ke saath **ek chhota example**. "Main production issues debug karne mein achha hoon — jaise ek baar memory crash ka root cause container limits tak trace kiya." Bina example ke strength = khokhla.

**Weakness**: **real** weakness batao jo **job ke core ko na maare**, aur saath mein bolo ki **tum us pe kya kar rahe ho**.
- Achhe options: "pehle main har kaam khud karne ki koshish karta tha, madad maangne mein der karta tha — ab main 30–60 min phasne ke baad poochh leta hoon"; "public speaking / presentations — ab team demos khud leta hoon practice ke liye"; "ek technology (jaise cloud/Kubernetes) mein experience kam hai — course kar raha hoon, side project pe deploy kiya".
- Bachna: "main perfectionist hoon / zyada kaam karta hoon" (cliché, interviewer aankh ghumata hai), ya aisi weakness jo role ki basic zaroorat ho ("mujhe SQL nahi aata" .NET backend role ke liye).

## Where do you see yourself in 3–5 years?
Interviewer dekhna chahta hai ki tumhare goals is role se match karte hain aur tum 6 mahine mein bhaag toh nahi jaoge. **Title pe nahi, skills aur responsibility pe bolo.**

Achha jawab: "Agle 3 saal mein main ek strong senior/lead engineer banna chahta hoon — system design aur architecture decisions mein ownership, juniors ko mentor karna, aur cloud/distributed systems mein depth. Main chahta hoon ye growth isi company mein ho."

Bachna: "aapki kursi pe", "apna startup kholna hai", "pata nahi", "MBA karke management mein jaana" (agar technical role hai).

## Expected CTC kaise bataayein aur negotiate karein
**Research pehle:** role, experience aur city ke hisaab se market range pata karo (AmbitionBox, Glassdoor, jaan-pehchaan wale, recruiters). Apna **minimum** (walk-away number) aur **target** dono pehle se decide rakho.

**Kaise bolna hai:**
- Pehle unse range poochhne ki koshish karo: "Is role ka budget kya hai?" — agar wo bata dein to tum anchor nahi hote.
- Number dena pade to **thoda upar anchor** karo taaki negotiation mein target pe aa sako, aur **reason** do: "mere experience, skills (real-time systems, Kafka, Redis) aur market ke hisaab se main X expect karta hoon."
- **Current CTC jhooth mat bolo** — offer ke waqt salary slips / bank statements maange jaate hain; pakde gaye to offer cancel.
- Poora package dekho: fixed vs variable, bonus, joining bonus, notice buyout, WFH/remote, health insurance, leave policy, appraisal cycle.
- **Doosra offer** hai to politely bolo — leverage hai, par dhamki ki tarah nahi.
- Offer **likhit** mein aane se pehle resign mat karo.

Typical hike: job switch pe aam taur pe 30–50% realistic maana jaata hai, skills/demand ho to zyada — par ye market pe depend karta hai.

! Negotiation mein pehle number bolne wala aksar nuksaan mein rehta hai — pehle range poochho, aur apna current CTC kabhi badha ke mat batao.

## 90 din ka notice period — kaise handle karein
Lambi notice period (60–90 din) bahut companies ke liye issue hai — aksar wo 30 din mein joiner chahti hain. Isko **pehle se strategy** ke saath handle karo:

**Interview mein kaise bolein:**
- Sach bolo: "Mera official notice period 90 din hai."
- Saath hi flexibility dikhao: "Main early release ke liye baat karunga — leave encash / adjust karke, ya buyout option bhi hai. Offer mil jaaye to main 45–60 din mein join karne ki koshish karunga."
- Bina confirm kiye "15 din mein aa jaunga" mat bolo — company baad mein offer revoke kar sakti hai.

**Options jo exist karte hain:**
- **Notice buyout** — bache hue dinon ki salary current company ko deke jaldi relieve. Kai naye employers ye amount **reimburse** kar dete hain (offer mein poochho — "buyout support").
- **Leaves adjust karna** — pending earned leaves notice mein adjust (company policy pe depend).
- **Early release negotiation** — handover plan deke manager se baat; kaam poora ho to aksar jaldi chhod dete hain.
- **Pehle resign karke interview** — risky hai (bina offer ke), par kuch log isliye karte hain ki "serving notice, available in X days" bol sakein. Financial backup ho to hi.

**Offer ke baad:** offer letter mein joining date likhwao, aur agar counter-offer aaye (current company zyada paisa de) to yaad rakho — jis wajah se nikal rahe the wo aksar paise se theek nahi hoti.

> Resume/profile pe "Notice: 90 days (negotiable / buyout possible)" likhna recruiter filters mein madad karta hai.

## Interviewer ko kya sawaal poochne chahiye
End mein "Do you have any questions?" pe **"No"** bolna interest ki kami lagta hai. 2–3 achhe sawaal ready rakho:

**Role aur kaam:**
- "Pehle 3–6 mahine mein is role se kya expect hai?"
- "Team abhi kis project/problem pe kaam kar rahi hai?"
- "Tech stack kya hai, aur koi migration/modernization chal raha hai?"

**Team aur process:**
- "Team kitni badi hai, aur kaise structured hai?"
- "Code review, testing aur deployment ka process kya hai? CI/CD hai?"
- "On-call / production support kaise hota hai?"

**Growth:**
- "Is role mein growth path kya hai? Performance review kaise hota hai?"
- "Learning / certifications ke liye support hai?"

Bachna: pehle hi round mein salary/leaves/WFH ke sawaal (HR round ke liye rakho), aur aisi cheez jo company website pe clearly likhi hai.

## Kya tumhare paas koi aur offer hai? / Offer mile to join karoge?
**Doosre offers**: sach bolo, par detail mat do — "Haan, ek-do jagah final stages mein hoon" ya "ek offer hai". Ye tumhe leverage deta hai aur company ko jaldi decision lene pe majboor karta hai. Jhooth ka offer mat banao — kabhi-kabhi proof maangte hain.

**"Offer mile to join karoge?"**: agar role pasand hai to confident "haan" — "Role aur team mujhe achhi lagi, sab theek raha to main zaroor join karna chahunga." Isse **offer ke baad backout mat karo** — industry chhoti hai, aur recruiters yaad rakhte hain.

## Pressure / tight deadline mein kaise kaam karte ho
STAR story ke saath jawab do. Dikhana hai:

- **Prioritize** kiya — must-have vs nice-to-have; scope pe stakeholders se baat.
- **Early communicate** kiya — risk dikha to manager ko pehle bataya, last din nahi.
- Kaam **chhote hisson** mein toda, daily progress dikhaya.
- Quality kahan compromise nahi ki (testing, security) aur kahan scope kam kiya.
- Result: deadline meet hui ya realistic plan pe agree hua.

Example type: "Ek production release se pehle client ne naya feature maanga — maine usko do phases mein toda: core flow deadline pe, reports agle sprint mein. Client agree hua, release time pe gaya."

## Naya technology jaldi kaise seekhte ho
Achha jawab ek **real example** ke saath: "Project mein Kafka use karna tha jo mujhe nahi aata tha — maine official docs aur ek chhota POC banaya, phir producer/consumer apne project mein integrate kiya, aur jo gotchas mile (offset commit, rebalancing) wo team ke liye document kiye."

Process bolo: **docs → chhota hands-on POC → real problem pe apply → seniors se review / doubts**. Ye dikhata hai ki tum khud se seekh sakte ho — har company ye chahti hai.
