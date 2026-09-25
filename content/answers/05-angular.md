# Angular aur RxJS

## Angular Fundamentals
**Angular** Google ka **TypeScript-based frontend framework** hai single-page applications (SPA) ke liye. SPA mein browser ek hi HTML page load karta hai aur uske baad Angular page ke hisse badalta rehta hai — poora page reload nahi hota.

Building blocks:
- **Component** — UI ka ek tukda: TypeScript class (logic) + HTML template + CSS. Poori app components ka tree hai.
- **Service** — business logic, API calls, shared state. `@Injectable` se DI mein aata hai, taaki components patle rahein.
- **Module (NgModule)** — related cheezon ka group. Angular 14+ se **standalone components** aaye — module ki zaroorat nahi; Angular 17+ mein ye default hai.
- **Directive** — DOM element ka behaviour ya structure badalna (`*ngIf`, `[ngClass]`).
- **Pipe** — template mein display ke liye value transform (`date`, `currency`, `uppercase`).
- **Routing** — URL ke hisaab se component dikhana.
- **Dependency Injection** — services constructor ya `inject()` se milti hain.

**Constructor vs ngOnInit**: constructor sirf DI ke liye (services lena); `@Input` values abhi set nahi hui hoti. Initialization logic aur API calls `ngOnInit` mein.

Modern Angular (16+) mein **Signals** bhi hain — reactive state ka naya, simple tareeka jo change detection ko zyada efficient banata hai.

| Concept | Kaam | Example |
|---|---|---|
| Component | UI + logic | `UserListComponent` |
| Service | API/shared logic | `UserService` |
| Directive | DOM behaviour | `*ngIf`, `[ngClass]` |
| Pipe | Display transform | `currency`, `date`, `titlecase` |
| Lifecycle hook | Component ke stages | `ngOnInit`, `ngOnDestroy` |

```typescript
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: `<li *ngFor="let u of users">{{ u.name | titlecase }}</li>`
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  constructor(private userService: UserService) {}        // sirf DI
  ngOnInit() { this.userService.getAll().subscribe(u => this.users = u); }  // init logic
}
```

## Angular Directives
**Directive** ek class hai jo DOM element ko **extra behaviour** deti hai. Teen type:

**Components** — asal mein template wale directives hi hain.

**Structural directives** — DOM ka **structure** badalte hain: elements **add/remove** karte hain. `*` se pehchaane jaate hain — `*ngIf` (condition pe element dikhao/hatao), `*ngFor` (list repeat), `*ngSwitch`. Angular 17+ mein naya **control flow syntax** hai: `@if`, `@for`, `@switch` — built-in, tez, aur `@for` mein `track` compulsory hai.

**Attribute directives** — existing element ka **appearance ya behaviour** badalte hain, element hatate nahi: `[ngClass]`, `[ngStyle]`, `[(ngModel)]`, ya apna directive jaise `appHighlight`, `appAutofocus`.

Apna directive `@Directive` se banta hai; element ko `ElementRef` se access, events ko `@HostListener` se sunte ho. DOM seedha chhedne ki jagah `Renderer2` use karna safe hai.

| Type | Kya karta hai | Example |
|---|---|---|
| Structural | DOM se element add/remove | `*ngIf`, `*ngFor`, `@if`, `@for` |
| Attribute | Look/behaviour badle | `[ngClass]`, `[ngStyle]`, custom |

```typescript
@Directive({ selector: '[appHighlight]', standalone: true })
export class HighlightDirective {
  constructor(private el: ElementRef, private r: Renderer2) {}
  @HostListener('mouseenter') on()  { this.r.setStyle(this.el.nativeElement, 'background', 'yellow'); }
  @HostListener('mouseleave') off() { this.r.removeStyle(this.el.nativeElement, 'background'); }
}
```

```html
@if (user) { <p>{{ user.name }}</p> } @else { <p>Loading…</p> }
@for (item of items; track item.id) { <li>{{ item.name }}</li> }
<p appHighlight [ngClass]="{ active: isActive }">Hover me</p>
```

## Angular Data Binding
**Data binding** component (TypeScript) aur template (HTML) ke beech data ka sync hai. Chaar tareeke:

**Interpolation `{{ }}`** — component se value template mein **dikhana** (text). **Property binding `[prop]`** — component se DOM element ki **property set** karna (`[disabled]`, `[src]`, child ka `@Input`). **Event binding `(event)`** — DOM se component ko **event bhejna** (`(click)`, `(input)`, child ka `@Output`). **Two-way binding `[(ngModel)]`** — dono taraf: input mein type karo to property badle, property badlo to input badle. Ye asal mein property binding + event binding ka shortcut hai ("banana in a box" `[( )]`).

