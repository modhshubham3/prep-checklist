# Angular aur TypeScript — chhoote hue topics

## Angular app kaise start hoti hai — main.ts, AppModule / bootstrapApplication
? ng serve karne pe Angular app kaise start hoti hai? main.ts se pehla component screen pe aane tak kya hota hai?
**Ek line:** browser `index.html` load karta hai (usme `<app-root>`), build ki JS files aati hain, **`main.ts`** chalta hai jo app ko **bootstrap** karta hai — root component (`AppComponent`) banta hai, `<app-root>` ki jagah uska template render hota hai, phir router URL ke hisaab se baaki components.

| Purana (NgModule) | Naya (standalone, Angular 17+) |
| --- | --- |
| `main.ts` → `platformBrowserDynamic().bootstrapModule(AppModule)` | `main.ts` → `bootstrapApplication(AppComponent, appConfig)` |
| `AppModule` ke `bootstrap: [AppComponent]` | Providers `app.config.ts` mein (`provideRouter`, `provideHttpClient`) |

**NgModule ke parts** (purane projects mein poochhte hain):
- **declarations** — is module ke components/directives/pipes
- **imports** — doosre modules jinki cheezein chahiye (`FormsModule`, `HttpClientModule`, feature modules)
- **providers** — services
- **exports** — jo cheezein doosre modules use kar sakein
- **bootstrap** — root component (sirf AppModule mein)

**Feature module** = ek feature (Orders) ki cheezein ek jagah, aksar lazy loaded. **Shared module** = common components/pipes jo kai features mein chahiye (export karke). Standalone mein ye kaam component ke apne `imports` karte hain.

```typescript
// main.ts (standalone)
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor]))],
});

// main.ts (purana)
platformBrowserDynamic().bootstrapModule(AppModule);

@NgModule({
  declarations: [AppComponent, HeaderComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

> index.html (`<app-root>`) → main.ts → bootstrap → AppComponent → router.

## ViewChild vs ContentChild
? @ViewChild aur @ContentChild mein kya farak hai, aur ye kab available hote hain?
**Ek line:** **`@ViewChild`** = component ke **apne template** ka element/child component pakadna. **`@ContentChild`** = parent ne `<ng-content>` ke through jo cheez **andar bheji** (projected content) usko pakadna.

| | ViewChild | ContentChild |
| --- | --- | --- |
| Kahan se | Apne template se | Parent ke diye content se (`<my-card> yahan </my-card>`) |
| Kab milta | `ngAfterViewInit` | `ngAfterContentInit` |
| Kai | `@ViewChildren` (QueryList) | `@ContentChildren` |
| Naya signal version | `viewChild()` | `contentChild()` |

**Aise socho:** ViewChild = **apne ghar** ka furniture. ContentChild = **mehmaan jo saath laaya** (gift) — ghar tumhara, cheez unki.

```typescript
@Component({
  selector: 'app-card',
  template: `<div class="card"><input #search /><ng-content></ng-content></div>`,
})
export class CardComponent implements AfterViewInit, AfterContentInit {
  @ViewChild('search') search!: ElementRef<HTMLInputElement>;       // apna input
  @ContentChild(CardTitleComponent) title?: CardTitleComponent;     // parent ne bheja

  ngAfterViewInit() { this.search.nativeElement.focus(); }           // yahan ready
  ngAfterContentInit() { console.log(this.title); }
}
// Parent: <app-card><app-card-title>Orders</app-card-title></app-card>
```

! Constructor ya ngOnInit mein ViewChild use kiya → `undefined` (static: false ho to). View ban ke hi milta hai.

> ViewChild = apne template se. ContentChild = parent ke bheje (ng-content) se.

## ng-template vs ng-container vs ng-content
? ng-template, ng-container aur ng-content mein kya farak hai? Har ek kab use karoge?
**Ek line:** **`ng-container`** = invisible wrapper — DOM mein koi element nahi banata. **`ng-template`** = HTML ka **tukda jo abhi render nahi hota**, jab bulao tab. **`ng-content`** = parent ka diya content **yahan dikhao** (content projection / slot).

| | Kya karta | Example |
| --- | --- | --- |
| `ng-container` | Structural directive lagao bina extra `<div>` | Ek jagah do `*ngIf`/`*ngFor` |
| `ng-template` | Baad mein / conditionally render hone wala block | `*ngIf ... else loading`, reusable template, `ngTemplateOutlet` |
| `ng-content` | Parent ka HTML andar dikhao | Card, modal, layout components; `select` se kai slots |

**Aise socho:** ng-container = **transparent thaili** (cheezein saath rakhne ke liye, dikhti nahi). ng-template = **recipe card** (padhi rakhi hai, jab chaho tab banao). ng-content = **photo frame** — frame tumhara, photo parent ki.

```html
<!-- ng-container: extra div nahi -->
<ng-container *ngIf="user">
  <li *ngFor="let r of user.roles">{{ r }}</li>
