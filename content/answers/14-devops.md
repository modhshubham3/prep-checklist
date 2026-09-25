# Git aur team workflow

## git merge vs git rebase
Dono ek branch ke changes doosri mein laate hain, par history alag banti hai:

| | merge | rebase |
| --- | --- | --- |
| Kaise | Ek naya **merge commit** jo dono branches jodta hai | Tumhare commits ko target branch ke **upar dobara** apply karta hai (naye commit IDs) |
| History | Sachchi, par branches ki wajah se uljhi | **Seedhi line**, saaf |
| Safe? | Haan, history nahi badalti | History rewrite — **shared branch pe khatarnak** |

**Golden rule**: jo branch doosre log use kar rahe hain (`main`, `develop`, pushed shared branch), usko **rebase mat karo** — unki history toot jaayegi. Apni local/feature branch ko `main` ke upar rebase karna theek hai (PR se pehle saaf karne ke liye).

Common flow: feature branch pe `git fetch` + `git rebase origin/main` (latest main ke upar), phir PR — PR **squash merge** ya merge commit se main mein.

```bash
git checkout feature/login
git fetch origin
git rebase origin/main          # conflicts aaye to fix → git add → git rebase --continue
git push --force-with-lease     # rebase ke baad force chahiye; --force-with-lease safer hai
```

! `git push --force` shared branch pe — doosron ke commits mit sakte hain. Hamesha `--force-with-lease` aur sirf apni branch pe.

## Merge conflict kaise resolve karte ho
Conflict tab aata hai jab **dono branches ne same file ki same lines** badli hon, aur Git decide nahi kar sakta kaunsa rakhe.

Steps:
1. `git status` — kaunsi files conflicted hain.
2. File kholo — markers dikhenge: `<<<<<<< HEAD` (tumhara), `=======`, `>>>>>>> branch` (unka).
3. **Samajh ke** decide karo — tumhara, unka, ya dono ko mila ke. Sirf "mera wala rakh lo" mat karo — doosre ka kaam kho sakta hai; zaroorat ho to us developer se baat karo.
4. Markers hatao, file save, **build + tests chalao**.
5. `git add file` → `git commit` (merge) ya `git rebase --continue` (rebase).

Galti ho gayi to: `git merge --abort` / `git rebase --abort` se wapas shuru. VS Code / Visual Studio / Rider mein 3-way merge editor aasan hai.

Kam conflicts ke liye: chhote PRs, `main` se aksar sync, formatting tools (sab same format).

## git reset vs git revert
Dono changes "undo" karte hain, par bilkul alag tareeke se:

**`git revert <commit>`** — ek **naya commit** banata hai jo us commit ke changes ulat deta hai. History safe rehti hai. **Pushed/shared commits ke liye yahi** (production bug fix karne ke liye revert).

**`git reset`** — branch pointer ko **peeche** le jaata hai, commits history se hat jaate hain. Sirf **local, unpushed** commits pe.
  - `--soft` — commits hatao, changes **staged** rahein.
  - `--mixed` (default) — commits hatao, changes working directory mein (unstaged).
  - `--hard` — commits aur changes **dono gayab**. Khatarnak.

Galti se `reset --hard` kar diya? **`git reflog`** — HEAD ki har movement ka record; purana commit ID milke `git reset --hard <id>` se wapas.

```bash
git revert a1b2c3d                # pushed commit ko safely undo
git reset --soft HEAD~1           # last local commit hatao, changes rakho
git reset --hard HEAD~1           # last commit + changes sab gayab
git reflog                        # "kho gaye" commits dhoondho
```

## git stash, cherry-pick, aur kuch kaam ke commands
**`git stash`** — adhoora kaam temporarily side mein rakho (commit kiye bina), branch switch karo, wapas aake `git stash pop`. Example: feature pe kaam chal raha hai aur urgent bug fix karna hai.

**`git cherry-pick <commit>`** — kisi doosri branch ka **ek specific commit** apni branch pe laao. Example: `develop` pe hua hotfix `release` branch pe bhi chahiye.