`[(ngModel)]` ke liye `FormsModule` import chahiye. Custom two-way binding: `@Input() value` + `@Output() valueChange` — naam ka `Change` suffix zaroori hai. Angular 17+ mein `model()` signal se bhi.

Interpolation aur property binding mein farak: `src="{{ url }}"` aur `[src]="url"` same kaam karte hain, par non-string values (boolean, object) ke liye property binding hi sahi hai.

| Type | Direction | Syntax |
|---|---|---|
| Interpolation | Component → View | `{{ name }}` |
| Property binding | Component → View | `[disabled]="loading"` |
| Event binding | View → Component | `(click)="save()"` |
| Two-way | Dono | `[(ngModel)]="name"` |

```html
<h2>{{ user.name }}</h2>
<button [disabled]="loading" (click)="save()">Save</button>
<input [(ngModel)]="searchText" />
<!-- same as: -->
<input [ngModel]="searchText" (ngModelChange)="searchText = $event" />
```

> Interpolation = dikhao, Property = set karo, Event = suno, Two-way = dono.

## Parent → Child
Parent component child ko data **`@Input()`** se bhejta hai. Child mein property pe `@Input()` lagao, parent template mein property binding se value do.

Child ko input change ka pata chahiye (jaise naya userId aaya to data dobara laao) to do tareeke: `ngOnChanges(changes: SimpleChanges)` lifecycle hook, ya input ko **setter** bana do. Angular 16+ mein `@Input({ required: true })` (value na di to compile error), aur 17+ mein **signal inputs** — `userId = input.required<number>()` jo `computed`/`effect` ke saath naturally react karte hain.

**OnPush ke saath dhyan**: agar parent object ko mutate kare (`user.name = 'x'`) to reference nahi badla, OnPush child update nahi hoga. Naya object bhejo (`this.user = { ...this.user, name: 'x' }`).

```typescript
// child
@Component({ selector: 'app-user-card', standalone: true, template: `<h3>{{ user.name }}</h3>` })
export class UserCardComponent implements OnChanges {
  @Input({ required: true }) user!: User;
  ngOnChanges(c: SimpleChanges) { if (c['user']) console.log('naya user', this.user); }
}
```

```html
<!-- parent -->
<app-user-card [user]="selectedUser"></app-user-card>
```

## Child → Parent
Child parent ko **event** bhejta hai **`@Output()` + `EventEmitter`** se. Child mein `@Output() saved = new EventEmitter<Order>()`, aur jab kuch ho to `this.saved.emit(order)`. Parent template mein event binding se sunta hai — `(saved)="onSaved($event)"` — aur `$event` mein emit ki hui value aati hai.

Isse child **reusable** rehta hai: use pata nahi ki parent us event ka kya karega — bas batata hai "kuch hua". Angular 17.3+ mein `output()` function bhi hai (`saved = output<Order>()`).

Doosra tareeka: parent `@ViewChild(ChildComponent)` se child ka reference le ke uske methods seedha call kare — par isse tight coupling hoti hai, zyada use mat karo.

```typescript
// child
export class OrderFormComponent {
  @Output() saved = new EventEmitter<Order>();
  submit() { this.saved.emit(this.form.value as Order); }
}
```

```html
<!-- parent -->
<app-order-form (saved)="onOrderSaved($event)"></app-order-form>
```

> Input = data neeche aata hai. Output = event upar jaata hai.

## Sibling/shared
Do **siblings** (ek parent ke do child, ya bilkul alag components) ke beech seedha `@Input/@Output` nahi chalta. Options:

**1. Parent ke through** — child A `@Output` se parent ko bataye, parent `@Input` se child B ko de. Chhote cases ke liye theek, par gehre tree mein "prop drilling" ho jaati hai.

**2. Shared service with BehaviorSubject** (sabse common) — ek `providedIn: 'root'` service jisme private `BehaviorSubject` ho, bahar `asObservable()` expose ho, aur update ke liye method. Ek component likhta hai, doosra subscribe (ya `async` pipe) karta hai. `BehaviorSubject` isliye kyunki naya subscriber turant **latest value** pa leta hai. Angular 16+ mein ye kaam **signals** se aur saaf hota hai.

**3. State management (NgRx)** — badi app jahan bahut saare components bahut saari shared state use karte hain.