</ng-container>

<!-- ng-template: else ke liye -->
<div *ngIf="orders; else loading">{{ orders.length }} orders</div>
<ng-template #loading><p>Loading…</p></ng-template>

<!-- ng-content: modal component ke andar -->
<div class="modal">
  <header><ng-content select="[modal-title]"></ng-content></header>
  <ng-content></ng-content>
</div>
<!-- use: <app-modal><h2 modal-title>Delete?</h2><p>Pakka?</p></app-modal> -->
```

> ng-container = invisible wrapper. ng-template = baad mein render. ng-content = parent ka content yahan.

## @HostListener, @HostBinding aur custom directive
? Custom attribute directive kaise banaoge — jaise hover pe highlight? @HostListener aur @HostBinding kya karte hain?
**Ek line:** **directive** = kisi existing element pe **behaviour jodna** (template nahi). **`@HostListener`** = jis element pe directive laga hai uske **events suno** (click, mouseenter, window resize). **`@HostBinding`** = us element ki **property/class/style** bind karo.

- Attribute directive: `@Directive({ selector: '[appHighlight]' })` → `<p appHighlight>`.
- `@Input` se directive ko value do: `<p [appHighlight]="'yellow'">`.
- Naye Angular mein `host: { '(mouseenter)': 'on()', '[class.active]': 'isActive' }` metadata bhi.
- Use cases: auto-focus, click-outside band karna, permission ke hisaab se element hide (`*appHasRole`), number-only input, tooltip.

```typescript
@Directive({ selector: '[appHighlight]', standalone: true })
export class HighlightDirective {
  @Input('appHighlight') color = 'yellow';
  @HostBinding('style.backgroundColor') bg = '';
  @HostBinding('class.hovered') hovered = false;

