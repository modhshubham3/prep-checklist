# Unit testing (.NET)

## Unit test, integration test aur end-to-end test mein farak
Teeno alag level pe code check karte hain — jitna upar jao, utna real par utna slow aur fragile:

| Type | Kya test karta hai | Dependencies | Speed |
| --- | --- | --- | --- |
| **Unit** | Ek class/method akele | Sab mock/fake (DB, HTTP, time) | Milliseconds, hazaaron tests |
| **Integration** | Kai hisse saath — API + DB, repository + asli DB | Asli ya container DB (Testcontainers), in-memory server | Seconds |
| **End-to-end (E2E) / system** | Poora app user ki tarah — UI se DB tak | Sab asli | Slow, kam tests |

**Test pyramid**: neeche bahut saare unit tests, beech mein kam integration, upar bahut kam E2E. Ulta (sirf E2E) = slow, flaky suite.

.NET mein integration test ke liye `WebApplicationFactory<Program>` — asli ASP.NET pipeline memory mein chalata hai, HTTP calls karke controllers + middleware + DB test hote hain.

> Unit = ek piece akela, fake dependencies ke saath. Integration = pieces ek saath asli wiring mein.

## xUnit basics — Fact, Theory, setup
.NET mein teen popular frameworks: **xUnit** (sabse common, .NET team khud use karti hai), NUnit, MSTest.

- **`[Fact]`** — ek test, bina parameters.
- **`[Theory]` + `[InlineData]`** — same test alag inputs ke saath (data-driven). `[MemberData]` / `[ClassData]` complex data ke liye.
- **Setup**: xUnit mein `[SetUp]` attribute nahi — **constructor** har test se pehle chalta hai (har test ke liye class ka naya instance), cleanup ke liye `IDisposable.Dispose`.
- **Shared expensive setup** (DB container) — `IClassFixture<T>` (ek class ke tests share karein) ya collection fixture.
- Async test: method `async Task` return kare.
- Chalana: `dotnet test`.

```csharp
public class CalculatorTests
{
    private readonly Calculator _calc = new();      // har test ke liye naya

    [Fact]
    public void Add_TwoNumbers_ReturnsSum()
    {
        Assert.Equal(5, _calc.Add(2, 3));
    }

    [Theory]
    [InlineData(10, 2, 5)]
    [InlineData(9, 3, 3)]
    [InlineData(-8, 2, -4)]
    public void Divide_ValidInputs_ReturnsQuotient(int a, int b, int expected)
    {
        Assert.Equal(expected, _calc.Divide(a, b));
    }

    [Fact]
    public void Divide_ByZero_Throws()
    {
        Assert.Throws<DivideByZeroException>(() => _calc.Divide(1, 0));
    }
}
```

## AAA pattern aur test naming
Har test teen hisson mein likho — padhne wale ko turant samajh aata hai:

- **Arrange** — objects, mocks, input tayyar karo.
- **Act** — sirf **ek** action — jo method test ho raha hai.
- **Assert** — result check karo.

**Naming convention**: `MethodName_Scenario_ExpectedResult` — `PlaceOrder_OutOfStock_ThrowsException`. Test fail ho to naam padh ke hi pata chal jaaye ki kya toota.

Achhe test ki properties (**FIRST**): **F**ast, **I**ndependent (ek test doosre pe depend nahi, order se farak nahi), **R**epeatable (har baar same result — `DateTime.Now`, random, network se bachao), **S**elf-validating (pass/fail khud bataye), **T**imely.

```csharp
[Fact]
public void ApplyDiscount_GoldCustomer_Gets10Percent()
{
    // Arrange
    var svc = new PricingService();
    var customer = new Customer { Tier = Tier.Gold };

    // Act
    var price = svc.ApplyDiscount(1000m, customer);

    // Assert
    Assert.Equal(900m, price);
}
```

## Moq se dependencies mock karna
Unit test mein class ki dependencies (repository, email sender, HTTP client) asli nahi chahiye — slow, unreliable, side effects. **Mock** ek fake object hai jiska behaviour tum set karte ho. Ye tabhi possible hai jab class **interface** pe depend kare aur **constructor injection** se mile — isliye DI testability ke liye zaroori hai.

**Moq** ke main kaam:
- **`Setup(...).Returns(...)` / `ReturnsAsync`** — method call hone pe kya lautaye (stub).
- **`Verify(..., Times.Once)`** — check karo ki method call hua (ya nahi hua).
- **`It.IsAny<T>()`, `It.Is<T>(x => ...)`** — argument matching.
- **`Throws` / `ThrowsAsync`** — error path test karne ke liye.

Terms: **Stub** = sirf data lautata hai (state check). **Mock** = interaction verify karte ho (kya call hua). **Fake** = halka working implementation (in-memory repository).

Kya mock nahi karna: jo class tum test kar rahe ho usi ko, aur simple value objects/DTOs. `DbContext` mock karna mushkil aur misleading — uske liye in-memory SQLite ya Testcontainers se integration test.

```csharp
public class OrderServiceTests
{
    private readonly Mock<IOrderRepository> _repo = new();
    private readonly Mock<IEmailSender> _email = new();
    private readonly OrderService _svc;

    public OrderServiceTests() => _svc = new OrderService(_repo.Object, _email.Object);

    [Fact]
    public async Task PlaceOrder_Valid_SavesAndSendsEmail()
    {
        _repo.Setup(r => r.GetStockAsync(42)).ReturnsAsync(10);

        await _svc.PlaceOrderAsync(productId: 42, qty: 2, email: "a@b.com");

        _repo.Verify(r => r.SaveAsync(It.Is<Order>(o => o.Qty == 2)), Times.Once);
        _email.Verify(e => e.SendAsync("a@b.com", It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task PlaceOrder_OutOfStock_ThrowsAndSendsNothing()
    {
        _repo.Setup(r => r.GetStockAsync(42)).ReturnsAsync(0);

        await Assert.ThrowsAsync<OutOfStockException>(() => _svc.PlaceOrderAsync(42, 2, "a@b.com"));
        _email.Verify(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }
}
```