```typescript
@Injectable({ providedIn: 'root' })
export class CartService {
  private items$ = new BehaviorSubject<CartItem[]>([]);
  readonly cart$ = this.items$.asObservable();                 // bahar sirf read
  add(item: CartItem) { this.items$.next([...this.items$.value, item]); }   // naya array (immutable)
}

// Product list: this.cart.add(item)
// Header:      count$ = this.cart.cart$.pipe(map(i => i.length));   template: {{ count$ | async }}
```

## RxJS operators — Observable, Subject, BehaviorSubject aur common operators
**RxJS** async data streams ke saath kaam karne ki library hai, aur Angular ise har jagah use karta hai — `HttpClient`, forms ke `valueChanges`, router events.

**Observable** — ek stream jo time ke saath 0, 1 ya kai values de sakta hai, phir complete ya error. **Lazy** hai: subscribe karne tak kuch nahi chalta. **Subject** — Observable bhi aur Observer bhi: tum khud `.next()` se values daal sakte ho, aur ek value saare subscribers ko jaati hai (multicast). **BehaviorSubject** — Subject jo **latest value yaad rakhta hai** aur naye subscriber ko turant deta hai (initial value zaroori) — state ke liye. **ReplaySubject** — aakhri N values replay karta hai.

Operators `pipe()` ke andar chain hote hain: **map** (transform), **filter**, **tap** (side effect/logging), **debounceTime** (itni der shaanti ke baad value do — search box), **distinctUntilChanged** (same value dobara mat bhejo), **switchMap/mergeMap/concatMap** (har value pe naya inner observable, jaise API call), **catchError** (error sambhalo), **takeUntil** (unsubscribe), **combineLatest/forkJoin** (kai streams jodna — forkJoin sab complete hone pe ek baar, jaise parallel API calls).

| Operator | Kaam | Kahan |
|---|---|---|
| `map` | Value transform | Response se data nikalna |
| `filter` | Value chhaanto | Min length wale search terms |
| `debounceTime` | Ruko, phir bhejo | Search box |
| `distinctUntilChanged` | Same value skip | Search box |
| `switchMap` | Purana cancel, naya chalao | Search, route param |
| `forkJoin` | Sab complete → ek result | Parallel API calls |
| `catchError` | Error handle | HTTP failure |
| `takeUntil` | Signal pe band | Unsubscribe on destroy |

```typescript
this.results$ = this.searchCtrl.valueChanges.pipe(
  map(v => v.trim()),
  filter(v => v.length >= 2),
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(q => this.api.search(q).pipe(catchError(() => of([]))))
);

forkJoin({ user: this.api.user(id), orders: this.api.orders(id) })
  .subscribe(({ user, orders }) => { /* dono aa gaye */ });
```

## switchMap
`switchMap` har nayi outer value pe ek naya inner observable (usually API call) shuru karta hai, aur **pichhla inner observable cancel (unsubscribe)** kar deta hai. Yani hamesha sirf **latest** request ka result aata hai.

Kyun zaroori hai? Search box mein user ne "an" type kiya (request 1), phir "ang" (request 2). Agar request 1 ka jawab request 2 ke baad aaye, to bina switchMap ke purana result naye ko overwrite kar dega — screen pe galat results. switchMap request 1 ko cancel kar deta hai (HttpClient mein actual HTTP request abort ho jaati hai), to ye race condition hoti hi nahi.

Use: search/typeahead, route parameter badalne pe data laana, filter change. **Mat use karo** jahan har request ka poora hona zaroori hai (save, payment) — wahan cancel hona data kho sakta hai; `concatMap`/`exhaustMap` use karo.

```typescript
this.route.paramMap.pipe(
  map(p => Number(p.get('id'))),
  switchMap(id => this.api.getOrder(id))       // naya id aaya to purani request cancel
).subscribe(order => this.order = order);
```

> Search box ka default jawab — purana result aake naya overwrite nahi karega.

## mergeMap
`mergeMap` (alias `flatMap`) har outer value pe inner observable shuru karta hai aur **saare inner observables ko parallel chalne deta hai** — kuch cancel nahi hota, aur results jis order mein complete hon usi order mein aate hain (**order guaranteed nahi**).

Use: **independent** operations jo ek saath chal sakte hain — jaise 10 files upload karna, list ke har item ki details laana, notifications bhejna. Bahut saari values ho to server pe load aa sakta hai — `mergeMap(fn, concurrency)` ka doosra argument parallel requests limit karta hai (jaise 3 ek saath).

```typescript
from(fileList).pipe(
  mergeMap(file => this.api.upload(file), 3)     // max 3 uploads ek saath
).subscribe(res => console.log('uploaded', res));
```

