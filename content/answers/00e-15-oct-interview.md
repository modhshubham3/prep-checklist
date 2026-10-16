# 15 Oct interview — Angular/JS mein jo atka

## fetch se API call — kya interceptor chalega?
? HttpClient ke interceptor ke baare mein poochha: agar `fetch` se request bhejo to bhi interceptor chalega?
**Ek line:** **Nahi.** Interceptor sirf **HttpClient** ki requests pakadta hai. `fetch` aur `XMLHttpRequest` seedha browser ko jaate hain — token nahi lagega.

| | HttpClient | fetch |
| --- | --- | --- |
| Interceptor | Chalta hai | **Nahi chalta** |
| Return | Observable | Promise |
| JWT auto-attach | Haan (interceptor se) | Haath se header lagao |

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { Authorization: `Bearer ${token()}` } }));

this.http.get('/api/trips');   // interceptor chala
fetch('/api/trips');           // interceptor NAHI chala — 401 aayega
```

! Interview mein "Yes, kyunki authorize karna hai" bola — galat. Reason sunke lagta hai sahi, par mechanism ulta hai.

> Interceptor HttpClient ke darwaze par baitha hai; fetch peeche ki khidki se nikal jaata hai.

## Promise RxJS ka hissa nahi hai
? RxJS kya hai? Promise aur Observable ka kya rishta?
**Ek line:** **Promise JavaScript ka apna** hai (ES6). **RxJS** ek alag library hai jo **Observable** aur operators deti hai. Promise RxJS ka hissa nahi.

| | Promise | Observable (RxJS) |
| --- | --- | --- |
| Kahan se | JavaScript built-in | RxJS library |
| Values | Sirf **ek** | Kai — stream |
| Shuru kab | Turant (eager) | Subscribe par (lazy) |
| Cancel | Nahi | `unsubscribe()` |
| Operators | `then/catch` | `map`, `switchMap`, `debounceTime`... |

```ts
const p = fetch('/a');                  // request ABHI chali gayi
const o = this.http.get('/a');          // abhi kuch nahi — subscribe par chalegi
o.subscribe(r => console.log(r));
```

! "Promise aur Observable RxJS ka part hain" bola — interviewer ne seedha tok diya.

> Promise = ek courier parcel. Observable = akhbaar ki subscription.

## const vs let vs var
? Constant aur variable mein kya farak? (JS)
**Ek line:** `const` ko dobara **assign** nahi kar sakte (par object ke andar badal sakta hai); `let` block scope; `var` function scope + hoisting.

| | var | let | const |
| --- | --- | --- | --- |
| Scope | Function | Block | Block |
| Dobara assign | Haan | Haan | **Nahi** |
| Redeclare | Haan | Nahi | Nahi |
| Hoisting | `undefined` mil jaata | Error (TDZ) | Error (TDZ) |

```js
const user = { name: 'A' };
user.name = 'B';     // chalega — object badla, binding nahi
user = {};           // TypeError
```

! "Abhi yaad nahi aa raha" — yeh sabse basic sawaal tha. Detail: card "var vs let vs const — JavaScript mein".

> const = naam par tala; andar ka saamaan badal sakta hai.

## Closure — ek example ke saath
? Closure kya hai?
**Ek line:** ek function jo **apne bahar ke variables ko yaad rakhta hai**, bahar wala function khatam hone ke baad bhi.

```js
function counter() {
  let n = 0;                 // bahar ka variable
  return () => ++n;          // andar wala n ko yaad rakhta hai
}
const c = counter();
c(); c();                    // 1, 2
```

| Kahan kaam aata | Kya |
| --- | --- |
| Private state | `n` bahar se chhoo nahi sakte |
| Callbacks | Loop variable yaad rakhna |
| Angular | `subscribe(x => this.total = x)` — `this` capture |

! Definition sahi thi, par **example nahi diya**. Interviewer example maangta hai.

> Function apne saath ghar ka saamaan lekar chalta hai.

## Angular directives ke types
? Directives ke types kya hain?
**Ek line:** teen — **Component** (template wali), **Structural** (DOM badalti), **Attribute** (look/behaviour badalti).

| Type | Kya karta | Example |
| --- | --- | --- |
| Component | Template ke saath directive | `@Component` |
| Structural | Element jodta/hatata | `*ngIf`, `*ngFor`, `@if`, `@for` |
| Attribute | Element ka style/behaviour | `ngClass`, `ngStyle`, custom `appHighlight` |

```html
<div *ngIf="show">...</div>            <!-- structural: DOM mein jodta -->
<p [ngClass]="{ red: bad }">...</p>    <!-- attribute: sirf class badli -->
```

! "Structural aur ek aur yaad nahi" — **teen** hain. Component bhi directive hai.

> Component = poora ghar, structural = deewar banao/todo, attribute = rang badlo.

## Decorator kya hota hai — kitne type?
? Decorator kya hai? Kuch naam batao.
**Ek line:** `@` wali cheez jo class/property/method par **metadata** lagati hai — Angular usse padhkar jaanta hai ki yeh kya hai.

| Type | Example |
| --- | --- |
| Class | `@Component`, `@Injectable`, `@NgModule`, `@Directive`, `@Pipe` |
| Property | `@Input`, `@Output`, `@ViewChild`, `@HostBinding` |
| Method | `@HostListener` |
| Parameter | `@Inject`, `@Optional` |

! `@Component` bata paaye par type aur kaam nahi bata paaye.

> Decorator = class par chipka label: "main component hoon".

## Child se parent ko data — @Output
? Child component se parent ko data bhejna ho to kaunsa decorator?
**Ek line:** **@Output + EventEmitter**. Parent → child ke liye `@Input`. `@ViewChild` **parent ka child ko chhoone** ke liye hai, data bhejne ke liye nahi.

```ts
// child
@Output() saved = new EventEmitter<Trip>();
save() { this.saved.emit(this.trip); }
// parent
// <app-trip (saved)="onSaved($event)"></app-trip>
```

| Direction | Tareeka |
| --- | --- |
| Parent → child | `@Input` |
| Child → parent | `@Output` + `emit` |
| Parent child ka method chalaye | `@ViewChild` |

! Pehle ViewChild bola, phir sudhaara. Pehla jawab hi sahi hona chahiye.

> Input = parcel andar, Output = ghanti bajao.

## @Injectable kya karta hai — providedIn vs providers
? `@Injectable` ka kaam? `providedIn: 'root'` aur module ke `providers` mein kya farak?
**Ek line:** `@Injectable` batata hai ki **class DI se inject ho sakti hai**; `providedIn: 'root'` use **poori app mein ek singleton** bana deta hai (tree-shakable).

| | providedIn: 'root' | providers (NgModule/component) |
| --- | --- | --- |
| Instance | App mein ek | Us module/component ke liye |
| Tree-shake | Haan — use nahi hui to bundle se hat | Nahi |
| Component providers | — | Har component ka apna instance |

```ts
@Injectable({ providedIn: 'root' })
export class TripService { }          // sabke liye ek