## Kya test karna chahiye aur kya nahi
**Test karo:**
- **Business logic** — calculations, rules, validations, state changes (sabse zyada value yahin).
- **Edge cases** — null, khaali list, zero, negative, boundary values (limit se ek kam/zyada), bahut bada input.
- **Error paths** — exception sahi phenka, galat input reject hua.
- **Bugs** — har fix kiye bug ke liye ek test (regression dobara na aaye).

**Test mat karo (ya kam):**
- Framework ka kaam — EF Core save karta hai ya nahi, ASP.NET routing (Microsoft ne test kiya hai).
- Trivial getters/setters, auto-properties.
- Private methods seedha — public method ke through test ho jaate hain. Private ko test karne ka mann ho to shayad wo alag class honi chahiye.
- Implementation details — test "kya result aaya" check kare, "andar kaise hua" nahi; warna refactor pe tests tootenge.

**Code coverage**: kitna code tests ne chalaya (`coverlet`). 70–80% achha target, par **100% ka peecha mat karo** — coverage batata hai kya chala, ye nahi ki sahi check hua.

## Static, DateTime.Now aur HttpClient wala code test kaise karein
Aisi cheezein jo har baar alag result deti hain ya bahar jaati hain, unko **abstraction ke peeche** chhupao taaki test mein control kar sako:

- **`DateTime.Now`** — seedha use kiya to "subscription expired?" jaisa logic test karna impossible. .NET 8 mein **`TimeProvider`** inject karo (test mein `FakeTimeProvider`), ya apna `IClock` interface.
- **Static methods / static classes** — mock nahi ho sakte. Unko ek interface wali class mein wrap karo.
- **`HttpClient`** — `HttpMessageHandler` fake karo, ya typed client ke peeche interface rakho.
- **File system, environment, random** — same: interface ke peeche.

Ye design **Dependency Inversion** hi hai — testability uska side benefit.

```csharp
public class SubscriptionService(TimeProvider time)
{
    public bool IsExpired(DateTimeOffset expiry) => time.GetUtcNow() > expiry;
}

[Fact]
public void IsExpired_AfterExpiry_True()
{
    var fake = new FakeTimeProvider(new DateTimeOffset(2026, 1, 10, 0, 0, 0, TimeSpan.Zero));
    var svc = new SubscriptionService(fake);
    Assert.True(svc.IsExpired(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero)));
}
```

## API ka integration test — WebApplicationFactory
`Microsoft.AspNetCore.Mvc.Testing` package ka **`WebApplicationFactory<Program>`** poora app memory mein start karta hai (asli middleware, routing, DI, validation), aur ek `HttpClient` deta hai. Tum HTTP call karke status code aur response check karte ho — koi port/server nahi chahiye.

DB ke liye: `ConfigureWebHost` mein DbContext ko test DB se replace karo — **Testcontainers** (Docker mein asli PostgreSQL, sabse realistic) ya SQLite in-memory. EF InMemory provider se bacho — wo relational behaviour (constraints, transactions, SQL translation) nahi dikhata.

Top-level statements wale `Program.cs` mein test project ko class dikhane ke liye `public partial class Program { }` jodna padta hai.

```csharp
public class ProductsApiTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Get_UnknownId_Returns404()
    {
        var client = factory.CreateClient();
        var res = await client.GetAsync("/api/products/999999");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Post_InvalidBody_Returns400()
    {
        var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/products", new { Name = "", Price = -1 });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
```

## TDD kya hai
? TDD kya hai? Kya tum TDD follow karte ho?
**Test-Driven Development** — code likhne se **pehle** test likho. Cycle: **Red → Green → Refactor**:
1. **Red** — ek chhota failing test likho (feature abhi hai hi nahi).
2. **Green** — sirf itna code likho ki test pass ho jaaye (simplest).
3. **Refactor** — code saaf karo, tests green rehne chahiye.

Fayde: har code ke peeche test, design khud-ba-khud testable (DI, chhote methods), requirements pehle clear hoti hain. Nuksaan: shuru mein slow lagta hai, unclear/exploratory kaam mein mushkil.

Interview mein sach bolo — agar strict TDD nahi karte to: "Main business logic ke liye tests likhta hoon aur har bug fix ke saath regression test; strict TDD nahi, par critical logic mein test-first try karta hoon."

## Angular mein testing — Jasmine/Karma aur TestBed
Angular CLI default mein **Jasmine** (test syntax — `describe`, `it`, `expect`) aur **Karma** (browser mein chalata hai) deta tha; naye projects mein **Jest** ya Vitest bhi common. Files `*.spec.ts`.

- **`TestBed`** — test ke liye mini Angular module banata hai: component, providers configure karo.
- **Service test**: HTTP ke liye `provideHttpClientTesting()` + `HttpTestingController` — request expect karo aur fake response flush karo.
- **Component test**: `fixture = TestBed.createComponent(...)`, `fixture.detectChanges()`, phir DOM check (`fixture.nativeElement.querySelector`).
- Dependencies ko `jasmine.createSpyObj` se mock karo.

```typescript
describe('UserService', () => {
  let svc: UserService, http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  it('getUsers fetches /api/users', () => {
    svc.getUsers().subscribe(users => expect(users.length).toBe(1));
    http.expectOne('/api/users').flush([{ id: 1, name: 'A', email: 'a@x.com' }]);
    http.verify();                          // koi extra request nahi hui
  });
});
```