Aur kaam ke:
- `git log --oneline --graph --all` — history visual.
- `git diff` (unstaged), `git diff --staged` (staged).
- `git blame file` — har line kisne kab badli.
- `git bisect` — binary search se wo commit dhoondho jisne bug laaya.
- `git commit --amend` — last commit ka message/files theek karo (sirf unpushed).
- `git fetch` (sirf download) vs `git pull` (fetch + merge).
- `.gitignore` — `bin/`, `obj/`, `node_modules/`, secrets kabhi commit na hon.

```bash
git stash push -m "wip login"     # kaam side mein
git checkout hotfix/crash
# ... fix, commit ...
git checkout feature/login
git stash pop                     # kaam wapas

git cherry-pick 9f8e7d6           # ek commit laao
```

## Branching strategy aur PR / code review flow
**Git Flow** — `main` (production), `develop` (integration), `feature/*`, `release/*`, `hotfix/*`. Structured, scheduled releases ke liye; par branches zyada, merge overhead.

**GitHub Flow / trunk-based** — sirf `main` + chhoti feature branches, PR se jaldi merge, `main` hamesha deployable, CI/CD har merge pe. Modern teams mein zyada common; feature flags ke saath adhoora kaam chhupaate hain.

**PR flow** (jo interview mein bolna hai):
1. `main` se feature branch (`feature/ABC-123-order-export` — ticket ID ke saath).
2. Chhote, meaningful commits.
3. Push → **Pull Request** — description mein kya/kyun, screenshots, test steps.
4. **CI** chalti hai — build, tests, lint.
5. **Code review** — 1–2 reviewers; comments address karo.
6. Approve → merge (aksar squash) → branch delete → deploy.

**Achha code review kya dekhta hai**: correctness, edge cases, security, performance (N+1), readability/naming, tests hain ya nahi. Review mein tone respectful — "ye aise karein to?" code pe comment, insaan pe nahi.

## Agile, Scrum aur SDLC
**SDLC** (Software Development Life Cycle) — requirement → design → development → testing → deployment → maintenance. **Waterfall** mein ye ek ke baad ek (badlav mushkil); **Agile** mein chhote cycles mein baar-baar.

**Agile** — chhote iterations mein working software, customer feedback, badlav ko accept karna.

**Scrum** (Agile ka ek framework):
- **Sprint** — 1–4 hafte (aam taur pe 2) ka fixed cycle.
- **Roles**: **Product Owner** (kya banana hai, backlog priority), **Scrum Master** (process, rukaavatein hatana), **Development Team**.
- **Ceremonies**: **Sprint Planning** (sprint mein kya lenge), **Daily Standup** (15 min — kal kya kiya, aaj kya karunga, koi blocker?), **Sprint Review** (demo), **Retrospective** (kya achha gaya, kya sudhaarein).
- **Artifacts**: Product Backlog, Sprint Backlog, Increment.
- **User story** — "As a [user], I want [X] so that [Y]" + acceptance criteria. **Story points** — effort ka relative estimate (Fibonacci 1, 2, 3, 5, 8), ghante nahi.
- **Velocity** — team ek sprint mein kitne points karti hai.

**Kanban** — sprints nahi, continuous flow, board (To Do → In Progress → Done) aur **WIP limit**. Support/ops teams ke liye achha.

**JIRA** — tickets (Epic → Story → Task/Sub-task, Bug), sprint board, workflow status. Commit/branch mein ticket ID daalne se JIRA link ho jaata hai.

# Docker aur containers

## Container vs Virtual Machine
| | Virtual Machine | Container |
| --- | --- | --- |
| Kya virtualize | **Hardware** — har VM ka apna poora OS (kernel) | **OS** — host ka kernel share, sirf app + libraries |
| Size | GBs | MBs |
| Start time | Minutes | Seconds / milliseconds |
| Isolation | Mazboot (alag kernel) | Halka (process level — namespaces, cgroups) |
| Density | Ek server pe kam | Ek server pe bahut saare |

Container Linux ke **namespaces** (alag process tree, network, filesystem view) aur **cgroups** (CPU/memory limit) se bante hain — "halka VM" nahi, balki isolated process.