> Independent parallel calls ke liye.

## concatMap
`concatMap` inner observables ko **ek ke baad ek, queue mein** chalata hai. Naya inner tab shuru hota hai jab pichhla **complete** ho jaaye. Kuch cancel nahi hota, aur **order maintained** rehta hai.

Use: jab **sequence important** ho — ordered saves, dependent updates, ek ke baad ek API steps, "auto-save" jahan har change order mein save hona chahiye. Nuksaan: agar ek request slow hai to baaki sab uske peeche wait karte hain.

Ek aur: **`exhaustMap`** — jab tak current inner chal raha hai, nayi values **ignore** karta hai. Double-click se do baar submit/login rokne ke liye perfect.

```typescript
this.saveClicks$.pipe(
  concatMap(data => this.api.save(data))        // har save order mein, ek ke baad ek
).subscribe();

this.loginClick$.pipe(
  exhaustMap(() => this.auth.login(creds))      // chalte login ke dauraan clicks ignore
).subscribe();
```

> Jab sequence important ho — jaise ordered save.

## switchMap vs mergeMap vs concatMap — kab kaunsa?
Chaaron "flattening" operators hain — har outer value ko inner observable (API call) mein badalte hain. Farak ye hai ki **jab naya aaye aur purana abhi chal raha ho** tab kya karte hain:

**switchMap** — purana **cancel**, naya chalao. Sirf latest result chahiye. → Search, filters, route params.
**mergeMap** — dono **parallel** chalne do. Sab chahiye, order ki fikar nahi. → Independent uploads, bulk fetch.
**concatMap** — naya **queue** mein, purana khatam hone ke baad. Sab chahiye, order mein. → Ordered saves.
**exhaustMap** — naya **ignore**, jab tak purana chal raha hai. → Submit/login button double click.

Galat chunne ke nateeje: search mein mergeMap → purane results naye ko overwrite (race). Save mein switchMap → pehla save cancel, data gaya. Login mein concatMap → double click pe do login requests.

| Operator | Naya aaya, purana chal raha hai | Use case |
|---|---|---|
| switchMap | Purana cancel | Search / typeahead |
| mergeMap | Dono parallel | Independent parallel calls |
| concatMap | Naya queue mein | Ordered saves |
| exhaustMap | Naya ignore | Submit / login button |

```typescript
searchInput.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(value => this.search(value))
);
```

## Angular HTTP
Angular mein backend se baat karne ke liye **`HttpClient`** service hai. Setup: standalone apps mein `provideHttpClient()`, purane module style mein `HttpClientModule`. Methods `get`, `post`, `put`, `patch`, `delete` — sab **Observable** lautate hain, aur type bhi de sakte ho (`get<User[]>`).

Important baatein: (1) HttpClient observable **lazy** hai — **subscribe (ya `async` pipe) ke bina request jaati hi nahi**. (2) Har subscribe = nayi HTTP request. (3) HTTP observable ek value deke **complete** ho jaata hai, isliye iska unsubscribe zaroori nahi (par component destroy hone pe chalti request cancel karna achha hai). (4) API calls hamesha **service** mein rakho, component mein nahi.

**Interceptors** har request/response ko globally process karte hain (JWT, errors, loading). Errors `catchError` se, retry `retry(2)` se. Query params `HttpParams` se.

```typescript
@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private base = '/api/orders';

  list(page: number) {
    const params = new HttpParams().set('page', page).set('pageSize', 20);
    return this.http.get<PagedResult<Order>>(this.base, { params });
  }
  create(o: CreateOrder) { return this.http.post<Order>(this.base, o); }
  remove(id: number)     { return this.http.delete<void>(`${this.base}/${id}`); }
}
```

! "Maine `this.api.save(x)` call kiya par request gayi hi nahi" — subscribe nahi kiya. Observable lazy hai.

## Http Interceptor
**HTTP Interceptor** har outgoing HTTP request aur incoming response ke **beech mein baitha middleware** hai — ASP.NET Core middleware ka Angular wala version. Ek jagah likho, poori app ki har HTTP call pe lagega.

Common uses: **JWT token jodna** (`Authorization: Bearer …` header), **global error handling** (401 pe login page, 500 pe toast), **loading spinner** (request start pe dikhao, finalize pe chhupao), **logging**, base URL jodna, retry.