  @HostListener('mouseenter') onEnter() { this.bg = this.color; this.hovered = true; }
  @HostListener('mouseleave') onLeave() { this.bg = ''; this.hovered = false; }
  @HostListener('document:keydown.escape') onEsc() { this.bg = ''; }   // global event
}
// <p [appHighlight]="'lightblue'">Hover karo</p>
```

> Directive = behaviour jodo. HostListener = events suno. HostBinding = property/class set karo.

## Renderer2 — direct DOM access kyun nahi
? Angular mein DOM badalne ke liye nativeElement seedha use karna chahiye ya Renderer2? Kyun?
**Ek line:** **Renderer2** = Angular ka **safe tareeka** DOM badalne ka (`addClass`, `setStyle`, `listen`, `createElement`). `elementRef.nativeElement.style...` seedha chal jaata hai, par **server-side rendering / web workers** mein DOM hota hi nahi, aur `innerHTML` jaisa kaam **XSS** khol deta hai.

| | `nativeElement` seedha | Renderer2 |
| --- | --- | --- |
| Browser mein | ✅ Chalta | ✅ |
| SSR (server pe DOM nahi) | ❌ Crash | ✅ |
| Security | `innerHTML` se XSS risk | Angular ke rules ke andar |
| Test | Mushkil | Mock ho sakta |

Sabse pehle koshish: **template binding** (`[class.x]`, `[style.color]`, `(click)`) — wahi best hai. Renderer2 tab jab dynamic element banana/listener lagana ho (directive mein).

```typescript
@Directive({ selector: '[appAutoBadge]', standalone: true })
export class AutoBadgeDirective implements OnInit {
  private el = inject(ElementRef);
  private r = inject(Renderer2);
  ngOnInit() {
    const badge = this.r.createElement('span');
    this.r.addClass(badge, 'badge');
    this.r.appendChild(badge, this.r.createText('NEW'));
    this.r.appendChild(this.el.nativeElement, badge);
    this.r.listen(this.el.nativeElement, 'click', () => this.r.setStyle(badge, 'display', 'none'));
  }
}
```

> Pehle binding. DOM khud badalna ho to Renderer2 — SSR-safe aur XSS se door.

## ChangeDetectorRef — markForCheck vs detectChanges
? OnPush component mein data badla par screen update nahi hui — markForCheck aur detectChanges mein se kya use karoge?
**Ek line:** **`markForCheck()`** = "ye component (aur uske parents) **agli change detection mein check karna**" — schedule karta hai. **`detectChanges()`** = "**abhi turant** is component aur uske children ko check karo" — synchronous.

| | markForCheck | detectChanges | detach / reattach |
| --- | --- | --- | --- |
| Kab chalta | Agle CD cycle mein | Turant | CD band/chalu |
| Kiske liye | OnPush component jisme data bahar se (subscribe/setTimeout) badla | Zone ke bahar kaam, ya turant update chahiye | Bahut frequent updates (live chart) — khud control |
| Upar ke parents | ✅ Mark karta hai | ❌ Sirf yahan se neeche | — |

Zyada tar cases mein zaroorat hi nahi — **`async` pipe** aur **signals** khud mark kar dete hain. `ChangeDetectorRef` tab jab manual `subscribe` karke OnPush component mein field badli.

```typescript
@Component({ selector: 'app-live', changeDetection: ChangeDetectionStrategy.OnPush, template: `{{ price }}` })
export class LiveComponent {
  price = 0;
  private cdr = inject(ChangeDetectorRef);
  constructor(feed: PriceFeed) {
    feed.prices$.pipe(takeUntilDestroyed()).subscribe(p => {
      this.price = p;
      this.cdr.markForCheck();        // OnPush ko batao ki check karna hai
    });
  }
}
```

> markForCheck = "agli baar check karna". detectChanges = "abhi check karo". Pehle async pipe / signals try karo.

## Pipes — pure vs impure aur custom pipe
? Custom pipe kaise banate ho? Pure aur impure pipe mein kya farak hai, aur impure kyun mehenga hai?
**Ek line:** **pipe** = template mein value ko **display ke liye transform** karna (`date`, `currency`, `uppercase`, `async`). **Pure** (default) = sirf tab chalta hai jab **input ka reference badle** — tez. **Impure** = **har change detection** pe chalta hai — mehenga.

| | Pure (default) | Impure (`pure: false`) |
| --- | --- | --- |
| Kab chalta | Input value/reference badla | Har CD cycle (har click, har keystroke) |
| Array mein push kiya | ❌ Nahi dikhega (reference same) | ✅ Dikhega |
| Speed | Tez, result cache jaisa | Slow ho sakta |
| Example | `date`, `currency`, custom format | `async` pipe (andar se), filter-on-mutable-array |

Pure pipe + array mein push karke update chahiye → **naya array** banao (`[...list, item]`), impure mat banao.

```typescript
@Pipe({ name: 'initials', standalone: true })          // pure by default
export class InitialsPipe implements PipeTransform {
  transform(name: string | null, max = 2): string {
    return (name ?? '').split(' ').filter(Boolean).slice(0, max).map(w => w[0].toUpperCase()).join('');
  }
}
// {{ 'Asha Ravi Sharma' | initials }}      → AR
// {{ 'Asha Ravi Sharma' | initials:3 }}    → ARS
```

! Template mein method call `{{ getTotal() }}` — har CD pe chalta hai (impure jaisa). Pure pipe ya computed signal better.

> Pure = input badle tab (tez). Impure = har baar (mehenga). Array badlo to naya array do.

## Hierarchical injector — providedIn root vs component providers, InjectionToken
? providedIn: 'root' ka matlab kya hai? Component ke providers mein service daalne se kya badalta hai? InjectionToken kab chahiye?
**Ek line:** Angular mein injectors ek **tree** hain — root (poori app) → route/module → component. Service jis level pe provide ho, **wahan ek instance** banta hai aur us level ke neeche sab ko wahi milta hai.

| Kahan provide | Kitne instance | Kab |
| --- | --- | --- |
| `@Injectable({ providedIn: 'root' })` | **Poori app mein ek** (singleton), tree-shakable | 90% services — API, auth, state |
| Route `providers: [...]` | Us route (lazy feature) ke liye ek | Feature-level state |
| Component `providers: [X]` | **Har component instance ka apna** | Har form/widget ki alag state |

Dhundhne ka order: component ka injector → parent component → … → root. Na mila to error (`NullInjectorError`).

**`InjectionToken`** = jab inject karni cheez **class nahi** (string, config object, function) — uske liye ek token banao.

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {}                          // app-wide ek

@Component({
  selector: 'app-order-form',
  providers: [OrderFormState],                       // har form ka apna state
  template: `...`,
})
export class OrderFormComponent { state = inject(OrderFormState); }

export const API_URL = new InjectionToken<string>('API_URL');
// app.config.ts: providers: [{ provide: API_URL, useValue: environment.apiUrl }]
export class ApiService { private base = inject(API_URL); }
```