Fayda: "mere machine pe chalta hai" khatam — same image dev, test, prod mein. Consistent, fast deploy, microservices ke liye perfect.

## Docker image vs container, aur Dockerfile
**Image** — read-only template (class jaisa): OS base + runtime + tumhara app + config. **Layers** mein bani hoti hai; har Dockerfile instruction ek layer, aur layers cache hoti hain.

**Container** — image ka **running instance** (object jaisa). Ek image se bahut saare containers. Container ke andar likha data container hatate hi gayab (jab tak volume na ho).

**Multi-stage Dockerfile** (.NET ke liye standard): pehle stage mein **SDK** image se build/publish, doosre mein sirf chhoti **runtime** image mein output copy. Final image chhoti aur safe (compiler/source nahi).

Layer caching trick: pehle sirf `.csproj` copy karke `dotnet restore`, phir baaki code — code badalne pe restore dobara nahi chalta.

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore                      # cache: csproj na badle to dobara nahi
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
USER app                                # root nahi
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApi.dll"]
```

## Docker ke common commands
```bash
docker build -t myapi:1.0 .             # image banao
docker images                           # images list
docker run -d -p 8080:8080 --name api -e ASPNETCORE_ENVIRONMENT=Production myapi:1.0
docker ps                               # chal rahe containers (-a = sab)
docker logs -f api                      # logs live
docker exec -it api /bin/bash           # container ke andar shell
docker stop api && docker rm api
docker stats                            # CPU/memory per container
docker system prune                     # bekaar images/containers saaf
```

Flags yaad rakho: `-d` background, `-p host:container` port map, `-e` env var, `-v` volume, `--name`, `--restart unless-stopped`, `-m 512m` memory limit.

Memory limit ke bina container host ki poori memory dekh sakta hai — .NET GC us hisaab se heap badhata hai; bahut saare containers ho to host OOM. Isliye production mein **`-m` / `mem_limit`** hamesha lagao.

## Docker Compose aur volumes
**Docker Compose** — multi-container app ek YAML file (`docker-compose.yml`) mein define: API + PostgreSQL + Redis, networks, env vars, volumes. `docker compose up -d` se sab ek saath.

Compose mein services ek network pe hoti hain aur **service naam se** ek doosre ko dhoondhti hain — connection string mein `Host=db`, `localhost` nahi (container ke andar localhost = wahi container).

**Volumes** — container ka data container ke bahar persist karna (DB data container delete hone pe na jaaye):
- **Named volume** — Docker manage karta hai (`pgdata:/var/lib/postgresql/data`). DB ke liye.
- **Bind mount** — host ka folder (`./config:/app/config`). Config, dev mein live code.

`depends_on` sirf start **order** deta hai, ye guarantee nahi ki DB ready hai — `healthcheck` + `condition: service_healthy` ya app mein retry.

```yaml
services:
  api:
    build: .
    ports: ["8080:8080"]
    environment:
      ConnectionStrings__Db: "Host=db;Database=app;Username=app;Password=${DB_PASSWORD}"
    depends_on:
      db: { condition: service_healthy }
    mem_limit: 512m
  db:
    image: postgres:16
    environment: { POSTGRES_USER: app, POSTGRES_PASSWORD: "${DB_PASSWORD}", POSTGRES_DB: app }
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck: { test: ["CMD", "pg_isready", "-U", "app"], interval: 5s, retries: 10 }
volumes:
  pgdata:
```

## Kubernetes basics — kya hai aur kab chahiye
Docker ek machine pe containers chalata hai. **Kubernetes (K8s)** bahut saari machines pe containers ko **orchestrate** karta hai — kahan chalein, crash hone pe restart, load ke hisaab se scale, zero-downtime deploy.

Main concepts:
- **Pod** — sabse chhoti unit, ek (ya kuch) container.
- **Deployment** — kitne replicas chahiye, rolling update; pod mare to naya banata hai.
- **Service** — pods ke aage stable IP/DNS aur load balancing.
- **Ingress** — bahar se HTTP traffic andar route (domain/path).
- **ConfigMap / Secret** — config aur secrets.
- **Liveness / readiness probes** — health check (ASP.NET `MapHealthChecks`).
- **HPA** — CPU/memory ke hisaab se auto-scaling.

Managed: AKS (Azure), EKS (AWS), GKE (Google). Chhote setup ke liye Docker Compose kaafi; K8s tab jab bahut saari services, auto-scaling aur high availability chahiye.

# Linux aur server troubleshooting

## Linux ke common commands jo roz kaam aate hain
| Kaam | Command |
| --- | --- |
| Log live dekhna | `tail -f /var/log/app.log`, last 100: `tail -n 100` |
| Text dhoondhna | `grep -i "error" app.log`, recursive `grep -rn "Timeout" /etc/nginx` |
| Files dhoondhna | `find /var/log -name "*.log" -mtime -1` (1 din mein badli) |
| Processes | `ps aux` (+ grep dotnet), `top` / `htop` (live CPU/memory) |
| Disk | `df -h` (disk kitni bhari), `du -sh *` (kaunsa folder bada) |
| Memory | `free -h` |
| Ports | `ss -tulnp` (kaun kis port pe sun raha hai) |
| Service | `systemctl status/restart nginx`, logs: `journalctl -u myapi -f` |
| Permissions | `chmod 755 file`, `chown user:group file` |
| Network test | `curl -v http://localhost:8080/health`, `ping`, `telnet host port` / `nc -zv host 5432` |
| Process maarna | `kill PID`, zabardasti `kill -9 PID` |

**chmod numbers**: r=4, w=2, x=1; teen digits = owner/group/others. `755` = owner sab, baaki read+execute. `600` = sirf owner read/write (SSH keys, secrets).

## grep, awk, sed — logs se data nikaalna
Teeno text processing ke tools, aksar pipe (`|`) ke saath:

- **grep** — lines **filter** karo jo pattern match karein. `-i` case ignore, `-v` ulta (match na karein), `-c` count, `-n` line number, `-A 5` / `-B 5` aas-paas ki lines, `-E` regex.
- **awk** — lines ko **columns** mein todke kaam (default space se). `$1` pehla column, `$NF` aakhri. Sum, filter by column.
- **sed** — **find-replace** / edit stream mein. `sed 's/old/new/g'`, `-i` file mein seedha.

Aur saathi: `sort`, `uniq -c` (count), `wc -l` (lines), `head`, `cut -d',' -f2`.

```bash
grep -c "ERROR" app.log                                   # kitne errors
grep "ERROR" app.log | grep -v "HealthCheck"               # health check wale hatao
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head   # top IPs
awk '$9 == 500' access.log | wc -l                         # 500 status wali requests
sed -i 's/Debug/Information/g' appsettings.json            # config mein replace
```

## systemd service aur .NET app ko Linux pe chalana
Linux pe .NET API ko background mein chalane aur reboot/crash pe khud start karwane ke liye **systemd service** banate hain (Docker na ho to). Aage **nginx reverse proxy** (port 80/443 → app ka 5000).

- Unit file: `/etc/systemd/system/myapi.service`.
- `systemctl daemon-reload` (file badli), `enable` (boot pe start), `start/stop/restart/status`.
- Logs: `journalctl -u myapi -f` (live), `--since "1 hour ago"`.

```ini
[Unit]
Description=My .NET API
After=network.target

[Service]
WorkingDirectory=/var/www/myapi
ExecStart=/usr/bin/dotnet /var/www/myapi/MyApi.dll
Restart=always
RestartSec=5
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://127.0.0.1:5000

[Install]
WantedBy=multi-user.target
```

## Server slow hai / site down hai — kis order mein check karoge
Scenario sawaal — **systematic order** dikhana hai, random guess nahi:

1. **Scope** — sab users ya kuch? Ek endpoint ya sab? Kab se? Koi deploy / config change hua?
2. **Reachable hai?** — `curl -v https://site/health`, `ping`, DNS resolve (`nslookup`), SSL certificate expire to nahi?
3. **Resources** — `top`/`htop` (CPU), `free -h` (memory — swap use?), **`df -h` (disk 100% — sabse common silent killer, logs bhar jaate hain)**, `iostat` (disk I/O).
4. **Process chal raha hai?** — `systemctl status`, `docker ps`, `ss -tulnp` (port sun raha hai?), restart loop / OOM kill (`dmesg | grep -i kill`, `journalctl`).
5. **Logs** — app logs, nginx error log (502 = app down/crash, 504 = app slow/timeout), `journalctl -u app`.
6. **Database** — slow queries, locks, connections full (`pg_stat_activity`), DB server ka CPU/disk.
7. **Dependencies** — external API, Redis, Kafka slow/down?
8. **Network** — firewall rule badla, load balancer health check fail.

Fix ke baad: root cause likho, monitoring/alert lagao taaki agli baar pehle pata chale.

> Disk full, memory/OOM, DB connections, certificate expiry — ye chaar sabse pehle check karo.

## SSL certificate renew karna — Let's Encrypt
**Let's Encrypt** — free SSL certificates, **90 din** validity (isliye auto-renew zaroori). Tool: **certbot**.

- Pehli baar: `sudo certbot --nginx -d example.com -d www.example.com` — certificate le ke nginx config bhi update kar deta hai.
- Auto-renew: certbot ek **systemd timer / cron** install karta hai jo din mein do baar check karta hai aur expiry ke 30 din pehle renew.
- Test: `sudo certbot renew --dry-run`.
- Renew ke baad nginx reload (`--deploy-hook "systemctl reload nginx"`).
- Expiry check: `echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -dates`.

Certificate expire hone pe browsers warning dikhate hain aur API clients (mobile apps, devices) seedha fail — isliye expiry ka monitoring alert bhi rakho.

# Cloud aur deployment

## IaaS vs PaaS vs SaaS vs Serverless
Farak ye hai ki **kitna tum manage karte ho** aur kitna cloud provider:

| Model | Tum manage karte ho | Example |
| --- | --- | --- |
| **On-premise** | Sab kuch — hardware se app tak | Apna data center |
| **IaaS** | OS, runtime, app, data (provider: hardware, network, virtualization) | Azure VM, AWS EC2, GCP Compute Engine |
| **PaaS** | Sirf app aur data (OS/patching/scaling provider ka) | Azure App Service, AWS Elastic Beanstalk, Azure SQL |
| **SaaS** | Kuch nahi — seedha use | Gmail, Office 365, JIRA |
| **Serverless (FaaS)** | Sirf function code; chalne pe hi paisa | Azure Functions, AWS Lambda |

Pizza analogy: IaaS = kitchen kiraye pe, khud banao; PaaS = pizza delivery, table tumhara; SaaS = restaurant mein khao.

Serverless ke nuksaan: **cold start** (pehli request slow), execution time limits, vendor lock-in. Event-driven chhote kaamon ke liye best (file upload pe resize, queue message process).

## Azure ke main services jo .NET developer ko pata hone chahiye
| Service | Kaam | AWS equivalent |
| --- | --- | --- |
| **App Service** | Web app / API host (PaaS) | Elastic Beanstalk |
| **Azure Functions** | Serverless functions | Lambda |
| **Azure SQL / PostgreSQL Flexible Server** | Managed database | RDS |
| **Cosmos DB** | NoSQL, global | DynamoDB |
| **Blob Storage** | Files, images, backups | S3 |
| **Service Bus** | Message queue / topics | SQS / SNS |
| **Azure Cache for Redis** | Managed Redis | ElastiCache |
| **Key Vault** | Secrets, keys, certificates | Secrets Manager / KMS |
| **AKS** | Managed Kubernetes | EKS |
| **Container Apps / ACR** | Containers chalana / image registry | ECS/Fargate / ECR |
| **Application Insights / Monitor** | Logs, metrics, APM | CloudWatch / X-Ray |
| **Entra ID (Azure AD)** | Identity, SSO | Cognito / IAM Identity Center |
| **API Management** | API gateway | API Gateway |