Request **immutable** hota hai — badalne ke liye `req.clone({ setHeaders: … })`. Modern Angular (15+) mein **functional interceptors** (`HttpInterceptorFn`) aur `provideHttpClient(withInterceptors([...]))`. **401 handling** mein dhyan: token refresh karke request retry karni ho to ek saath aayi kai 401s ke liye ek hi refresh chalana chahiye.

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) inject(Router).navigate(['/login']);
      return throwError(() => err);
    })
  );
};

// app.config.ts
provideHttpClient(withInterceptors([authInterceptor]));
```

> JWT attach karne ki standard jagah.

## Angular Forms
Angular mein forms banane ke do tareeke:

**Template-driven forms** — form ka logic mostly **HTML** mein: `[(ngModel)]`, `required`, `#f="ngForm"`. `FormsModule` chahiye. Chhote, simple forms (login, contact) ke liye jaldi ban jaate hain. Par complex validation aur testing mushkil.

**Reactive forms** — form ka structure **TypeScript** mein: `FormGroup`, `FormControl`, `FormArray`, `FormBuilder`. `ReactiveFormsModule` chahiye. Validation code mein, **custom validators**, cross-field validation (password = confirm password), **async validators** (email already exists? server se check), dynamic fields (`FormArray` — items add/remove), aur `valueChanges` observable se har change pe react karna. Unit testing aasaan. Angular 14+ mein **typed forms** — value ka type pata hota hai.

Form states: `valid/invalid`, `touched/untouched` (field pe focus gaya?), `dirty/pristine` (value badli?). Errors tab dikhao jab field `touched` ya `dirty` ho, warna page khulte hi laal errors dikhenge.

| Template-driven | Reactive |
|---|---|
| Logic HTML mein | Logic TypeScript mein |
| `ngModel` | `FormGroup`, `FormControl` |
| Simple forms | Complex/dynamic forms |
| Async by nature | Synchronous access, predictable |
| Testing mushkil | Testing aasaan |

```typescript
form = this.fb.group({
  email:    ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(8)]],
  items:    this.fb.array([])
});
submit() { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.api.save(this.form.value).subscribe(); }
```

```html
<form [formGroup]="form" (ngSubmit)="submit()">
  <input formControlName="email" />
  @if (form.controls.email.touched && form.controls.email.errors?.['email']) { <span>Email galat hai</span> }
</form>
```

## Change Detection
**Change detection** Angular ka wo process hai jo pata lagata hai ki component ka data badla hai aur **DOM update** karta hai. Default mein Angular **Zone.js** use karta hai: ye browser ke har async event (click, HTTP response, `setTimeout`, Promise) ko pakad leta hai aur uske baad **poore component tree** ko upar se neeche check karta hai — har template binding ki purani aur nayi value compare.

Choti apps ke liye ye bilkul theek hai. Badi apps (bade tables, bahut saare components) mein har chhote event pe poora tree check karna slow ho sakta hai.

**OnPush strategy** isse optimize karti hai: component sirf tab check hota hai jab (1) `@Input` ka **reference** badle, (2) component ya child mein koi **event** ho, (3) `async` pipe nayi value de, (4) manually `markForCheck()` bulao, (5) signal badle. Isliye OnPush ke saath data **immutable** tareeke se badlo.

**Signals** (Angular 16+) change detection ko fine-grained banate hain — Angular ko exactly pata hota hai kaunsa hissa badla. Angular zoneless (bina Zone.js) ki taraf ja raha hai.

```typescript
@Component({
  selector: 'app-order-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (o of orders; track o.id) { <tr>{{ o.total }}</tr> }`
})
export class OrderTableComponent { @Input() orders: Order[] = []; }

