/* Step-through diagrams for answers. A card opts in with an `@viz name` line
   in its markdown; the builder checks the name exists here.

   Each diagram is an SVG (viewBox 360 wide) plus a caption per frame. SVG
   elements react to the current frame (1-based) through data attributes:
     data-f="2-4,6"             visible only in these frames
     data-hl="3"                gets the highlight class in these frames
     data-tf="1:0,0;3:0,35"     translate (x,y) from that frame on (animated)
     data-tx="1:a = 10;3:a = 20" text from that frame on
     data-cl="1:ok;4:bad"       extra class from that frame on
   Colours come from CSS classes, so light and dark themes both work. */

// ---- tiny SVG helpers ----
const S = {
  box: (x, y, w, h, cls = "b", attrs = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${cls}" ${attrs}/>`,
  txt: (x, y, t, cls = "t", attrs = "") => `<text x="${x}" y="${y}" class="${cls}" ${attrs}>${t}</text>`,
  mid: (x, y, t, cls = "t", attrs = "") => `<text x="${x}" y="${y}" class="${cls}" text-anchor="middle" ${attrs}>${t}</text>`,
  dot: (x, y, r, cls, attrs = "") => `<circle cx="${x}" cy="${y}" r="${r}" class="${cls}" ${attrs}/>`,
  arrow(x1, y1, x2, y2, cls = "ln", attrs = "") {
    const a = Math.atan2(y2 - y1, x2 - x1), s = 6;
    const p = (d, o) => `${(x2 - s * Math.cos(a + o)).toFixed(1)},${(y2 - s * Math.sin(a + o)).toFixed(1)}`;
    return `<g class="${cls}" ${attrs}><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>` +
      `<polygon points="${x2},${y2} ${p(0, 0.45)} ${p(0, -0.45)}" class="ah"/></g>`;
  },
};

const VIZ = {
  "value-ref": {
    title: "Value vs reference — memory mein kya hota hai",
    h: 215,
    svg:
      S.mid(80, 18, "Stack (variables)", "tt") + S.mid(275, 18, "Heap (objects)", "tt") +
      S.box(10, 26, 140, 180, "panel") + S.box(200, 26, 150, 180, "panel") +
      `<g data-f="1-6">${S.box(25, 40, 110, 30, "b", 'data-hl="1,3"')}${S.mid(80, 60, "a = 10")}</g>` +
      `<g data-f="2-6">${S.box(25, 80, 110, 30, "b", 'data-hl="2,3"')}${S.mid(80, 100, "b = 10", "t", 'data-tx="2:b = 10  (copy);3:b = 20"')}</g>` +
      `<g data-f="4-6">${S.box(25, 125, 110, 30, "b", 'data-hl="4"')}${S.mid(80, 145, "p1 = pata →")}` +
        S.arrow(135, 140, 213, 140) + `</g>` +
      `<g data-f="5-6">${S.box(25, 165, 110, 30, "b", 'data-hl="5"')}${S.mid(80, 185, "p2 = pata →")}` +
        S.arrow(135, 180, 213, 160) + `</g>` +
      `<g data-f="4-6">${S.box(215, 118, 120, 52, "b", 'data-hl="6"')}${S.mid(275, 138, "Person object", "ts")}` +
        S.mid(275, 158, "Name = Asha", "t", 'data-tx="4:Name = Asha;6:Name = Ravi"') + `</g>`,
    frames: [
      "<b>int a = 10</b> → stack mein ek dabba bana, usme value 10.",
      "<b>int b = a</b> → value ki <b>copy</b> bani. Ab do alag-alag dabbe.",
      "<b>b = 20</b> → sirf b badla, a abhi bhi 10. Value type = <b>photocopy</b>.",
      "<b>var p1 = new Person()</b> → object heap mein bana; p1 mein sirf uska <b>pata (address)</b> hai.",
      "<b>var p2 = p1</b> → sirf pata copy hua, object nahi. Dono <b>ek hi object</b> ko dekh rahe hain.",
      "<b>p2.Name = \"Ravi\"</b> → object badla, to p1.Name bhi Ravi. Reference type = <b>Google Doc ka link</b>.",
    ],
  },

  "di-lifetimes": {
    title: "Transient vs Scoped vs Singleton — kitne objects bane",
    h: 190,
    svg: (() => {
      const ids = { 1: ["#1", "#2", "#3", "#4"], 2: ["#1", "#1", "#2", "#2"], 3: ["#1", "#1", "#1", "#1"] };
      const cls = { 1: ["c1", "c2", "c3", "c4"], 2: ["c1", "c1", "c2", "c2"], 3: ["c1", "c1", "c1", "c1"] };
      const spec = k => [1, 2, 3].map(f => f + ":" + ids[f][k]).join(";");
      const cspec = k => [1, 2, 3].map(f => f + ":" + cls[f][k]).join(";");
      let s = S.mid(180, 18, "Transient", "tt big", 'data-tx="1:Transient;2:Scoped;3:Singleton"');
      [["Request 1", 55], ["Request 2", 135]].forEach(([lab, y], r) => {
        s += S.box(10, y - 25, 340, 62, "panel") + S.txt(20, y + 10, lab, "tt");
        [[150, "OrderService"], [270, "AuditService"]].forEach(([x, who], c) => {
          const k = r * 2 + c;
          s += S.mid(x, y - 8, who + " ko chahiye:", "ts");
          s += `<g>${S.dot(x, y + 14, 15, "obj", `data-cl="${cspec(k)}"`)}${S.mid(x, y + 18, "#", "wt", `data-tx="${spec(k)}"`)}</g>`;
        });
      });
      return s;
    })(),
    frames: [
      "<b>Transient</b>: jitni baar maango, utna <b>naya</b> object — 2 requests × 2 jagah = <b>4 alag objects</b>.",
      "<b>Scoped</b>: ek request ke andar sabko <b>same</b> object; nayi request = naya object. DbContext yahi hota hai.",
      "<b>Singleton</b>: poori app mein <b>ek hi</b> object — har request, har jagah wahi #1.",
    ],
  },

  "middleware": {
    title: "Request middleware pipeline se kaise guzarti hai",
    h: 240,
    svg: (() => {
      const L = ["Exception handler", "HTTPS redirect", "Routing", "Authentication", "Authorization", "Controller (endpoint)"];
      let s = "";
      L.forEach((t, i) => {
        const y = 12 + i * 37;
        const hl = { 0: "1,8", 1: "2", 2: "3,7", 3: "4", 4: "5,9", 5: "6" }[i];
        s += S.box(80, y, 260, 30, i === 5 ? "b end" : "b", `data-hl="${hl}"`) + S.mid(210, y + 19, t);
      });
      const pos = [0, 0, 37, 74, 111, 148, 185, 74, 0, 148];
      const tf = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(f => `${f}:0,${pos[f]}`).join(";");
      s += `<g data-tf="${tf}">${S.dot(40, 27, 10, "pen", 'data-cl="1-6:pen;7-8:okf;9:badf"')}` +
        S.txt(54, 31, "", "tb", 'data-tx="1:Request ↓;7:Response ↑;9:403 ↑"') + `</g>`;
      return s;
    })(),
    frames: [
      "Request aayi → sabse pehle <b>Exception handler</b>, taaki aage kahin bhi error ho to yahi pakde.",
      "<b>HTTPS redirect</b>: http wali request ko https pe bhejo.",
      "<b>Routing</b>: URL dekh ke tay hua kaunsa controller/action chalega.",
      "<b>Authentication</b>: token padha — ye user <b>kaun</b> hai?",
      "<b>Authorization</b>: kya is user ko is action ki <b>permission</b> hai?",
      "<b>Controller</b> ka action chala, response bana.",
      "Response <b>ulte order</b> mein wapas jaata hai — har middleware ka <code>next()</code> ke baad wala code ab chalta hai.",
      "Client ko response mil gaya. Isi liye pipeline mein <b>order matter karta hai</b>.",
      "Permission nahi? Authorization <b>yahin 403</b> lauta deta hai — request controller tak pahunchti hi nahi (<b>short-circuit</b>).",
    ],
  },

  "async-waiter": {
    title: "async/await — thread wait mein khada rahe ya kaam kare",
    h: 200,
    svg: (() => {
      const lane = (y, segs) => segs.map(([x, w, cls, t]) => S.box(x, y, w, 26, cls) + (t ? S.mid(x + w / 2, y + 17, t, cls === "b" ? "ts" : "wt") : "")).join("");
      let s = "";
      s += `<g data-f="1,3">${S.txt(10, 22, "Bina async — thread block", "tt")}${S.txt(10, 58, "Thread", "ts")}` +
        lane(40, [[60, 40, "c1", "R1"], [100, 140, "wait", "DB wait — thread khaali"], [240, 30, "c1", "R1"], [270, 40, "c2", "R2"], [310, 40, "c3", "R3"]]) +
        S.txt(60, 84, "R2, R3 line mein khade rahe", "ts bad-t") + `</g>`;
      s += `<g data-f="2,3">${S.txt(10, 122, "async/await — thread free", "tt")}${S.txt(10, 158, "Thread", "ts")}` +
        lane(140, [[60, 40, "c1", "R1"], [100, 40, "c2", "R2"], [140, 40, "c3", "R3"], [180, 60, "b", "free"], [240, 30, "c1", "R1"], [270, 25, "c2", "R2"], [295, 25, "c3", "R3"]]) +
        S.txt(60, 186, "DB ke wait mein R2, R3 ka kaam ho gaya", "ts ok-t") + `</g>`;
      return s;
    })(),
    frames: [
      "<b>Bina async</b>: R1 ne DB ko bulaya aur thread wahin <b>khada intezaar</b> karta raha. R2, R3 ko wait karna pada.",
      "<b>await</b>: DB ke jawab ke wait mein thread <b>free</b> ho gaya aur R2, R3 ka kaam kar liya. Jawab aaya to R1 wahin se aage badha.",
      "Thread utne hi hain, par async se wahi threads <b>zyada requests</b> sambhalte hain. Naya thread nahi bana — bas khaali baithna band hua.",
    ],
  },

  "iqueryable": {
    title: "IQueryable vs IEnumerable — filter kahan chala",
    h: 190,
    svg:
      `<ellipse cx="65" cy="45" rx="50" ry="12" class="b"/><rect x="15" y="45" width="100" height="90" class="b"/>` +
      `<ellipse cx="65" cy="135" rx="50" ry="12" class="b"/>` + S.mid(65, 90, "Database", "tt") + S.mid(65, 108, "10 lakh rows", "ts") +
      S.box(250, 40, 100, 100, "b") + S.mid(300, 62, "App memory", "tt") +
      S.mid(300, 95, "10 rows ✓", "t", 'data-tx="1:10 rows ✓;2:10 lakh rows 😰" data-cl="1:ok-t;2:bad-t"') +
      S.mid(300, 115, "", "ts", 'data-tx="1:;2:→ C# mein filter → 10"') +
      S.arrow(248, 60, 118, 60) + S.mid(183, 52, "", "ts", 'data-tx="1:WHERE IsActive LIMIT 10;2:SELECT * (sab kuch)"') +
      `<g data-f="1">${S.arrow(118, 120, 248, 120, "ln ok-l")}${S.mid(183, 138, "sirf 10 rows aayi", "ts ok-t")}</g>` +
      `<g data-f="2">${S.arrow(118, 120, 248, 120, "ln fat bad-l")}${S.mid(183, 140, "10,00,000 rows aayi", "ts bad-t")}</g>`,
    frames: [
      "<b>IQueryable</b>: filter SQL ban ke <b>database pe</b> chala — sirf 10 rows network se aayi. Tez.",
      "<b>IEnumerable</b>: pehle <b>saari rows</b> app mein aayi, phir C# ne filter kiya. Kaam hua, par bahut bhaari.",
    ],
  },

  "joins": {
    title: "JOIN — kaunsi rows result mein aati hain",
    h: 235,
    svg: (() => {
      let s = S.mid(180, 16, "INNER JOIN", "tt big", 'data-tx="1:INNER JOIN;2:LEFT JOIN;3:RIGHT JOIN;4:FULL JOIN"');
      s += S.txt(15, 38, "Customers (left)", "ts") + S.txt(215, 38, "Orders (right)", "ts");
      const cust = [["Asha", "1-4"], ["Ravi", "1-4"], ["Meena", "2,4"]], ord = [["#101 (Asha)", "1-4"], ["#102 (Ravi)", "1-4"], ["#103 (koi nahi)", "3,4"]];
      cust.forEach(([n, hl], i) => { s += S.box(15, 45 + i * 28, 120, 22, "b", `data-hl="${hl}"`) + S.txt(25, 60 + i * 28, n); });
      ord.forEach(([n, hl], i) => { s += S.box(215, 45 + i * 28, 130, 22, "b", `data-hl="${hl}"`) + S.txt(225, 60 + i * 28, n); });
      s += `<line x1="135" y1="56" x2="215" y2="56" class="ln"/><line x1="135" y1="84" x2="215" y2="84" class="ln"/>`;
      s += S.txt(15, 150, "Result:", "tt");
      const rows = [["Asha", "#101", "1-4", ""], ["Ravi", "#102", "1-4", ""], ["Meena", "NULL", "2,4", ""], ["NULL", "#103", "3,4", "1:0,0;3:0,-24;4:0,0"]];
      rows.forEach(([a, b, f, tf], i) => {
        s += `<g data-f="${f}" ${tf ? `data-tf="${tf}"` : ""}>${S.box(15, 158 + i * 24, 330, 20, "b")}` +
          S.txt(25, 172 + i * 24, a, a === "NULL" ? "t soft" : "t") + S.txt(190, 172 + i * 24, b, b === "NULL" ? "t soft" : "t") + `</g>`;
      });
      return s;
    })(),
    frames: [
      "<b>INNER</b>: sirf wo jodiyan jo <b>dono taraf</b> match hon — Asha–101, Ravi–102.",
      "<b>LEFT</b>: left ke <b>saare</b> customers. Meena ka order nahi, to order ki jagah <b>NULL</b>.",
      "<b>RIGHT</b>: right ke saare orders. #103 ka customer nahi, to customer ki jagah NULL.",
      "<b>FULL</b>: dono taraf ke saare — jahan jodi nahi mili wahan NULL.",
    ],
  },

  "index": {
    title: "Index — poori kitaab padho ya seedha page pe jao",
    h: 175,
    svg: (() => {
      let s = S.txt(10, 20, "Kitaab (table) ke 12 pages", "ts");
      for(let p = 1; p <= 12; p++){
        const x = 10 + (p - 1) * 28.5;
        const hl = p <= 4 ? "1" : p <= 8 ? "2" : p <= 11 ? "3" : "";
        const cl = p === 11 ? 'data-cl="3-4:found"' : "";
        s += S.box(x, 30, 24, 34, "b", `data-hl="${hl}" ${cl}`) + S.mid(x + 12, 52, p, "ts");
      }
      s += `<g data-f="1-3">${S.txt(10, 95, "Seq Scan: ek-ek page padh ke 'Kafka' dhoondh rahe hain…", "ts", 'data-tx="1:Seq Scan: page 1, 2, 3, 4…;2:…5, 6, 7, 8…;3:…9, 10, 11 — mil gaya! 11 pages padhe"')}</g>`;
      s += `<g data-f="4">${S.box(10, 100, 150, 60, "b hl")}${S.txt(20, 120, "Index", "tt")}${S.txt(20, 140, "Kafka → page 11", "t")}` +
        S.arrow(160, 120, 303, 68, "ln ok-l") + S.txt(175, 150, "Seedha 1 jump (Index Scan)", "ts ok-t") + `</g>`;
      return s;
    })(),
    frames: [
      "<b>Index nahi hai</b>: database pehle page se padhna shuru karta hai…",
      "…ek-ek karke aage badhta hai (<b>Seq Scan</b>)…",
      "…11 pages padh ke mila. 10 lakh rows ho to 10 lakh baar!",
      "<b>Index hai</b>: alag list batati hai 'Kafka → page 11' — seedha wahan. Non-clustered = ye alag list; clustered = pages khud A-Z order mein.",
    ],
  },

  "n-plus-one": {
    title: "N+1 problem — kitni queries gayi",
    h: 190,
    svg: (() => {
      let s = S.box(10, 30, 90, 130, "b") + S.mid(55, 90, "App", "tt") +
        `<ellipse cx="300" cy="40" rx="45" ry="10" class="b"/><rect x="255" y="40" width="90" height="110" class="b"/><ellipse cx="300" cy="150" rx="45" ry="10" class="b"/>` +
        S.mid(300, 98, "Database", "tt");
      s += S.mid(180, 20, "", "tb", 'data-tx="1:Queries: 101 😰;2:Queries: 1 ✓"');
      s += `<g data-f="1">`;
      for(let i = 0; i < 8; i++) s += S.arrow(102, 45 + i * 14, 253, 45 + i * 14, i ? "ln thin bad-l" : "ln");
      s += S.mid(178, 172, "1 query orders ki + har order ke customer ki 1 query", "ts bad-t") + `</g>`;
      s += `<g data-f="2">${S.arrow(102, 95, 253, 95, "ln fat ok-l")}${S.mid(178, 85, "orders JOIN customers", "ts")}` +
        S.mid(178, 172, "Include() — ek hi query mein sab", "ts ok-t") + `</g>`;
      return s;
    })(),
    frames: [
      "<b>Lazy loading</b>: 100 orders laaye (1 query), phir loop mein har order ka customer alag se (100 queries) = <b>101</b>.",
      "<b>Include()</b> (eager): orders aur customers <b>ek JOIN query</b> mein. Wahi data, 1 query.",
    ],
  },

  "gc": {
    title: "Garbage Collector — generations",
    h: 190,
    svg: (() => {
      let s = "";
      [["Gen 0 (naye)", 10], ["Gen 1", 130], ["Gen 2 (purane)", 250]].forEach(([t, x]) => { s += S.box(x, 30, 100, 110, "panel") + S.mid(x + 50, 22, t, "tt"); });
      // o1..o7: [x, y, frames visible, transforms, dead-from-frame]
      const O = [
        ["o1", 35, 60, "1-3", "1:0,0;2:120,0", "3"], ["o2", 60, 60, "1", "", "1"], ["o3", 85, 60, "1-4", "1:0,0;2:120,0;3:240,20", ""],
        ["o4", 35, 95, "1", "", "1"], ["o5", 60, 95, "1-4", "1:0,0;2:120,0;3:240,20", ""],
        ["o6", 35, 60, "3-4", "", ""], ["o7", 60, 60, "3-4", "", ""],
      ];
      O.forEach(([n, x, y, f, tf, dead]) => {
        const cl = dead ? `data-cl="${dead}:deadc"` : "";
        s += `<g data-f="${f}" ${tf ? `data-tf="${tf}"` : ""}>${S.dot(x, y, 11, "obj c1", cl)}${S.mid(x, y + 4, n, "wt")}</g>`;
      });
      return s;
    })(),
    frames: [
      "Naye objects <b>Gen 0</b> mein bante hain. o2 aur o4 ab kisi ke kaam ke nahi (<b>unreachable</b>, laal).",
      "GC chali: unreachable objects <b>hat gaye</b>; jo bache (o1, o3, o5) <b>Gen 1</b> mein chale gaye.",
      "Naye objects o6, o7 aaye. Agli GC: o1 bekaar ho gaya; o3, o5 phir bache → <b>Gen 2</b>.",
      "Gen 2 wale lambe jeete hain, GC unhe <b>kam baar</b> check karti hai. Gen 0 sabse zyada baar — wahi sasti hai.",
    ],
  },

  "rx-maps": {
    title: "switchMap vs mergeMap vs concatMap vs exhaustMap",
    h: 215,
    svg: (() => {
      let s = S.mid(180, 16, "switchMap", "tt big", 'data-tx="1:switchMap;2:mergeMap;3:concatMap;4:exhaustMap"');
      s += S.txt(8, 44, "Clicks", "ts") + `<line x1="60" y1="40" x2="350" y2="40" class="ln"/>`;
      [["A", 70], ["B", 130], ["C", 190]].forEach(([t, x]) => { s += S.dot(x, 40, 10, "obj c1") + S.mid(x, 44, t, "wt"); });
      s += S.txt(8, 74, "API calls", "ts");
      // per frame: [label, start, end, done?] for A, B, C
      const plan = {
        1: [["A", 70, 130, 0], ["B", 130, 190, 0], ["C", 190, 290, 1]],
        2: [["A", 70, 170, 1], ["B", 130, 230, 1], ["C", 190, 290, 1]],
        3: [["A", 70, 170, 1], ["B", 170, 270, 1], ["C", 270, 350, 1]],
        4: [["A", 70, 170, 1], ["B", 130, 138, 0], ["C", 190, 290, 1]],
      };
      Object.entries(plan).forEach(([f, bars]) => {
        s += `<g data-f="${f}">`;
        bars.forEach(([t, a, b, ok], i) => {
          const y = 62 + i * 26;
          s += S.box(a, y, Math.max(b - a, 8), 18, ok ? "c" + (i + 1) : "cancel") + S.txt(a + 4, y + 13, ok ? t : t + " ✗", ok ? "wt" : "ts bad-t");
          if(ok) s += S.dot(b, 175, 9, "obj c" + (i + 1)) + S.mid(b, 179, t, "wt");
        });
        s += `</g>`;
      });
      s += S.txt(8, 179, "Result", "ts") + `<line x1="60" y1="175" x2="350" y2="175" class="ln"/>`;
      return s;
    })(),
    frames: [
      "<b>switchMap</b>: naya click aate hi purani call <b>cancel</b>. Sirf aakhri (C) ka result — search box ke liye.",
      "<b>mergeMap</b>: sab calls <b>saath</b> chalti hain, jo pehle khatam uska result pehle.",
      "<b>concatMap</b>: <b>line mein</b> — A khatam, phir B, phir C. Order pakka — save ke liye.",
      "<b>exhaustMap</b>: A chal rahi thi to B <b>ignore</b>. C tab aaya jab A khatam ho chuki thi. Login/submit button ke liye.",
    ],
  },

  "subjects": {
    title: "Subject vs BehaviorSubject vs ReplaySubject — der se aane wale ko kya mila",
    h: 180,
    svg: (() => {
      let s = S.mid(180, 16, "Subject", "tt big", 'data-tx="1:Subject;2:BehaviorSubject;3:ReplaySubject(2)"');
      s += S.txt(8, 54, "Emit", "ts") + `<line x1="60" y1="50" x2="350" y2="50" class="ln"/>`;
      [["1", 90], ["2", 160], ["3", 280]].forEach(([t, x]) => { s += S.dot(x, 50, 11, "obj c1") + S.mid(x, 54, t, "wt"); });
      s += `<line x1="215" y1="30" x2="215" y2="150" class="ln dash"/>` + S.mid(215, 168, "late subscriber yahan juda", "ts");
      s += S.txt(8, 124, "Mila", "ts") + `<line x1="60" y1="120" x2="350" y2="120" class="ln"/>`;
      const got = { 1: [["3", 280]], 2: [["2", 220], ["3", 280]], 3: [["1", 220], ["2", 240], ["3", 280]] };
      Object.entries(got).forEach(([f, vals]) => {
        s += `<g data-f="${f}">` + vals.map(([t, x]) => S.dot(x, 120, 11, "obj c2") + S.mid(x, 124, t, "wt")).join("") + `</g>`;
      });
      return s;
    })(),
    frames: [
      "<b>Subject</b>: jo ho chuka (1, 2) wo gaya. Sirf <b>aage wale</b> (3) mile — live TV.",
      "<b>BehaviorSubject</b>: judte hi <b>latest value</b> (2) turant mili, phir 3 — scoreboard.",
      "<b>ReplaySubject(2)</b>: judte hi <b>pichhli 2</b> values (1, 2) replay hui, phir 3 — highlights.",
    ],
  },

  "event-loop": {
    title: "JavaScript event loop — output kis order mein",
    h: 235,
    svg: (() => {
      const code = ["console.log('A')", "setTimeout(() => log('B'))", "Promise.then(() => log('C'))", "console.log('D')"];
      let s = S.box(10, 8, 340, 92, "panel");
      code.forEach((c, i) => { s += S.box(18, 14 + i * 21, 324, 18, "codeline", `data-hl="${i + 1}"`) + S.txt(26, 27 + i * 21, c, "mono"); });
      s += S.box(10, 110, 165, 50, "panel") + S.txt(18, 126, "Microtask queue (Promise)", "ts");
      s += S.box(185, 110, 165, 50, "panel") + S.txt(193, 126, "Macrotask queue (timer)", "ts");
      s += `<g data-f="3-4">${S.box(20, 133, 50, 20, "c2")}${S.mid(45, 147, "C", "wt")}</g>`;
      s += `<g data-f="2-5">${S.box(195, 133, 50, 20, "c3")}${S.mid(220, 147, "B", "wt")}</g>`;
      s += S.box(10, 170, 340, 55, "panel") + S.txt(18, 188, "Output", "ts") +
        S.txt(18, 213, "", "mono big", 'data-tx="1:A;4:A D;5:A D C;6:A D C B"');
      return s;
    })(),
    frames: [
      "<b>console.log('A')</b> seedha chala → output: A",
      "<b>setTimeout</b> ka callback B timer queue (<b>macrotask</b>) mein gaya — 0ms ho tab bhi abhi nahi chalega.",
      "<b>Promise.then</b> ka callback C <b>microtask</b> queue mein gaya.",
      "<b>console.log('D')</b> chala → A D. Ab synchronous code khatam.",
      "Stack khaali → pehle <b>saare microtasks</b>: C → A D C",
      "Phir macrotask: B → <b>A D C B</b>. Rule: sync → microtask (Promise) → macrotask (setTimeout).",
    ],
  },

  "ng-lifecycle": {
    title: "Angular component lifecycle — kaunsa hook kab",
    h: 205,
    svg: (() => {
      const H = [["constructor", "DI — services mile"], ["ngOnChanges", "@Input aaya"], ["ngOnInit", "ek baar: API call"], ["ngAfterViewInit", "@ViewChild ready"], ["ngOnChanges", "@Input phir badla"], ["ngOnDestroy", "unsubscribe, cleanup"]];
      let s = "";
      H.forEach(([h, d], i) => {
        const y = 8 + i * 32;
        s += S.box(60, y, 285, 26, "b", `data-hl="${i + 1}"`) + S.txt(70, y + 17, h, "mono") + S.txt(200, y + 17, d, "ts");
      });
      const tf = [1, 2, 3, 4, 5, 6].map(f => `${f}:0,${(f - 1) * 32}`).join(";");
      s += `<g data-tf="${tf}">${S.dot(30, 21, 9, "pen")}</g>`;
      return s;
    })(),
    frames: [
      "<b>constructor</b>: class bani. @Input abhi <b>undefined</b> — yahan sirf services inject karo.",
      "<b>ngOnChanges</b>: parent ne @Input diya (ngOnInit se pehle bhi chalta hai).",
      "<b>ngOnInit</b>: sirf <b>ek baar</b> — inputs ready hain, API call yahan.",
      "<b>ngAfterViewInit</b>: template ban gaya — @ViewChild wale elements ab milenge.",
      "Parent ne input <b>badla</b> → ngOnChanges <b>phir</b> chala (ngOnInit dobara nahi).",
      "Component hat raha hai → <b>ngOnDestroy</b>: unsubscribe, timers clear — warna memory leak.",
    ],
  },
};

// ---- the frame engine ----
function inFrames(spec, f){
  return spec.split(",").some(part => {
    const [a, b] = part.split("-").map(Number);
    return b ? f >= a && f <= b : f === a;
  });
}
// "1:x;3:y" → value for frame f (last key <= f); undefined before the first key.
function atFrame(spec, f){
  let v;
  spec.split(";").forEach(pair => {
    const i = pair.indexOf(":");
    const k = pair.slice(0, i), val = pair.slice(i + 1);
    const [a, b] = k.split("-").map(Number);
    if(b ? f >= a && f <= b : f >= a) v = val;
  });
  return v;
}

function vizEl(name){
  const v = VIZ[name];
  if(!v) return null;
  const n = v.frames.length;
  const wrap = document.createElement("div");
  wrap.className = "vz";
  wrap.dataset.viz = name;
  wrap.innerHTML =
    '<div class="vz-title"></div>' +
    `<svg viewBox="0 0 360 ${v.h}" role="img">${v.svg}</svg>` +
    '<p class="vz-cap" aria-live="polite"></p>' +
    '<div class="vz-ctl"><button type="button" data-a="prev" aria-label="Pichhla step">‹</button>' +
    '<button type="button" data-a="play" class="vz-play">▶ Chalao</button>' +
    '<button type="button" data-a="next" aria-label="Agla step">›</button><span class="vz-step"></span></div>';
  wrap.querySelector(".vz-title").textContent = v.title;
  wrap.querySelector("svg").setAttribute("aria-label", v.title);
  const svg = wrap.querySelector("svg");
  svg.querySelectorAll("[data-cl]").forEach(e => { e.dataset.base = e.getAttribute("class") || ""; });
  let f = 1, timer = null;
  const playBtn = wrap.querySelector(".vz-play");

  function show(){
    svg.querySelectorAll("[data-f]").forEach(e => e.classList.toggle("vz-off", !inFrames(e.dataset.f, f)));
    svg.querySelectorAll("[data-hl]").forEach(e => e.classList.toggle("hl", !!e.dataset.hl && inFrames(e.dataset.hl, f)));
    svg.querySelectorAll("[data-tf]").forEach(e => {
      const t = atFrame(e.dataset.tf, f) || "0,0";
      const [x, y] = t.split(",");
      e.style.transform = `translate(${x}px, ${y}px)`;
    });
    svg.querySelectorAll("[data-tx]").forEach(e => { const t = atFrame(e.dataset.tx, f); if(t !== undefined) e.textContent = t; });
    svg.querySelectorAll("[data-cl]").forEach(e => {
      const c = atFrame(e.dataset.cl, f);
      e.setAttribute("class", e.dataset.base + (c ? " " + c : ""));
    });
    wrap.querySelector(".vz-cap").innerHTML = v.frames[f - 1];
    wrap.querySelector(".vz-step").textContent = f + " / " + n;
  }
  function stop(){ clearInterval(timer); timer = null; playBtn.textContent = f === n ? "↻ Dobara" : "▶ Chalao"; }
  function go(to){ f = Math.min(n, Math.max(1, to)); show(); if(!timer) playBtn.textContent = f === n ? "↻ Dobara" : "▶ Chalao"; }
  wrap.querySelector(".vz-ctl").addEventListener("click", e => {
    const a = e.target.closest("button") && e.target.closest("button").dataset.a;
    if(a === "prev"){ stop(); go(f - 1); }
    else if(a === "next"){ stop(); go(f + 1); }
    else if(a === "play"){
      if(timer) return stop();
      if(f === n) go(1);
      playBtn.textContent = "⏸ Rukko";
      timer = setInterval(() => { if(f >= n) return stop(); go(f + 1); if(f >= n) stop(); }, 2600);
    }
  });
  show();
  return wrap;
}

// Replace <div class="vz-slot" data-viz="..."> placeholders inside root.
function hydrateViz(root){
  root.querySelectorAll(".vz-slot").forEach(slot => {
    const el = vizEl(slot.dataset.viz);
    if(el) slot.replaceWith(el); else slot.remove();
  });
}