@Component({ providers: [TripService] })   // is component ka apna alag
```

! "Wahi dependency injection ke liye" bola to interviewer ne "Are you sure?" bola — poora jawab chahiye tha. providedIn ka farak pata nahi tha. Detail: card "Hierarchical injector — providedIn root vs component providers, InjectionToken".

> root = ek hi chaabi sabke paas; component providers = apni chaabi.

## Angular Signals — ek paragraph
? Signals kya hain?
**Ek line:** `signal()` ek **value ka dabba** hai jo badalte hi usse padhne wali screen/computed ko **khud batata** hai — zone.js ke bina fine-grained update.

```ts
count = signal(0);
double = computed(() => this.count() * 2);
inc() { this.count.update(v => v + 1); }
// template: {{ count() }} {{ double() }}
```

| | Signal | Observable |
| --- | --- | --- |
| Hamesha value | Haan | Nahi |
| Padhna | `count()` | `subscribe` / `async` |
| Kab | Simple state | Stream, HTTP, events |

! "No idea" bola. Detail: card "Angular Signals kya hain aur RxJS se kaise alag hain?".

> Signal = thermometer jo khud bataye; Observable = radio jise tune karna padta hai.

## Change detection ke types — Default vs OnPush
? Change detection ke types? OnPush use kiya hai?
**Ek line:** do strategy — **Default** (har event par poora tree check) aur **OnPush** (sirf jab `@Input` ka **reference** badle, event aaye, ya `async` pipe/signal emit kare).

| | Default | OnPush |
| --- | --- | --- |
| Check kab | Har event par har component | Sirf zaroorat par |
| Array `push` | Dikhta hai | **Nahi dikhta** — naya array do |
| Speed | Dheema bade tree par | Tez |

```ts
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
this.items = [...this.items, x];   // naya reference — OnPush ko dikhega
```

! "Cannot recall" bola. Zoneless = zone.js ke bina change detection (signals ke saath). Detail: cards "Change Detection", "OnPush".

> OnPush = "tabhi uthunga jab koi bell bajaye".

## Routing guards ke types
? Guards kitne type ke? Naam batao.
**Ek line:** `CanActivate`, `CanActivateChild`, `CanDeactivate`, `CanMatch` (lazy module load rokne), aur `Resolve` (data pehle laana, guard nahi).

| Guard | Kaam |
| --- | --- |
| CanActivate | Route kholne se pehle login check |
| CanActivateChild | Child routes par |
| CanDeactivate | Unsaved form chhodne se pehle poochho |
| CanMatch | Role ke hisaab se route ya lazy chunk |

```ts
export const authGuard: CanActivateFn = () =>
  inject(AuthService).loggedIn() || inject(Router).createUrlTree(['/login']);
```

! Sirf do naam aaye. Ab functional guards (`CanActivateFn`) standard hain.

> Guard = darwaze par chowkidaar.

## angular.json mein kya hota hai — package.json se farak
? angular.json ka kaam? NPM library install karoge to wahan aayegi?
**Ek line:** **angular.json = build/serve ki settings** (assets, styles, scripts, budgets, environments). Library install karne par naam **package.json** mein jaata hai, angular.json mein nahi.

| File | Mein kya |
| --- | --- |
| package.json | Dependencies, scripts |
| angular.json | Build config, global `styles`/`scripts`, assets |
| tsconfig.json | TypeScript options |

! "Haan, library angular.json mein aayegi" bola — galat. Sirf global CSS/JS (jaise bootstrap.css) angular.json mein jodte hain.

> package.json = saamaan ki list; angular.json = ghar banane ka naksha.

## .NET Framework vs .NET Core — aaj ka sach
? Dono mein kya farak?
**Ek line:** Framework **Windows-only**, 4.8 par ruka (naya feature nahi). Core se aage chala **.NET 5/6/8/9/10** — cross-platform, tez, open-source.

| | .NET Framework | .NET (Core, 5+) |
| --- | --- | --- |
| OS | Windows | Windows, Linux, macOS |
| Host | IIS | IIS, Kestrel, Docker |
| Naya version | 4.8 aakhri | Har saal naya |

! "Dot net 4 latest hai" bola — galat. Latest abhi .NET 10 ke aaspaas hai; 4.8 Framework ka aakhri.

> Framework = purana ghar, sirf ek sheher mein; .NET = jahan chaaho wahan.