// parent: GALAT (OnPush update nahi hoga)
this.orders.push(newOrder);
// SAHI — naya reference
this.orders = [...this.orders, newOrder];
```

## ngIf VS hidden
Dono element "chhupa" dete hain, par tareeka bilkul alag hai:

**`*ngIf` (ya `@if`)** — condition false ho to element **DOM se hata deta hai**. Agar wo ek component hai, to wo **destroy** hota hai (`ngOnDestroy` chalta hai, state khatam), aur condition true hone pe **naya bana** (`ngOnInit` phir se, API call phir se). Memory aur DOM halka rehta hai.

**`[hidden]`** — element **DOM mein rehta hai**, sirf CSS `display: none` se dikhta nahi. Component zinda rehta hai, uski state aur subscriptions chalti rehti hain.

Kab kaunsa? **Bhaari component jo kabhi-kabhi dikhta hai** (permission-based section, modal content) → `*ngIf`. **Baar-baar toggle hone wala halka element jiski state bachani hai** (tabs jahan form ka data yaad rehna chahiye) → `[hidden]`. Security: `[hidden]` wala content page source/DevTools mein dikhta hai — sensitive data ke liye `*ngIf` (aur asli security hamesha backend pe). Ek catch: agar element pe CSS mein `display: flex` laga hai to wo `hidden` attribute ko override kar sakta hai.

| `*ngIf` | `[hidden]` |
|---|---|
| DOM se hata deta hai | DOM mein rehta hai (`display:none`) |
| Component destroy/recreate | Component zinda rehta hai |
| State kho jaati hai | State bachi rehti hai |
| Kabhi-kabhi dikhne wale bhaari hisse | Baar-baar toggle, state chahiye |

```html
<app-admin-panel *ngIf="isAdmin"></app-admin-panel>   <!-- non-admin ke liye bana hi nahi -->
<div [hidden]="activeTab !== 'details'"><app-details-form /></div>   <!-- tab switch pe data bacha -->
```

## Angular Performance
Angular app slow ho to pehle **measure** karo (Chrome DevTools Performance tab, Angular DevTools profiler, Lighthouse), phir fix. Common techniques:

- **Lazy loading** — routes/features tab load ho jab user wahan jaaye (`loadComponent`/`loadChildren`). Initial bundle chhota, pehla load tez. Angular 17 ka `@defer` block template ke hisse bhi lazy load karta hai.
- **OnPush change detection** — bekaar ke checks kam.
- **`trackBy` / `track`** — `*ngFor` mein bina trackBy ke list refresh pe Angular saare DOM elements dobara banata hai; trackBy se sirf badle hue items. Bade lists mein bahut bada farak.
- **Template mein function calls mat karo** — `{{ getTotal() }}` har change detection pe chalega; **pure pipe** ya pehle se calculate ki gayi property use karo.
- **Pagination / virtual scrolling** — 10,000 rows ek saath DOM mein mat daalo; CDK `cdk-virtual-scroll-viewport` sirf dikhne wali rows render karta hai.
- **debounceTime** — search pe har keystroke API call nahi.
- **Unsubscribe** — lambi subscriptions leak karti hain aur baar-baar kaam karti hain.
- **Caching** — same data baar-baar mat laao (`shareReplay`, service mein cache).
- **Bundle size** — production build, badi libraries hatao/tree-shake, `source-map-explorer` se dekho.

```typescript
trackById(_: number, item: Order) { return item.id; }
// <tr *ngFor="let o of orders; trackBy: trackById">
// Angular 17+: @for (o of orders; track o.id) { ... }

{ path: 'reports', loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent) }
```

## Routing / Guards
**Angular Router** URL ke hisaab se component dikhata hai — bina page reload ke. Routes array mein path → component mapping, `<router-outlet>` jahan component render ho, `routerLink` navigation ke liye, `ActivatedRoute` se URL parameters (`/users/:id`) aur query params.

**Route Guards** decide karte hain ki navigation **allowed hai ya nahi**:
- **canActivate** — route mein ghusne se pehle (logged in hai? role hai?)
- **canActivateChild** — child routes ke liye
- **canDeactivate** — route chhodne se pehle (unsaved form hai — "sach mein jaana hai?")
- **canMatch** — route match hi ho ya nahi (lazy module download bhi rok deta hai)
- **resolve** — route khulne se pehle data load

Modern Angular mein guards **functions** hain (`CanActivateFn`). Guard `true`, `false`, ya `UrlTree` (redirect) lauta sakta hai, sync ya Observable/Promise.

**Important**: guard sirf **UX** hai — frontend code user badal sakta hai. Asli security hamesha **backend** (`[Authorize]`) pe.

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'orders/:id', component: OrderDetailComponent, canActivate: [authGuard] },
  { path: 'admin', canMatch: [adminGuard], loadChildren: () => import('./admin/routes') },
  { path: '**', component: NotFoundComponent }
];
```

! "Guard laga diya to admin page secure hai" — nahi. API pe authorization zaroori hai; guard sirf UI chhupata hai.

## NgRx
**NgRx** Angular ke liye **Redux pattern** ka state management library hai. Poori app ki shared state ek central **Store** mein rehti hai, aur ek tay flow se hi badalti hai — isse data flow predictable aur debug karne mein aasaan hota hai (Redux DevTools mein har action aur state change dikhta hai, "time travel" bhi).

Flow: component **Action** dispatch karta hai (`loadUsers()`) → **Reducer** (pure function) purani state + action se **nayi state** banata hai → **Effects** side effects sambhalte hain (API call, phir success/failure action) → component **Selector** se state ka zaroori hissa padhta hai (memoized — sirf badalne pe recalculate).

