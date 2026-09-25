# Angular — forms, signals aur modern Angular

## Reactive form mein custom validator aur cross-field validation kaise likhoge?
**Validator** = ek function jo `AbstractControl` leta hai aur **`null` (valid)** ya **error object** (`{ weakPassword: true }`) lautata hai.

- **Field validator** — ek control pe: `Validators.required`, `minLength`, ya apna (PAN format, strong password).
- **Cross-field validator** — **FormGroup pe** lagao, taaki do fields compare kar sako (password = confirm password, end date > start date).
- **Async validator** — server se check (username/email already exists?). `Observable` lautata hai; `debounceTime` lagao aur `updateOn: 'blur'` socho, warna har keystroke pe API call.

Template mein error tab dikhao jab control **`touched` ya `dirty`** ho. `form.markAllAsTouched()` submit pe — saari errors ek saath dikh jaayein.

```typescript
export function strongPassword(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const v: string = c.value ?? '';
    const ok = /[A-Z]/.test(v) && /[0-9]/.test(v) && v.length >= 8;
    return ok ? null : { weakPassword: true };
  };
}

export const passwordsMatch: ValidatorFn = (g: AbstractControl) =>
  g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true };

form = this.fb.group({
  email:    ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, strongPassword()]],
  confirm:  ['', Validators.required],
}, { validators: passwordsMatch });
```

```html
<small *ngIf="form.controls.password.touched && form.controls.password.hasError('weakPassword')">
  8+ characters, ek capital aur ek number chahiye
</small>
<small *ngIf="form.hasError('mismatch') && form.controls.confirm.touched">Passwords match nahi karte</small>
```

## FormArray — dynamic fields (add/remove rows) kaise banate ho?
**`FormArray`** — controls/groups ki **list** jisme runtime pe items add/remove ho sakein. Use: invoice ke line items, kai phone numbers, dynamic questions, route ke stops.

- `this.fb.array([])` — khaali list
- `items.push(this.fb.group({...}))` — nayi row
- `items.removeAt(i)` — row hatao
- Template mein `formArrayName` + har row pe `[formGroupName]="i"`
- Poore array pe validator bhi laga sakte ho (kam se kam ek item).

Edit form mein: API se aaye data ke hisaab se utne groups push karo, phir `patchValue`.

```typescript
form = this.fb.group({
  customer: ['', Validators.required],
  items: this.fb.array([this.newItem()], Validators.minLength(1)),
});
get items() { return this.form.get('items') as FormArray; }
newItem() { return this.fb.group({ product: ['', Validators.required], qty: [1, [Validators.min(1)]] }); }
add() { this.items.push(this.newItem()); }
remove(i: number) { this.items.removeAt(i); }
```

```html
<div formArrayName="items">
  @for (row of items.controls; track row; let i = $index) {
    <div [formGroupName]="i">
      <input formControlName="product"> <input type="number" formControlName="qty">
      <button type="button" (click)="remove(i)">Hatao</button>
    </div>
  }
</div>
<button type="button" (click)="add()">Row jodo</button>
```

## Angular Signals kya hain aur RxJS se kaise alag hain?
**Signal** (Angular 16+) — ek **value ka reactive wrapper**: jab value badle, jo cheezein us signal ko padhti hain (template, `computed`, `effect`) wo **apne aap update**. Angular ko pata hota hai **exactly kya badla**, isliye change detection zyada targeted aur tez (aage chal ke Zone.js ke bina — "zoneless").

- **`signal(0)`** — writable. Padhna: `count()`. Likhna: `count.set(5)`, `count.update(c => c + 1)`.
- **`computed(() => ...)`** — doosre signals se nikli value, **memoized** (dependency badle tabhi dobara calculate).
- **`effect(() => ...)`** — side effect jab signals badlein (localStorage mein save, logging). State badalne ke liye effect kam use karo.
- **`input()` / `output()` / `model()`** — naye signal-based component inputs.

**Signals vs RxJS**:
- Signal = **hamesha ek current value** (state) — synchronous, subscribe/unsubscribe ki jhanjhat nahi. UI state ke liye.
- Observable = **time ke saath events ki stream** — HTTP, WebSocket, debounce, retry, `switchMap` jaise async flows ke liye abhi bhi best.
- Jodna: **`toSignal(obs$)`** (observable → signal, auto-unsubscribe) aur `toObservable(sig)`.