GCP naam: Compute Engine (VM), Cloud Run (containers), Cloud SQL, Cloud Storage, Pub/Sub, GKE.

## Secrets kahan rakhein — Key Vault, env vars
**Kabhi code ya git mein nahi** — `appsettings.json` mein production password commit = leak (git history se nahi jaata).

Options, badhte security ke order mein:
- **Development**: `dotnet user-secrets` — project ke bahar user profile mein, git mein nahi jaata.
- **Environment variables** — container/server pe set; .NET config mein automatically (`ConnectionStrings__Db` — double underscore = nesting).
- **Secret manager**: **Azure Key Vault** / AWS Secrets Manager / HashiCorp Vault — central, access control, audit log, rotation.
- **Managed Identity** — app ko Azure ki identity milti hai; Key Vault / DB tak **bina kisi password ke** pahunch. Sabse achha — koi secret store hi nahi karna.

.NET mein Key Vault seedha configuration provider ki tarah jud jaata hai — code mein `builder.Configuration["Db:Password"]` hi rehta hai.

```csharp
builder.Configuration.AddAzureKeyVault(
    new Uri("https://myapp-kv.vault.azure.net/"),
    new DefaultAzureCredential());      // local: az login, cloud: Managed Identity
```

! Galti se secret git mein push ho gaya — sirf file se hatana kaafi nahi, history mein hai. **Turant secret rotate karo** (naya password), phir history saaf.

## CI/CD pipeline — Azure DevOps / GitHub Actions / Jenkins
**CI (Continuous Integration)** — har push/PR pe automatically **build + test** — toota code jaldi pakda jaaye.
**CD (Continuous Delivery/Deployment)** — test pass hone pe automatically staging/production pe **deploy** (Delivery mein production ke liye manual approval, Deployment mein woh bhi automatic).

Typical .NET + Angular pipeline:
1. **Trigger** — push to `main` / PR.
2. **Restore** dependencies (`dotnet restore`, `npm ci` — lock file se exact versions, cache ke saath).
3. **Build** (`dotnet build -c Release`, `ng build`).
4. **Test** (`dotnet test`) + code coverage, lint.
5. **Security scan** — vulnerable packages, secrets scan.
6. **Package** — Docker image build + push to registry (ACR / Docker Hub), tag = commit SHA / version.
7. **Deploy to staging** → smoke tests.
8. **Approval** → **production** deploy (rolling / blue-green).
9. **Notify** (Teams/Slack) aur monitoring.

Tools: **Azure DevOps Pipelines** (`azure-pipelines.yml`), **GitHub Actions** (`.github/workflows/*.yml`), **Jenkins** (`Jenkinsfile`), GitLab CI.

Pipeline tez karne ke tareeke: dependency caching, `node_modules` git mein commit na karna, sirf badle hue projects build, parallel jobs.

```yaml
# GitHub Actions — .NET API
on: { push: { branches: [main] }, pull_request: {} }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '8.0.x' }
      - run: dotnet restore
      - run: dotnet build -c Release --no-restore
      - run: dotnet test -c Release --no-build
      - run: docker build -t myregistry.azurecr.io/myapi:${{ github.sha }} .
```

## Deployment strategies — rolling, blue-green, canary
Nayi version bina downtime aur kam risk ke kaise daalein:

| Strategy | Kaise | Fayda | Nuksaan |
| --- | --- | --- | --- |
| **Recreate** | Purana band, naya chalu | Simple | **Downtime** |
| **Rolling** | Servers/pods ek-ek karke naye version pe | Zero downtime, extra infra nahi | Kuch der dono versions saath chalte hain |
| **Blue-Green** | Poora naya environment (green) tayyar, test, phir traffic ek jhatke mein switch | Turant rollback (wapas blue pe) | Double infra |
| **Canary** | Pehle 5% users naye version pe, metrics theek to dheere-dheere 100% | Kam users pe risk | Monitoring aur routing complex |