> root = app mein ek. Component providers = har component ka apna. Class nahi to InjectionToken.

## ViewEncapsulation — Emulated, ShadowDom, None
? Angular component ki CSS doosre components pe kyun nahi lagti? ViewEncapsulation ke teen modes kya hain?
**Ek line:** **ViewEncapsulation** decide karta hai component ki CSS **kitni bahar** jaayegi. Default **Emulated** — Angular har element pe unique attribute (`_ngcontent-abc`) laga ke CSS ko **sirf usi component** tak rakhta hai.

| Mode | Kaise | CSS bahar jaati? |
| --- | --- | --- |
| `Emulated` (default) | Unique attributes se scope | ❌ |
| `ShadowDom` | Browser ka asli Shadow DOM | ❌ (aur global CSS andar bhi nahi aati) |
| `None` | Koi scope nahi | ✅ **Global** — poori app pe lagegi |

Child component ki styling parent se badalni ho: `::ng-deep` (deprecated par abhi bhi chalta hai), `:host` / `:host-context` selectors, ya **CSS variables** (best — child `var(--btn-color)` use kare, parent set kare).

```typescript
@Component({
  selector: 'app-badge',
  template: `<span class="badge"><ng-content /></span>`,
  styles: [`
    :host { display: inline-block; }                 /* component ka apna tag */
    .badge { background: var(--badge-bg, #4f6bed); color: #fff; }
  `],
  encapsulation: ViewEncapsulation.Emulated,         // default
})
export class BadgeComponent {}
```

> Emulated (default) = CSS component tak. None = global. Bahar se style karna → CSS variables.

## Routing — route params, query params aur router events
? URL se id kaise padhoge? Route params aur query params mein farak, aur route change pe loader kaise dikhaoge?
**Ek line:** **route param** = URL path ka hissa (`/orders/42` → `id = 42`) — resource pehchaan. **Query param** = `?page=2&sort=date` — optional filters. `ActivatedRoute` se dono padho; **observable** se padho taaki same component mein URL badle to bhi update ho.

- `routerLink="/orders/{{id}}"` / `[routerLink]="['/orders', id]" [queryParams]="{ page: 2 }"`.
- Code se: `router.navigate(['/orders', id], { queryParams: { tab: 'items' } })`.
- **Snapshot** (`route.snapshot.paramMap.get('id')`) ek baar padhta hai — `/orders/1` se `/orders/2` pe same component reuse ho to update nahi hoga. **`paramMap` observable** use karo (ya `withComponentInputBinding()` se `@Input() id`).
- **Router events**: `NavigationStart` → `NavigationEnd` / `NavigationCancel` / `NavigationError` — global loader, analytics, scroll.

```typescript
export class OrderDetailComponent {
  private route = inject(ActivatedRoute);
  private api = inject(OrderService);
  order$ = this.route.paramMap.pipe(
    map(p => Number(p.get('id'))),
    switchMap(id => this.api.get(id))                     // /orders/1 → /orders/2 pe bhi chalega
  );
  page$ = this.route.queryParamMap.pipe(map(q => Number(q.get('page') ?? 1)));
}

// Global loader
inject(Router).events.pipe(filter(e => e instanceof NavigationStart || e instanceof NavigationEnd))
  .subscribe(e => loading.set(e instanceof NavigationStart));
```

> Path param = kaunsa resource. Query param = filter/page. Snapshot nahi, observable padho.

## environment.ts — environment-based config
? Angular app mein dev aur prod ke alag API URL kaise rakhte ho?
**Ek line:** `src/environments/environment.ts` (dev) aur `environment.prod.ts` (prod) mein config objects; `angular.json` ki **`fileReplacements`** production build mein file badal deti hai. Code hamesha `environment` import karta hai.

- **Secrets yahan kabhi nahi** — ye sab browser ki JS mein chala jaata hai, koi bhi padh sakta hai. Sirf public config (API URL, feature flags).
- Ek hi build ko kai environments pe deploy karna ho (Docker) to build-time file ki jagah **runtime config**: app start pe `/assets/config.json` fetch (APP_INITIALIZER / `provideAppInitializer`).

```typescript
// environment.ts
export const environment = { production: false, apiUrl: 'http://localhost:5000/api' };
// environment.prod.ts
export const environment = { production: true, apiUrl: 'https://api.example.com/api' };

// angular.json → configurations.production.fileReplacements:
// [{ "replace": "src/environments/environment.ts", "with": "src/environments/environment.prod.ts" }]

this.http.get(`${environment.apiUrl}/orders`);
```

> environment.ts = public config per environment. Secrets kabhi nahi — ye browser mein dikhta hai.

## TypeScript — types, interface vs type, generics, enum aur access modifiers
? TypeScript mein interface aur type alias mein kya farak hai? Generics aur access modifiers kaise kaam karte hain?
**Ek line:** TypeScript = **JavaScript + types**, compile pe JS ban jaata hai (types gayab). **interface** aur **type** dono object ka shape batate hain; interface **extend/merge** ho sakta hai, type **union/intersection** jaisi cheezein kar sakta hai.

| | `interface` | `type` |
| --- | --- | --- |
| Object shape | ✅ | ✅ |
| Union (`'Active'` ya `'Blocked'`) | ❌ | ✅ |
| Extend | `extends` | `&` (intersection) |
| Declaration merging | ✅ (do baar likho, jud jaata) | ❌ |
| Kab | Objects, classes implement karein | Unions, utility types, functions |

- **Generics**: `function first<T>(arr: T[]): T` — type safe reusable (`Observable<User[]>`).
- **Enum**: `enum Status { Active, Blocked }` — ya aaj kal **string union** `type Status = 'Active' | 'Blocked'` (JS mein kuch extra nahi banta).
- **Access modifiers**: `public` (default), `private`, `protected`, `readonly` — **sirf compile time** check; runtime JS mein sab dikhta hai. Asli private: `#field`.
- Utility types: `Partial<T>`, `Pick<T, 'id'>`, `Omit<T, 'password'>`, `Record<string, number>`.
- `any` (check band) vs **`unknown`** (use se pehle check karo) — `unknown` prefer karo.

```typescript
interface User { id: number; name: string; email?: string }        // ? = optional
type Status = 'Active' | 'Blocked';                                  // union
type UserWithStatus = User & { status: Status };

function first<T>(items: T[]): T | undefined { return items[0]; }
const u = first<User>([{ id: 1, name: 'Asha' }]);

class AccountService {
  private cache = new Map<number, User>();       // compile-time private
  #secret = 'x';                                  // runtime bhi private
  constructor(private readonly http: HttpClient) {}   // parameter property
}

type UserForm = Omit<User, 'id'>;                // id ke bina
const patch: Partial<User> = { name: 'Ravi' };   // saare optional
```

> interface = object shape (extend). type = unions bhi. TS ke access modifiers sirf compile time.

## Dynamic component load karna
? Runtime pe decide ho ki kaunsa component dikhana hai (jaise dashboard widgets config se) — kaise karoge?
**Ek line:** component ko template mein pehle se likhne ki jagah **code se create** karna — `ViewContainerRef.createComponent(Type)` ya template mein **`*ngComponentOutlet`**. Use: dashboard widgets, dialogs/modals, plugin-style UI, config se forms.

- Standalone components ke saath `entryComponents` / factory ki zaroorat nahi (purane Angular mein thi).
- Inputs: `ref.setInput('title', 'Sales')`.
- Lazy: `const { ChartComponent } = await import('./chart.component')` phir create — code bhi tabhi download.
- Band karte waqt `ref.destroy()` / container `clear()`.

```typescript
@Component({
  selector: 'app-dashboard',
  template: `<ng-container #host></ng-container>
             <ng-container *ngComponentOutlet="widget; inputs: { title: 'Orders' }"></ng-container>`,
})
export class DashboardComponent implements AfterViewInit {
  @ViewChild('host', { read: ViewContainerRef }) host!: ViewContainerRef;
  widget = OrdersWidgetComponent;

  async ngAfterViewInit() {
    const { SalesChartComponent } = await import('./sales-chart.component');   // lazy
    const ref = this.host.createComponent(SalesChartComponent);
    ref.setInput('range', 'last-30-days');
  }
}
```

> Runtime pe component → ViewContainerRef.createComponent ya *ngComponentOutlet. Lazy import se code bhi baad mein.

## Angular SSR (Server-Side Rendering) — basic idea
? Angular Universal / SSR kya hai aur kab chahiye? Hydration kya hota hai?
**Ek line:** normal Angular (**CSR**) mein browser ko pehle khaali HTML milta hai, JS download hoke page banata hai. **SSR** mein **server pe hi page ka HTML ban ke** aata hai — user ko turant content dikhta hai, aur search engines ko poora HTML milta hai. Phir browser mein Angular us HTML ko "zinda" karta hai — **hydration**.

| | CSR (default) | SSR | Prerender (SSG) |
| --- | --- | --- | --- |
| HTML kahan bana | Browser | Har request pe server | Build time pe |
| First paint | Slow (JS ke baad) | ✅ Tez | ✅ Sabse tez |
| SEO / social previews | Kamzor | ✅ | ✅ |
| Server chahiye | ❌ Static hosting | ✅ Node server | ❌ |
| Kab | Internal dashboards, login ke peeche apps | Public pages, e-commerce, blogs | Marketing / docs pages |

`ng add @angular/ssr` (Angular 17+). Dhyan: server pe `window`, `document`, `localStorage` nahi hote — `isPlatformBrowser` / `afterNextRender` se guard karo; direct DOM ki jagah Renderer2.

> SSR = server pe HTML bana ke bhejo (tez first load, SEO). Hydration = browser mein usko zinda karna. Internal apps ko aam taur pe zaroorat nahi.

## Angular CLI ke roz ke commands
? Angular CLI ke kaunse commands roz use karte ho? Production build aur component generate kaise karte ho?
**Ek line:** Angular CLI (`ng`) = project banana, chalana, code generate, test aur build — sab ek tool se.

| Command | Kaam |
| --- | --- |
| `ng new my-app` | Naya project |
| `ng serve` / `ng serve -o --port 4300` | Dev server (live reload) |
| `ng g c orders/order-list` | Component generate (`g` = generate, `c` = component) |
| `ng g s services/order` / `ng g p` / `ng g d` / `ng g guard` / `ng g interceptor` | Service / pipe / directive / guard / interceptor |
| `ng build` | Production build (default config production, `dist/` mein) |
| `ng build --configuration development` | Dev build |
| `ng test` / `ng e2e` | Unit / end-to-end tests |
| `ng lint` | Lint |
| `ng add @angular/material` | Library + setup ek saath |
| `ng update @angular/core @angular/cli` | Version upgrade (migrations ke saath) |
| `ng generate @angular/core:control-flow` | Purane `*ngIf` → `@if` migrate |

```bash
ng new shop --routing --style=scss
ng g c features/orders/order-list
ng build --configuration production
```

> ng new, ng serve, ng g (c/s/p/d/guard), ng build, ng test, ng update.

## forkJoin vs combineLatest vs zip
? Page load pe teen APIs ek saath call karni hain aur teeno ka result ek saath chahiye — forkJoin loge ya combineLatest? Farak?
**Ek line:** **`forkJoin`** = sab observables **complete** hone ka wait, phir **har ek ki aakhri value ek saath** (Promise.all jaisa) — HTTP calls ke liye. **`combineLatest`** = sab ne **kam se kam ek baar** emit kiya ho to shuru, phir **kisi ke bhi badalne pe** latest values ka combination — live filters/state ke liye.

| | forkJoin | combineLatest | zip |
| --- | --- | --- | --- |
| Kab emit | Sab complete hone pe, **ek baar** | Har baar koi bhi badle (sab ke pehle emit ke baad) | Jodi-jodi — sabka pehla, phir sabka doosra |
| Complete na ho (interval, form) | ❌ Kabhi emit nahi | ✅ | ✅ |
| Use | Parallel HTTP calls | Filters + data, form fields mila ke | Kam — order wale pairs |

Ek fail to forkJoin **poora fail** — har call pe `catchError(() => of(null))` lagao agar baaki chahiye.

```typescript
// Page load: teen calls saath
forkJoin({
  user: this.api.getUser(),
  orders: this.api.getOrders().pipe(catchError(() => of([]))),   // ek fail ho to baaki bache
  stats: this.api.getStats(),
}).subscribe(({ user, orders, stats }) => { /* sab ek saath */ });

// Live: filter badle to list update
combineLatest([this.search.valueChanges.pipe(startWith('')), this.status$])
  .pipe(switchMap(([q, status]) => this.api.find(q, status)))
  .subscribe(r => this.results = r);
```

> Parallel HTTP, sab ek baar → forkJoin. Live values mila ke har badlav pe → combineLatest.