```typescript
export class CartComponent {
  items = signal<CartItem[]>([]);
  total = computed(() => this.items().reduce((s, i) => s + i.price * i.qty, 0));

  add(item: CartItem) { this.items.update(list => [...list, item]); }   // naya array — immutable

  constructor() {
    effect(() => localStorage.setItem('cart', JSON.stringify(this.items())));
  }

  private http = inject(HttpClient);
  products = toSignal(this.http.get<Product[]>('/api/products'), { initialValue: [] });
}
```

```html
<p>Total: {{ total() | currency:'INR' }}</p>
@for (p of products(); track p.id) { <button (click)="add(p)">{{ p.name }}</button> }
```

## Standalone components kya hain? NgModule ki zaroorat kyun khatam hui?
Pehle har component kisi **`NgModule`** ke `declarations` mein hona zaroori tha, aur modules ke imports/exports ka jaal banta tha. **Standalone components** (Angular 14+, **17+ mein default**) — component khud apni dependencies `imports: [...]` mein batata hai; module ki zaroorat nahi.

- `@Component({ standalone: true, imports: [CommonModule, RouterLink, ReactiveFormsModule], ... })` (Angular 19+ mein `standalone: true` default hai, likhna bhi nahi padta).
- App bootstrap: `bootstrapApplication(AppComponent, appConfig)`; providers `app.config.ts` mein — `provideRouter(routes)`, `provideHttpClient(withInterceptors([...]))`.
- **Lazy loading** seedha component ka: `loadComponent: () => import('./orders/orders.component').then(m => m.OrdersComponent)`.
- Interceptors bhi **functional** (`HttpInterceptorFn`), guards bhi functions (`CanActivateFn`).

Fayde: kam boilerplate, samajhna aasan (component dekh ke pata dependencies kya hain), better tree-shaking. Purane module-based projects ke saath mix ho sakte hain.

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};

// routes
export const routes: Routes = [
  { path: 'orders', canActivate: [authGuard],
    loadComponent: () => import('./orders/orders.component').then(m => m.OrdersComponent) },
];

export const authGuard: CanActivateFn = () =>
  inject(AuthService).isLoggedIn() || inject(Router).createUrlTree(['/login']);
```

## Naya control flow — @if, @for, @switch aur @defer
Angular 17 se template mein built-in **control flow blocks** — `*ngIf`/`*ngFor` directives ki jagah:

- **`@if (cond) { } @else if { } @else { }`** — `ng-template` ke jhanjhat ke bina else.
- **`@for (item of items; track item.id) { } @empty { }`** — **`track` zaroori** (purane `trackBy` jaisa, par ab bhool nahi sakte); `@empty` list khaali ho to. `$index`, `$first`, `$last` variables.
- **`@switch (value) { @case (...) { } @default { } }`**
- **`@defer`** — template ka hissa **lazy load**: `@defer (on viewport) { <heavy-chart/> } @placeholder { ... } @loading { ... }`. Triggers: `on viewport`, `on idle`, `on interaction`, `on timer(2s)`. Bhaari components (charts, maps) initial bundle se bahar — page tez.

Fayde: tez (built-in, directives nahi), type narrowing behtar, `CommonModule` import nahi karna padta. Migration ke liye CLI schematic: `ng generate @angular/core:control-flow`.

```html
@if (user(); as u) {
  <h2>Namaste, {{ u.name }}</h2>
} @else {
  <a routerLink="/login">Login</a>
}

@for (v of vehicles(); track v.id) {
  <app-vehicle-row [vehicle]="v" />
} @empty {
  <p>Koi vehicle nahi mila</p>
}