**Database migrations** sabse tricky — dono versions saath chalte hain to schema changes **backward compatible** hone chahiye (pehle column add karo, code deploy, phir purana hatao — "expand and contract"). Column rename/drop ek hi release mein mat karo.

**Feature flags** — code deploy ho jaaye par feature band rahe; release aur deploy alag.

## Horizontal vs vertical scaling aur load balancer
**Vertical scaling (scale up)** — same server ko bada karo (zyada CPU/RAM). Simple, code change nahi. Par ek limit hai, mehenga hota jaata hai, aur ek hi server = **single point of failure**.

**Horizontal scaling (scale out)** — zyada servers jodo, aage **load balancer**. Almost unlimited, fault tolerant. Par app **stateless** honi chahiye:
- Session/state server memory mein nahi — **Redis** / DB mein, ya JWT.
- File uploads local disk pe nahi — Blob/S3.
- In-memory cache har server ka alag — shared data ke liye distributed cache.
- SignalR multiple servers pe — **Redis backplane**.
- Background jobs do baar na chalein — distributed lock / ek hi worker.

**Load balancer algorithms**: Round robin, Least connections, IP hash (sticky sessions — avoid karo agar ho sake), Weighted. **Health checks** se mare hue server ko traffic band. L4 (TCP level, tez) vs L7 (HTTP level — path/header se routing, SSL termination). Examples: nginx, HAProxy, Azure Load Balancer / Application Gateway, AWS ALB/NLB, GCP Load Balancing.

## Logging aur monitoring — ELK, Application Insights
Production mein "kya ho raha hai" jaanne ke teen pillars (**observability**):
- **Logs** — events ka record (error, warning, info). **Structured logging** (Serilog — JSON fields jaise `OrderId`, `UserId`) taaki search/filter ho sake. **Correlation ID** har request ke saath taaki ek request ko saari services mein trace kar sako.
- **Metrics** — numbers over time: requests/sec, error rate, latency (p95/p99), CPU, memory, queue lag.
- **Traces** — ek request kaunsi services/DB calls se guzri, har step mein kitna time (OpenTelemetry).

**ELK stack**: **Elasticsearch** (logs store aur search), **Logstash** (logs collect/transform — ya halka Filebeat), **Kibana** (dashboards, search UI). Aur: Grafana + Prometheus (metrics), Loki, Seq, **Azure Application Insights** (.NET ke liye seedha APM), Datadog.

**Alerts** lagao — error rate badhe, disk 85% ho, API p95 > 2s, service down — taaki user se pehle tumhe pata chale.

Log mein kabhi mat daalo: passwords, tokens, full card numbers, personal data (PII).

```csharp
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .WriteTo.Console(new JsonFormatter())
    .WriteTo.Elasticsearch(new ElasticsearchSinkOptions(new Uri("http://elastic:9200")))
    .CreateLogger();

_logger.LogInformation("Order {OrderId} placed by {UserId} in {ElapsedMs} ms", order.Id, userId, sw.ElapsedMilliseconds);
```

## VPC, subnet aur firewall — cloud networking basics
**VPC / VNet** (Virtual Private Cloud / Azure Virtual Network) — cloud mein tumhara **private network**, baaki customers se isolated. Iske andar **subnets** — IP ranges ke hisse.

- **Public subnet** — internet se pahunch (load balancer, bastion host).
- **Private subnet** — internet se seedha nahi (app servers, **databases**). Bahar jaana ho to NAT gateway.
- **Firewall rules / Security Groups / NSG** — kaunsa traffic (source IP, port, protocol) allowed. Default sab band, sirf zaroori khola — **least privilege**. DB ka port 5432 sirf app subnet se, internet se kabhi nahi.
- **CIDR** — `10.0.1.0/24` = 256 addresses (`/24` = pehle 24 bits fixed).
- **VPC peering / VPN** — do networks ya office network ko jodna.
- **Bastion host** / jump server — private servers pe SSH ke liye ek hi controlled entry point.

GCP mein firewall rules VPC level pe hote hain (network tags se target), AWS mein Security Groups (instance level, stateful) + NACLs (subnet level).