**Kab use karein?** Badi app, bahut saare components ek hi state share aur modify karte hain, complex async flows. **Kab nahi?** Chhoti/medium apps mein NgRx bahut boilerplate laata hai — wahan services + BehaviorSubject, ya **signals** / NgRx SignalStore / ComponentStore kaafi hain. Interview mein ye balanced jawab achha lagta hai.

| Part | Kaam | Example |
|---|---|---|
| Store | Central state | `{ users: [], loading: false }` |
| Action | Kya hua (event) | `loadUsers()`, `loadUsersSuccess({ users })` |
| Reducer | Nayi state banao (pure) | `on(loadUsersSuccess, (s, { users }) => ({ ...s, users }))` |
| Effect | Side effects (API) | `loadUsers$` → API → success action |
| Selector | State padho (memoized) | `selectActiveUsers` |

```typescript
export const loadUsers = createAction('[Users] Load');
export const loadUsersSuccess = createAction('[Users] Load Success', props<{ users: User[] }>());

export const usersReducer = createReducer(initialState,
  on(loadUsers, s => ({ ...s, loading: true })),
  on(loadUsersSuccess, (s, { users }) => ({ ...s, users, loading: false })));

loadUsers$ = createEffect(() => this.actions$.pipe(
  ofType(loadUsers),
  switchMap(() => this.api.getUsers().pipe(map(users => loadUsersSuccess({ users }))))));
```

## ngOnInit
`ngOnInit` lifecycle hook component bante hi, **pehli baar `@Input` values set hone ke baad**, **ek baar** chalta hai. Component ka initialization logic yahan — API se data laana, subscriptions shuru karna, form setup.

**Constructor mein kyun nahi?** Constructor TypeScript class ka hissa hai aur Angular ise DI ke liye use karta hai. Us waqt `@Input` values **abhi set nahi hui** hoti (undefined), aur component DOM mein bhi nahi hota. Constructor ko sirf services lene tak rakho — halka aur testable.

Lifecycle order (important wale): `constructor` → `ngOnChanges` (inputs set/badle) → **`ngOnInit`** (ek baar) → `ngDoCheck` → `ngAfterContentInit` → `ngAfterViewInit` (child views ready — `@ViewChild` yahan milta hai) → … → `ngOnDestroy`.

Dhyan: agar route same component pe rehta hai par parameter badalta hai (`/orders/1` → `/orders/2`), to Angular component reuse karta hai aur `ngOnInit` **dobara nahi chalta** — isliye `paramMap` observable pe subscribe (switchMap) karo.

```typescript
export class OrderDetailComponent implements OnInit {
  @Input() orderId!: number;
  order$!: Observable<Order>;

  constructor(private api: OrderService) {
    // console.log(this.orderId);  // undefined — input abhi set nahi
  }

  ngOnInit() {
    this.order$ = this.api.get(this.orderId);   // input ready hai
  }
}
```

> Constructor mein API call mat karo — wahan Input abhi set nahi hue hote.

## ngOnDestroy
`ngOnDestroy` component **DOM se hatne se theek pehle** chalta hai (route change, `*ngIf` false). **Cleanup** ki jagah hai: subscriptions band karna, timers (`setInterval`) clear karna, event listeners hatana, WebSocket band karna.

**Kyun zaroori?** Component destroy ho gaya par uski `interval` ya store/`valueChanges` subscription chalti rahi, to wo memory mein bana rehta hai (**memory leak**) aur background mein kaam karta rehta hai — kabhi-kabhi destroyed component pe data set karke errors bhi. User baar-baar page pe aaye-jaaye to subscriptions jama hoti jaati hain.

Tareeke: (1) **`async` pipe** — sabse achha, Angular khud unsubscribe karta hai. (2) **`takeUntilDestroyed()`** (Angular 16+) — sabse saaf manual tareeka. (3) Purana pattern: `destroy$` Subject + `takeUntil(this.destroy$)`, aur `ngOnDestroy` mein `next()`/`complete()`. HTTP calls apne aap complete ho jaati hain, par long-lived streams (interval, store, router events, valueChanges) ko band karna zaroori hai.

```typescript
export class LiveTrackingComponent {
  private destroyRef = inject(DestroyRef);

  constructor(private api: TrackingService) {
    interval(5000).pipe(
      switchMap(() => this.api.positions()),
      takeUntilDestroyed(this.destroyRef)          // destroy pe apne aap band
    ).subscribe(p => this.positions = p);
  }
}

// Purana pattern
private destroy$ = new Subject<void>();
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
```