@defer (on viewport) {
  <app-live-map />
} @placeholder {
  <div class="map-skeleton"></div>
}
```

## Observable ko unsubscribe karne ke tareeke — takeUntilDestroyed, async pipe
Subscribe kiya aur component destroy hone pe unsubscribe nahi kiya → subscription zinda rehti hai: **memory leak**, aur purane component ka code chalta rehta hai (duplicate API calls, galat screen update). HTTP observables khud complete ho jaate hain, par **interval, valueChanges, WebSocket, store selects, router events** nahi.

Tareeke (achhe se bure ki taraf):
1. **`async` pipe** — template mein `data$ | async` — Angular khud subscribe/unsubscribe karta hai. Sabse saaf.
2. **`toSignal()`** — observable ko signal banao, auto cleanup.
3. **`takeUntilDestroyed()`** (Angular 16+) — `pipe(takeUntilDestroyed(this.destroyRef))`, constructor/injection context mein bina argument ke.
4. Purana: `takeUntil(this.destroy$)` + `ngOnDestroy` mein `destroy$.next()`.
5. Manual `subscription.unsubscribe()` ngOnDestroy mein — chhote cases ke liye theek, bahut saari subscriptions mein bhoolna aasan.

```typescript
export class TrackerComponent {
  private destroyRef = inject(DestroyRef);
  private live = inject(LiveService);

  positions$ = this.live.positions$;                      // template: positions$ | async

  constructor() {
    interval(30_000).pipe(takeUntilDestroyed())           // constructor mein — argument nahi
      .subscribe(() => this.refresh());
  }

  ngOnInit() {
    this.search.valueChanges.pipe(
      debounceTime(300), distinctUntilChanged(),
      switchMap(q => this.api.find(q)),
      takeUntilDestroyed(this.destroyRef)                 // bahar injection context — ref do
    ).subscribe(r => this.results = r);
  }
}
```

## Service + BehaviorSubject se simple state management
Har app ko NgRx nahi chahiye. Chhote/medium apps mein **service-based store** kaafi hai: ek `@Injectable({ providedIn: 'root' })` service jisme private **`BehaviorSubject`** (ya signal) state rakhta hai, aur bahar sirf **read-only observable** + methods dikhte hain.

Pattern:
- `private state = new BehaviorSubject<State>(initial)` — BehaviorSubject kyunki naye subscriber ko **current value turant** milti hai.
- `readonly state$ = this.state.asObservable()` — bahar se koi `.next()` na kar sake.
- Methods (`addItem`, `load`) state badalte hain — hamesha **naya object** (immutable update), taaki OnPush components update hon.
- Derived data `map` + `distinctUntilChanged`.

Signals ke saath aur aasan: private `signal`, public `asReadonly()` aur `computed`.

**NgRx kab**: bahut badi app, kai teams, complex shared state, time-travel debugging, effects ka strict structure chahiye. Warna overkill (bahut boilerplate).

```typescript
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);
  readonly total = computed(() => this._items().reduce((s, i) => s + i.price * i.qty, 0));

  add(item: CartItem) { this._items.update(l => [...l, item]); }
  remove(id: number) { this._items.update(l => l.filter(i => i.id !== id)); }
  clear() { this._items.set([]); }
}
```

## Angular mein lazy loading aur bundle size kaise kam karte ho?
Poori app ka JS ek saath load ho to pehla page slow. Tareeke:

- **Route-level lazy loading** — `loadComponent` / `loadChildren` — har feature ka code tabhi download jab user us route pe jaaye.
- **`@defer`** — page ke andar bhaari hisse (charts, maps, editors) baad mein.
- **Preloading strategy** — `withPreloading(PreloadAllModules)` — pehla page load hone ke baad baaki routes background mein download, taaki navigation tez.
- **Bundle analyze** — `ng build --stats-json` + `esbuild`/`webpack-bundle-analyzer` — kaunsi library bhaari hai (poora `lodash` / `moment` import to nahi kiya? → `lodash-es` specific imports, `date-fns`/`Intl`).
- **Production build** — AOT, minification, tree-shaking (default `ng build`).
- `budgets` in `angular.json` — bundle limit paar ho to build warning/error.
- Images: `NgOptimizedImage` (`ngSrc`) — lazy load, sahi size, priority hints.

```typescript
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'reports', loadChildren: () => import('./reports/reports.routes').then(m => m.REPORT_ROUTES) },
  { path: 'settings', loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent) },
];

// app.config.ts
provideRouter(routes, withPreloading(PreloadAllModules))
```