> takeUntil(this.destroy$) pattern sabse saaf hai — ya naya takeUntilDestroyed().

## Observable
**Observable** ek **stream** hai jo time ke saath **0, 1 ya kai values** de sakta hai, aur end mein complete ya error. RxJS ka core concept.

Teen khaas baatein: (1) **Lazy** — Observable banane se kuch nahi chalta; `subscribe()` karne pe hi execution shuru hota hai. Isliye `http.get()` bina subscribe ke request nahi bhejta. (2) **Cancellable** — `unsubscribe()` se chalta kaam rok sakte ho (HttpClient request abort ho jaati hai). (3) **Operators** — `map`, `filter`, `debounceTime`, `switchMap` jaise powerful tools se streams ko jod-tod sakte ho.

**Cold vs Hot**: cold observable (HttpClient) har subscriber ke liye alag execution chalata hai — do subscribe = do HTTP calls. Hot (Subject, DOM events) sab subscribers share karte hain. Cold ko share karna ho to `shareReplay(1)`.

Template mein `async` pipe observable ko subscribe/unsubscribe khud karta hai — sabse saaf tareeka.

```typescript
const users$ = this.http.get<User[]>('/api/users');   // kuch nahi hua
users$.subscribe(u => console.log(u));                // ab request gayi
users$.subscribe(u => console.log(u));                // DOOSRI request (cold)

const shared$ = users$.pipe(shareReplay(1));          // ek request, sab share
// template: @for (u of shared$ | async; track u.id) { ... }
```

> Subscribe nahi karoge to HTTP call hoti hi nahi — Observable lazy hai.

## Promise
**Promise** JavaScript ka built-in async primitive hai jo **ek hi future value** (ya error) represent karta hai. Ye **eager** hai — banate hi turant chalna shuru, chahe koi `.then()` kare ya na kare. Aur ek baar shuru hone ke baad **cancel nahi** ho sakta. `async/await` syntax Promise pe hi chalta hai.

Observable se farak: Promise = ek value, turant chalta hai, cancel nahi, operators nahi. Observable = kai values, lazy, cancellable, rich operators. Angular apne APIs (HttpClient, forms, router) mein Observable use karta hai. Observable ko Promise mein badalna ho to `firstValueFrom()` / `lastValueFrom()` (purana `toPromise()` deprecated). Promise ko Observable mein: `from(promise)`.

| Promise | Observable |
|---|---|
| Ek value | 0, 1 ya kai values |
| Eager — turant chalta | Lazy — subscribe pe chalta |
| Cancel nahi | `unsubscribe` se cancel |
| `.then`, `async/await` | Operators: map, filter, switchMap… |
| JS built-in | RxJS library |

```typescript
const p = fetch('/api/users');          // request ABHI chali gayi
const data = await p.then(r => r.json());

const user = await firstValueFrom(this.http.get<User>('/api/me'));   // Observable → Promise
```

> Observable = stream + cancellable. Promise = single + non-cancellable.

## OnPush
**OnPush** ek change detection strategy hai jisme component **tabhi check** hota hai jab:
1. Uske kisi `@Input` ka **reference** badle (naya object/array)
2. Component ya uske child mein koi **DOM event** ho (click, input)
3. `async` pipe nayi value emit kare
4. Manually `ChangeDetectorRef.markForCheck()` bulaya jaaye
5. Template mein use hua koi **signal** badle

Default strategy mein har event pe poora tree check hota hai; OnPush se bade component trees mein kaafi performance bachti hai.

**Sabse bada trap — mutation**: agar parent ne array mein `push` kiya ya object ki property badli, to **reference same** raha, OnPush child ko lagta hai kuch nahi badla, aur **view update nahi hota**. Isliye OnPush ke saath **immutable updates** karo — spread operator se naya array/object. Isi wajah se OnPush, `async` pipe aur signals saath mein bahut achhe chalte hain.

```typescript
@Component({ selector: 'app-cart', changeDetection: ChangeDetectionStrategy.OnPush,
             template: `{{ items.length }} items` })
export class CartComponent { @Input() items: Item[] = []; }

// Parent
this.items.push(newItem);                 // GALAT — reference same, view nahi badlega
this.items = [...this.items, newItem];    // SAHI — naya reference

this.user.name = 'Ravi';                  // GALAT
this.user = { ...this.user, name: 'Ravi' };   // SAHI
```

> Object mutate karoge to view update nahi hoga — naya object banao.
