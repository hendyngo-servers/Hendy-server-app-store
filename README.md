# HendyAppStore — Cloudflare-first monorepo

Bộ khung production-oriented cho cổng phân phối ứng dụng với **Public Store**, **Admin Control Studio**, Cloudflare Workers, D1, KV, R2 và GitHub Actions. Không dùng Render.

## Những gì đã có

- Hai frontend React/Vite độc lập để triển khai thành **hai Cloudflare Pages project** riêng.
- Edge Router đọc ánh xạ hostname/layout từ KV; nhận diện iOS, Android, Windows, macOS.
  Ví dụ giá trị KV key `routes:v1`: `{"store.example.com":"https://hendy-appstore-user.pages.dev","admin.example.com":"https://hendy-appstore-admin.pages.dev"}`. Router redirect theo hostname; frontend vẫn tự nhận diện thiết bị.
- Backend API có xác thực Cloudflare Access JWT, ghi audit log D1, quản lý metadata release, upload R2 và URL tải có chữ ký HMAC 15 phút.
- Đồng bộ GitHub Actions Secrets qua REST API + libsodium sealed box; Worker không ghi giá trị bí mật vào D1/log.
- OTA manifest `.plist` sinh động cho hệ thống phân phối iOS đã ký và được provision hợp lệ.
- Self-healing webhook xác thực HMAC; chỉ thực hiện hành động theo danh sách cho phép (mặc định chỉ retry workflow, không sửa code hoặc tự phát hành).
- Workflows CI/CD, workflow kiểm tra schema 26 biến, matrix build có điều kiện theo sự hiện diện của dự án native.

## Sơ đồ triển khai

```text
Cloudflare Pages: web-user  ─┐
Cloudflare Pages: web-admin ─┼─> Cloudflare Access ─> backend-api Worker ─> D1 / KV / R2
                              │                          │
DNS + WAF + Edge Router Worker┘                          └─> GitHub REST API / Actions
ota-manifest-server Worker ─────────────────────────────────> R2 + D1
self-healing-bot Worker <──────────────────── GitHub workflow_run webhook
```

## Yêu cầu

- Node.js 22+, pnpm 10+, tài khoản Cloudflare và repository GitHub.
- Bật Cloudflare Access cho trang Admin và các endpoint quản trị API. Phía Worker kiểm tra JWT Access; đừng chỉ dựa vào việc ẩn URL.
- Tạo D1 database, KV namespace, R2 bucket. Dán các ID vào file `wrangler.toml` tương ứng (các dòng `REPLACE_WITH_...`). Cùng một D1/KV/R2 ID cần được dùng ở các Worker liên quan.
- Đặt secrets bằng `wrangler secret put NAME --config workers/backend-api/wrangler.toml` hoặc GitHub Actions Secrets. GitHub token dùng cho đồng bộ cần quyền quản lý Actions secrets và variables trong repository đã chọn. Không đặt token/bí mật trong `vars`, `.env.example`, frontend hay commit.

## Chạy local

```bash
corepack enable
pnpm install
pnpm dev:user
# cửa sổ terminal khác
pnpm dev:admin
```

Đặt `VITE_API_BASE_URL` trong file `.env.local` của từng app. Nếu API chưa deploy, UI hiện trạng thái chưa kết nối; nó không giả lập dữ liệu release.

## Khởi tạo Cloudflare

1. Tạo D1 `hendy-appstore-db`, KV `hendy-layout-cache`, R2 bucket `hendyappstore-releases` trong Cloudflare Dashboard hoặc Wrangler.
2. Thay `REPLACE_WITH_D1_DATABASE_ID` và `REPLACE_WITH_KV_NAMESPACE_ID` trong cấu hình Worker bằng ID thật. Chọn cùng ID trên các Worker dùng chung tài nguyên.
3. Tạo thêm R2 bucket private `hendyappstore-backups` để lưu backup D1.
4. Áp dụng migration: `pnpm db:migrate:remote`.
5. Thêm secrets cho backend:

```bash
pnpm exec wrangler secret put SIGNED_URL_SECRET --config workers/backend-api/wrangler.toml
pnpm exec wrangler secret put SIGNED_URL_SECRET --config workers/ota-manifest-server/wrangler.toml
pnpm exec wrangler secret put GITHUB_TOKEN --config workers/backend-api/wrangler.toml
pnpm exec wrangler secret put GITHUB_TOKEN --config workers/self-healing-bot/wrangler.toml
pnpm exec wrangler secret put GITHUB_WEBHOOK_SECRET --config workers/self-healing-bot/wrangler.toml
```

Tạo một giá trị ngẫu nhiên mạnh cho `SIGNED_URL_SECRET`; cần dùng cùng giá trị trên backend API và OTA manifest Worker. Cấu hình `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `ADMIN_EMAIL_ALLOWLIST` (danh sách email phân tách bằng dấu phẩy, nếu muốn enforce thêm ở Worker), `GITHUB_OWNER`, `GITHUB_REPO`, `ALLOWED_ORIGINS`, `OTA_MANIFEST_BASE_URL` (URL gốc Worker OTA) và `BACKEND_API_BASE_URL` (URL gốc backend API) theo tài khoản/repository của bạn bằng Worker Variables. Dùng cùng `SIGNED_URL_SECRET` cho backend API và OTA Worker. Cấu hình webhook GitHub trỏ tới URL Worker self-healing `/webhook` với event `workflow_run`.

```bash
pnpm cf:deploy:workers
```

Nếu dùng GitHub Actions deploy, đặt repository secrets `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID`. Token nên giới hạn đúng quyền Workers Scripts, Pages, D1, KV, R2 cần thiết. Đừng dùng Global API Key.

## Triển khai Cloudflare Pages chi tiết (Public Store + Admin Studio)

Phần này triển khai **hai website độc lập từ cùng một repository GitHub** bằng Cloudflare Pages Git integration. Đây là cách khuyến nghị cho monorepo này: sau khi cấu hình xong, mỗi lần push vào nhánh production (`main`) sẽ tự build và deploy website tương ứng. Không cần Render.

Tài liệu Cloudflare chính thức:

- [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Monorepos](https://developers.cloudflare.com/pages/configuration/monorepos/)
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Environment variables](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)
- [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

### A. Chuẩn bị repository trước khi tạo Pages

1. Đưa toàn bộ thư mục `HendyAppStore/` lên repository GitHub của bạn, bao gồm `package.json`, `pnpm-workspace.yaml`, thư mục `apps/`, `packages/` và `workers/`.
2. Dùng Node.js 22 trở lên và pnpm 10.20.0. Tại thư mục gốc monorepo, chạy:

   ```bash
   corepack enable
   corepack prepare pnpm@10.20.0 --activate
   pnpm install
   pnpm --filter @hendy/web-user build
   pnpm --filter @hendy/web-admin build
   ```

3. Lệnh `pnpm install` tạo `pnpm-lock.yaml` nếu repository chưa có file này. Hãy commit file lock vào GitHub để các lần build có thể tái lập dependency. Khi file lock đã có trong repository, nên dùng `pnpm install --frozen-lockfile` trong các build production.
4. Xác nhận hai thư mục đầu ra được sinh ra:

   - Public Store: `apps/web-user/dist/`
   - Admin Studio: `apps/web-admin/dist/`

Nếu một trong hai lệnh build thất bại trên máy local, hãy xử lý lỗi đó trước khi tạo Pages; đừng bỏ qua lỗi TypeScript hoặc lỗi dependency.

### B. Tạo Pages project cho Public Store

1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Mở **Workers & Pages** → **Create application** → chọn **Pages** → **Connect to Git**. Tên nút có thể thay đổi nhẹ theo giao diện Dashboard.
3. Kết nối tài khoản/organization GitHub và cấp quyền truy cập repository đang chứa `HendyAppStore`.
4. Chọn repository và tạo project với tên duy nhất:

   ```text
   hendy-appstore-user
   ```

5. Cấu hình build như bảng dưới. Đây là monorepo; **không** đặt root directory thành `apps/web-user`, vì lệnh build cần truy cập `pnpm-workspace.yaml` và các package dùng chung ở thư mục gốc.

   | Trường trong Pages | Giá trị cho Public Store |
   |---|---|
   | Production branch | `main` |
   | Framework preset | `Vite` hoặc `None` nếu preset không hiển thị |
   | Root directory (advanced) | Để trống để dùng repository root |
   | Build command | `corepack enable && corepack prepare pnpm@10.20.0 --activate && pnpm install --no-frozen-lockfile && pnpm --filter @hendy/web-user build` |
   | Build output directory | `apps/web-user/dist` |

   Lệnh ở trên cho phép lần build đầu chạy ngay cả khi chưa commit `pnpm-lock.yaml`. Sau khi đã tạo và commit file lock, nên đổi `pnpm install --no-frozen-lockfile` thành `pnpm install --frozen-lockfile` để build production dùng đúng dependency đã khóa.

6. Trong phần **Environment variables**, khai báo biến cho cả **Production** và **Preview** khi cần. Với Public Store, biến quan trọng là:

   | Tên biến | Giá trị |
   |---|---|
   | `VITE_API_BASE_URL` | URL gốc HTTPS của `hendy-backend-api` Worker, ví dụ `https://hendy-backend-api.<subdomain>.workers.dev` |
   | `NODE_VERSION` | `22` (nếu muốn ghim phiên bản Node trong môi trường build) |

   Thay URL ví dụ bằng URL thật hiển thị trong Cloudflare Dashboard sau khi Backend API Worker đã được deploy. Không thêm dấu `/` ở cuối URL API. `VITE_API_BASE_URL` là cấu hình công khai được nhúng vào bundle JavaScript lúc build; **không được đặt token, mật khẩu hoặc secret vào biến có tiền tố `VITE_`**.

7. Bấm **Save and Deploy**. Mở tab **Deployments** để theo dõi log. Khi build thành công, Pages cấp URL mặc định dạng:

   ```text
   https://hendy-appstore-user.pages.dev
   ```

8. Mở URL đó và kiểm tra trang có tải được hay không. Nếu API chưa được triển khai hoặc chưa có bản release công khai, giao diện có thể hiện thông báo chưa kết nối/chưa có bản phát hành; đây không có nghĩa Pages build thất bại.

### C. Tạo Pages project cho Admin Studio

Lặp lại quy trình **Workers & Pages → Create application → Pages → Connect to Git**, chọn lại cùng repository nhưng đặt tên project khác:

```text
hendy-appstore-admin
```

Dùng các giá trị build dưới đây:

| Trường trong Pages | Giá trị cho Admin Studio |
|---|---|
| Production branch | `main` |
| Framework preset | `Vite` hoặc `None` |
| Root directory (advanced) | Để trống để dùng repository root |
| Build command | `corepack enable && corepack prepare pnpm@10.20.0 --activate && pnpm install --no-frozen-lockfile && pnpm --filter @hendy/web-admin build` |
| Build output directory | `apps/web-admin/dist` |

Khi đã commit `pnpm-lock.yaml`, thay `--no-frozen-lockfile` bằng `--frozen-lockfile` như phần Public Store.

Thêm biến môi trường:

| Tên biến | Giá trị |
|---|---|
| `VITE_API_BASE_URL` | URL gốc HTTPS của Backend API Worker |
| `NODE_VERSION` | `22` (tùy chọn) |

Nhấn **Save and Deploy**. URL mặc định dự kiến:

```text
https://hendy-appstore-admin.pages.dev
```

Cả hai project dùng chung repository nhưng có build command, thư mục output và biến môi trường riêng. Tên Pages project phải chưa được sử dụng trong tài khoản Cloudflare.

### D. Triển khai theo đúng thứ tự

Để giao diện kết nối backend đúng cách, làm theo thứ tự sau:

1. **Tạo tài nguyên Cloudflare:** D1, KV và R2 theo phần “Khởi tạo Cloudflare” phía trên; thay mọi `REPLACE_WITH_...` trong cấu hình Worker bằng ID thật.
2. **Áp dụng migration D1:** chạy `pnpm db:migrate:remote` từ thư mục gốc sau khi đã cấu hình database ID.
3. **Cấu hình Worker Secrets/Variables:** đặc biệt `SIGNED_URL_SECRET`, thông tin GitHub, Cloudflare Access và các URL backend/OTA. Không commit các giá trị nhạy cảm vào Git.
4. **Deploy Workers:** chạy `pnpm cf:deploy:workers` hoặc sử dụng workflow `.github/workflows/deploy-workers.yml` với `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID` trong GitHub Actions Secrets.
5. **Ghi lại URL thật của Backend API và OTA Worker** từ Dashboard. Cập nhật `VITE_API_BASE_URL` trong cả hai Pages project bằng URL Backend API; cập nhật `OTA_MANIFEST_BASE_URL`/`BACKEND_API_BASE_URL` trong các Worker tương ứng nếu chưa cấu hình.
6. **Cập nhật CORS:** `ALLOWED_ORIGINS` của Backend API phải chứa origin chính xác của hai Pages site, phân cách bằng dấu phẩy, không có dấu `/` ở cuối:

   ```text
   https://hendy-appstore-user.pages.dev,https://hendy-appstore-admin.pages.dev
   ```

   Nếu dùng domain tùy chỉnh, hãy thêm origin mới tương ứng. Sau khi đổi Worker Variables, deploy lại Worker.
7. **Redeploy hai Pages project** sau khi thay đổi biến `VITE_API_BASE_URL`. Biến `VITE_` được đọc tại thời điểm build; chỉ sửa biến trong Dashboard mà không chạy build mới sẽ không cập nhật bundle đang phục vụ.
8. Kiểm tra Store gọi được API, Admin được chặn khi chưa xác thực, và URL tải hết hạn đúng theo cấu hình TTL.

### E. Bảo vệ trang quản trị bằng Cloudflare Access

Admin Studio là giao diện quản trị, không phải một cơ chế xác thực độc lập. Cần cấu hình Cloudflare Access và kiểm tra quyền ở Worker API.

1. Nên gắn domain quản trị riêng, ví dụ `admin.example.com`, vào Pages project `hendy-appstore-admin` trước khi tạo Access application.
2. Trong Cloudflare Dashboard, mở **Zero Trust** → **Access** → **Applications** → tạo ứng dụng dạng **Self-hosted** cho hostname Admin.
3. Tạo policy **Allow** chỉ cho email/người dùng hoặc nhóm quản trị được phép. Không tạo policy Allow rộng cho mọi người.
4. Kiểm tra cấu hình Access JWT của Backend API, bao gồm team domain và Audience (AUD) tương ứng với Access application. Các giá trị phải trùng với cấu hình Worker; không sao chép Audience từ ví dụ.
5. Thử mở Admin trong cửa sổ riêng tư: khách chưa được phép phải bị Access chặn. Tiếp đó thử trực tiếp endpoint quản trị API; bảo vệ giao diện thôi là chưa đủ.
6. Nếu vẫn dùng URL `pages.dev`, xác nhận chính hostname đó cũng được bao phủ bởi cấu hình bảo vệ phù hợp. Không cho rằng bảo vệ domain tùy chỉnh tự động bảo vệ mọi alias `pages.dev`.

> **Quan trọng:** URL Pages khó đoán hoặc việc ẩn nút Admin không phải là bảo mật. Không mở endpoint quản trị ra Internet nếu Worker chưa xác thực đầy đủ yêu cầu. Trước khi dùng production, hãy thử các endpoint quản trị bằng cả request không xác thực và phiên có quyền.

### F. Gắn tên miền riêng cho mỗi giao diện (tùy chọn)

Nên dùng hai hostname riêng biệt, ví dụ:

- `store.example.com` → Pages project `hendy-appstore-user`
- `admin.example.com` → Pages project `hendy-appstore-admin`

Cách cấu hình:

1. Thêm domain vào Cloudflare và kiểm tra DNS/SSL trước nếu domain chưa nằm trong zone Cloudflare.
2. Mở **Workers & Pages** → chọn Pages project → **Custom domains** → **Set up a domain**.
3. Nhập hostname tương ứng và làm theo hướng dẫn DNS của Cloudflare. Đợi trạng thái domain/SSL hoàn tất trước khi dùng.
4. Cập nhật `ALLOWED_ORIGINS` trong Backend API để có cả hostname mới. Redeploy Worker.
5. Nếu có thay đổi hostname, cập nhật chính sách Cloudflare Access cho hostname Admin và kiểm tra lại URL API trong Pages.

Không cấu hình cùng một hostname đồng thời cho Pages và một Worker route độc lập. Nếu muốn dùng `edge-router` làm điểm vào duy nhất, hãy thiết kế rõ hostname/route và mục tiêu redirect trước khi thay DNS; cấu hình đơn giản nhất là gắn hai hostname trực tiếp với hai Pages project như trên.

### G. Tự động deploy khi push GitHub

Với Git integration, Cloudflare Pages tự chạy build sau khi có commit mới trên nhánh production. Mỗi Pages project sẽ có lịch sử deployment riêng; pull request/nhánh preview có thể tạo URL xem trước mà không thay bản production.

- Push code lên `main` để phát hành production.
- Kiểm tra **Workers & Pages → project → Deployments** nếu build lỗi.
- Trong phần **Builds / Branch control**, đặt `main` là Production branch.
- Monorepo mặc định có thể khiến cả hai Pages project build khi có thay đổi ở bất kỳ thư mục nào. Có thể cấu hình **Build watch paths** cho từng project để giảm build không cần thiết, nhưng cần giữ các tệp dùng chung như `packages/**`, `pnpm-workspace.yaml`, `package.json`, `pnpm-lock.yaml` và `turbo.json` trong phạm vi theo dõi của cả hai project.
- Git-integrated project không thể chuyển sang Direct Upload sau này. Chọn Git integration ngay từ đầu nếu muốn tự động triển khai theo commit.

### H. Checklist kiểm tra sau khi deploy

- [ ] `hendy-appstore-user` có trạng thái **Success** trong Deployments và mở được `index.html`.
- [ ] `hendy-appstore-admin` có trạng thái **Success** và hiện yêu cầu xác thực quản trị.
- [ ] Cả hai Pages project có `VITE_API_BASE_URL` trỏ đúng Backend API Worker.
- [ ] Backend API có `ALLOWED_ORIGINS` khớp toàn bộ hostname Public/Admin đang dùng.
- [ ] D1 migration đã áp dụng thành công; Worker bindings trỏ đúng D1/KV/R2.
- [ ] Admin bị chặn khi không có quyền Cloudflare Access.
- [ ] Một bản tải thử nghiệm có thể được truy xuất qua signed URL và URL hết hạn sau TTL cấu hình.
- [ ] Không có token, password, private key hay nội dung chứng chỉ trong frontend bundle, repository hoặc log CI.

### I. Khắc phục lỗi Cloudflare Pages thường gặp

| Lỗi | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `pnpm: command not found` | Build image chưa kích hoạt pnpm | Giữ phần `corepack enable && corepack prepare pnpm@10.20.0 --activate` ở đầu build command. |
| Build báo không tìm thấy package workspace | Root directory bị đặt thành thư mục con | Để Root directory ở repository root để lệnh build thấy `pnpm-workspace.yaml` và `packages/`. |
| Build thành công nhưng Pages trả 404 | Output directory sai hoặc không có `index.html` | Dùng đúng `apps/web-user/dist` hoặc `apps/web-admin/dist`; kiểm tra log build có sinh `dist/index.html`. |
| Trang báo chưa cấu hình API | `VITE_API_BASE_URL` trống hoặc không được đưa vào build | Nhập biến ở Settings → Environment variables rồi chạy deployment mới. |
| API trả lỗi CORS | Origin Pages/domain không nằm trong `ALLOWED_ORIGINS` | Thêm origin chính xác, deploy lại Backend API và thử lại. |
| Admin báo 401/không xác thực | Access team domain, AUD hoặc policy không khớp | Kiểm tra application/policy trong Zero Trust và Worker variables; không tắt xác thực để né lỗi. |
| Store không có bản phát hành | D1 chưa có release đã publish hoặc API chưa sẵn sàng | Kiểm tra API health, migration, D1 data và trạng thái publish; Pages build vẫn có thể thành công. |
| Pages không cập nhật sau khi đổi biến | Vite nhúng `VITE_*` lúc build | Tạo deployment mới sau mỗi lần sửa biến frontend. |
| Cả Store và Admin cùng build sau một commit | Hai project theo dõi cùng monorepo | Cấu hình Build watch paths cẩn thận; không loại bỏ các package/tệp cấu hình dùng chung. |

### J. Hướng dẫn thao tác trên Cloudflare Dashboard theo từng màn hình

Phần này dành cho lần triển khai đầu tiên khi repository đã được push lên GitHub nhưng chưa tạo Pages project. Tên menu có thể thay đổi nhẹ theo phiên bản Dashboard; hãy chọn mục tương đương nếu giao diện của bạn khác.

#### Bước 1 — Đẩy mã nguồn lên GitHub

1. Tạo repository GitHub, ví dụ `HendyAppStore` (có thể là repository private).
2. Giải nén ZIP sao cho `package.json`, `pnpm-workspace.yaml`, `apps/`, `packages/` và `workers/` nằm ngay ở thư mục gốc repository; tránh tạo cấu trúc lồng `HendyAppStore/HendyAppStore/`.
3. Mở terminal tại thư mục gốc và chạy:

   ```bash
   git init
   git add .
   git commit -m "chore: initialize HendyAppStore monorepo"
   git branch -M main
   git remote add origin https://github.com/OWNER/REPOSITORY.git
   git push -u origin main
   ```

   Thay `OWNER/REPOSITORY` bằng đường dẫn repository thật. Nếu repository đã có commit, hãy clone repository đó và chép các tệp vào đúng thư mục thay vì khởi tạo Git lần nữa.

4. Tạo lockfile trước khi bật chế độ frozen lockfile:

   ```bash
   corepack enable
   corepack prepare pnpm@10.20.0 --activate
   pnpm install
   pnpm typecheck
   pnpm build
   git add pnpm-lock.yaml
   git commit -m "build: add pnpm lockfile"
   git push
   ```

   Nếu `pnpm typecheck` hoặc `pnpm build` lỗi, xử lý lỗi trước khi tiếp tục. Không bỏ qua lỗi build chỉ để tạo Pages project.

#### Bước 2 — Tạo Public Store Pages project

1. Đăng nhập Cloudflare Dashboard và chọn đúng account.
2. Vào **Workers & Pages** → **Create** / **Create application** → tab hoặc lựa chọn **Pages** → **Connect to Git**.
3. Nếu được hỏi, kết nối GitHub và cấp quyền truy cập repository `HendyAppStore`.
4. Chọn repository đó, rồi nhập project name `hendy-appstore-user`. Tên project là duy nhất trong Cloudflare; nếu bị báo đã tồn tại, chọn tên khác và cập nhật các URL tương ứng trong tài liệu/cấu hình.
5. Ở phần **Build settings** cấu hình chính xác:

   | Trường | Giá trị |
   |---|---|
   | Production branch | `main` |
   | Framework preset | `Vite` hoặc `None` |
   | Root directory | Để trống / repository root |
   | Build command | `corepack enable && corepack prepare pnpm@10.20.0 --activate && pnpm install --frozen-lockfile && pnpm --filter @hendy/web-user build` |
   | Build output directory | `apps/web-user/dist` |

6. Ở phần **Environment variables**, tạo `VITE_API_BASE_URL` với URL HTTPS thật của Backend API Worker. Nếu Worker chưa deploy, có thể tạo Pages trước với biến tạm, nhưng phải cập nhật và redeploy sau khi API đã có URL thật.
7. Bấm **Save and Deploy**. Mở deployment mới nhất và xem **Build log** đến khi trạng thái là **Success**.
8. Mở URL `https://hendy-appstore-user.pages.dev` (hoặc hostname thực tế mà Cloudflare hiển thị). Nếu project được đặt tên khác, URL `pages.dev` cũng sẽ khác.

#### Bước 3 — Tạo Admin Studio Pages project

Lặp lại **Workers & Pages → Create → Pages → Connect to Git** và chọn cùng repository GitHub. Tạo project thứ hai tên `hendy-appstore-admin`.

| Trường | Giá trị |
|---|---|
| Production branch | `main` |
| Framework preset | `Vite` hoặc `None` |
| Root directory | Để trống / repository root |
| Build command | `corepack enable && corepack prepare pnpm@10.20.0 --activate && pnpm install --frozen-lockfile && pnpm --filter @hendy/web-admin build` |
| Build output directory | `apps/web-admin/dist` |

Thêm `VITE_API_BASE_URL` trỏ tới cùng Backend API Worker. Nhấn **Save and Deploy**, chờ **Success**, rồi mở URL project Admin do Cloudflare cung cấp. Hai project là hai deployment độc lập; tạo project thứ hai không ghi đè project Public Store.

#### Bước 4 — Thiết lập biến môi trường cho từng môi trường

Trong từng Pages project, mở **Settings → Environment variables** (hoặc **Variables and Secrets**) và khai báo biến cho **Production**. Chỉ khai báo ở **Preview** nếu bạn cũng muốn kiểm thử các deployment preview.

- `VITE_API_BASE_URL`: URL gốc HTTPS của Backend API Worker, ví dụ `https://hendy-backend-api.<subdomain>.workers.dev`, không thêm `/` cuối.
- `NODE_VERSION`: `22` nếu cần ghim Node.js build runtime.

Biến có tiền tố `VITE_` được nhúng vào JavaScript phía trình duyệt, vì vậy nó chỉ được dùng cho giá trị công khai. **Không** đặt `GITHUB_TOKEN`, `SIGNED_URL_SECRET`, mật khẩu, API token hoặc khóa riêng vào Pages variables có tiền tố `VITE_`.

Sau khi sửa biến, vào **Deployments** và tạo deployment mới (ví dụ **Retry deployment** hoặc push một commit mới). Vite đọc biến tại thời điểm build, không phải khi trình duyệt tải trang.

#### Bước 5 — Tạo Cloudflare D1, KV và R2

Có thể tạo tài nguyên trong Dashboard hoặc bằng Wrangler. Nếu dùng Dashboard:

1. **Storage & Databases → D1 SQL Database → Create**: tạo `hendy-appstore-db`.
2. **Storage & Databases → Workers KV → Create namespace**: tạo `hendy-layout-cache`.
3. **R2 Object Storage → Create bucket**: tạo `hendyappstore-releases` để lưu binary; giữ bucket private.
4. Tạo bucket R2 riêng `hendyappstore-backups` cho bản sao lưu cơ sở dữ liệu.
5. Sao chép các ID thật vào binding tương ứng trong các file `workers/*/wrangler.toml`. Không điền tên bucket thay cho ID D1/KV; mỗi loại binding có định danh riêng.
6. Từ thư mục gốc, chạy migration sau khi database name/ID trong cấu hình đã đúng:

   ```bash
   pnpm db:migrate:remote
   ```

   Nếu Wrangler báo không tìm thấy database hoặc migration, kiểm tra `database_name`, `database_id`, đường dẫn `migrations_dir` và tên migration SQL trước khi thử lại.

#### Bước 6 — Deploy Workers và cấu hình secrets

1. Cài dependencies ở thư mục gốc và đăng nhập Wrangler:

   ```bash
   pnpm install --frozen-lockfile
   pnpm exec wrangler login
   ```

2. Xem lại mọi `workers/*/wrangler.toml`, thay placeholder và kiểm tra binding. Không deploy khi vẫn còn `REPLACE_WITH_...`.
3. Thiết lập secrets theo từng Worker bằng `wrangler secret put`. Ví dụ:

   ```bash
   pnpm exec wrangler secret put SIGNED_URL_SECRET --config workers/backend-api/wrangler.toml
   pnpm exec wrangler secret put SIGNED_URL_SECRET --config workers/ota-manifest-server/wrangler.toml
   pnpm exec wrangler secret put GITHUB_TOKEN --config workers/backend-api/wrangler.toml
   pnpm exec wrangler secret put GITHUB_TOKEN --config workers/self-healing-bot/wrangler.toml
   pnpm exec wrangler secret put GITHUB_WEBHOOK_SECRET --config workers/self-healing-bot/wrangler.toml
   ```

   Khi Wrangler yêu cầu nhập giá trị, dán secret trong terminal tương tác; không đưa secret vào command line, tệp mã nguồn hoặc lịch sử Git. Tạo `SIGNED_URL_SECRET` ngẫu nhiên, dài và khó đoán, rồi cài cùng giá trị vào Backend API và OTA Worker.
4. Điền Worker variables như `GITHUB_OWNER`, `GITHUB_REPO`, `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `ADMIN_EMAIL_ALLOWLIST`, `ALLOWED_ORIGINS`, `BACKEND_API_BASE_URL` và `OTA_MANIFEST_BASE_URL` theo cấu hình thực tế. Chỉ khai báo giá trị không nhạy cảm bằng `vars`; dùng `secrets` cho token/khóa.
5. Deploy theo thứ tự để có URL API trước khi build frontend:

   ```bash
   pnpm cf:deploy:api
   pnpm cf:deploy:ota
   pnpm cf:deploy:healing
   pnpm cf:deploy:edge
   ```

   Hoặc dùng `pnpm cf:deploy:workers` sau khi đã cấu hình đầy đủ. Ghi lại URL `workers.dev` mà Dashboard/Wrangler trả về; không đoán subdomain.
6. Cập nhật `VITE_API_BASE_URL` của cả hai Pages project thành URL Backend API thật, sau đó redeploy cả hai Pages project.
7. Cập nhật `ALLOWED_ORIGINS` trong Backend API với origin thật của Store/Admin, ví dụ `https://hendy-appstore-user.pages.dev,https://hendy-appstore-admin.pages.dev`. Không thêm dấu `/` cuối. Nếu dùng custom domains, thêm origin của custom domains nữa.

#### Bước 7 — Kết nối GitHub Actions để tự động deploy Workers

Trong repository GitHub, mở **Settings → Secrets and variables → Actions**:

- Thêm repository secret `CLOUDFLARE_API_TOKEN`.
- Thêm repository secret `CLOUDFLARE_ACCOUNT_ID`.

Tạo API token trong Cloudflare Dashboard với phạm vi quyền tối thiểu cần thiết cho Workers Scripts, Pages nếu workflow quản lý Pages, D1, KV và R2 theo các thao tác workflow thực sự thực hiện. Không sử dụng Global API Key. Kiểm tra file `.github/workflows/deploy-workers.yml` để xác nhận tên secret và trigger khớp nhau trước khi chạy workflow.

Với Pages Git integration, push lên nhánh `main` tự kích hoạt build của từng Pages project. Với Workers, workflow riêng sẽ deploy khi trigger của workflow được đáp ứng. Hai cơ chế này độc lập: Pages build thành công không đồng nghĩa Workers đã deploy thành công.

#### Bước 8 — Xác minh sau triển khai

1. Trong Dashboard, xác nhận cả hai Pages project có deployment mới nhất trạng thái **Success**.
2. Mở Store và Admin; kiểm tra Developer Tools → Network để xác nhận API request đi đến đúng hostname HTTPS.
3. Gọi endpoint health được khai báo trong Backend API (ví dụ `/api/health` nếu route này có trong phiên bản code hiện tại) và xác nhận phản hồi thành công.
4. Thử endpoint quản trị khi chưa đăng nhập/không có Access JWT; request phải bị từ chối. Sau đó thử với tài khoản được policy cho phép.
5. Kiểm tra D1 migration và R2 object thử nghiệm. Không tải binary độc quyền từ bucket public.
6. Thử signed URL trong thời hạn và sau khi hết hạn; URL hết hạn phải bị từ chối.
7. Xem log Workers và Pages build log; xóa khỏi log bất kỳ thông tin nhạy cảm nào nếu vô tình bị ghi lại, đồng thời xoay vòng secret đã lộ.

#### Bước 9 — Dùng custom domain (tùy chọn)

Trong Pages project tương ứng, vào **Custom domains → Set up a domain** và thêm `store.example.com` cho Store, `admin.example.com` cho Admin. Làm theo yêu cầu DNS/SSL của Cloudflare và đợi trạng thái domain hoạt động. Sau đó:

- Thêm cả hai origin mới vào `ALLOWED_ORIGINS`.
- Cập nhật policy Cloudflare Access để bảo vệ `admin.example.com`.
- Nếu URL API/OTA thay đổi, cập nhật Worker variables và `VITE_API_BASE_URL`, rồi deploy lại các dịch vụ bị ảnh hưởng.
- Kiểm tra hostname `pages.dev` mặc định vẫn có chính sách truy cập phù hợp; bảo vệ custom domain không tự động đồng nghĩa mọi hostname khác đã được bảo vệ.

### J.1 — Cách cập nhật riêng một giao diện

- Sửa `apps/web-user/**`: Pages Public Store cần build lại; Admin không cần build lại trừ khi thay đổi package dùng chung.
- Sửa `apps/web-admin/**`: Pages Admin cần build lại.
- Sửa `packages/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` hoặc `turbo.json`: coi đây là thay đổi dùng chung, kiểm thử và build cả hai frontend.
- Sửa `workers/**` hoặc `migrations/**`: deploy Worker/migration tương ứng; việc Pages tự build không tự áp dụng migration D1.

Nếu cấu hình Build watch paths để giảm build, hãy đảm bảo mỗi Pages project vẫn theo dõi các tệp shared workspace và lockfile cần thiết. Khi không chắc chắn, để mặc định build khi có commit mới sẽ an toàn hơn.

## Admin / GitHub Secrets

`/api/admin/github/secrets` chỉ nhận tên thuộc allowlist 26 key trong `packages/types/src/secrets.ts`. Key được đánh dấu nhạy cảm sẽ dùng GitHub Actions Secrets: Worker lấy public key repository, mã hóa bằng libsodium sealed box rồi gửi ciphertext qua REST API. Key cấu hình không nhạy cảm được lưu trong GitHub Actions Variables. GitHub không trả plaintext secret sau khi đã lưu; giao diện chỉ hiển thị trạng thái/names, không thể đọc ngược secret từ GitHub.

Không lưu giá trị nhạy cảm vào D1. Audit logs chỉ chứa tên biến, thao tác, trạng thái và timestamp. Các biến GitHub được chia Secrets/Variables theo metadata trong `packages/types/src/secrets.ts`. Không gửi chứng chỉ/key vào issue, log, analytics hoặc file cấu hình public.

## Phát hành và giới hạn nền tảng

- URL tải do Worker ký có thời hạn mặc định 900 giây; object trong R2 nên để private và không tạo public bucket cho binary độc quyền.
- iOS OTA chỉ hoạt động với app đã được ký bằng chứng chỉ/profile hợp lệ và HTTPS manifest/binary hợp lệ; không thay thế quy trình Apple Developer signing.
- Android APK/AAB phải được ký đúng key và tuân thủ yêu cầu nền tảng. Windows code signing/notarization yêu cầu chứng chỉ hợp lệ. Không có quy trình hợp pháp nào bảo đảm “vượt” Play Protect, Knox, SmartScreen hoặc Gatekeeper; dự án không cố vô hiệu hóa các lớp bảo vệ đó.
- Workflow `matrix-build.yml` sẽ build native target khi repo có dự án Android/iOS/Windows/macOS tương ứng. Repository này chỉ cung cấp hạ tầng web/backend; các source project native chưa được bao gồm, do đó các target native sẽ được skip minh bạch cho tới khi thêm project.

## Kiểm tra trước production

1. `pnpm install`, `pnpm typecheck`, `pnpm build`.
2. Áp dụng migration D1 và thử `/api/health`.
3. Xác nhận request quản trị thiếu Access JWT trả `401`.
4. Tạo release metadata, upload object test vào R2, kiểm tra link hết hạn sau 15 phút.
5. Gửi webhook GitHub thử với signature hợp lệ và xác nhận không có secret/token trong log.
6. Thiết lập WAF/rate limits/Access policy ở Cloudflare Dashboard; cấu hình `strict` TLS ở zone nếu dùng custom domain.

**Lưu ý:** đây là bộ mã nguồn triển khai ban đầu có cấu hình production-oriented, chưa được deploy vào tài khoản Cloudflare của bạn và chưa được kiểm thử với IDs/secrets thực tế. Thay placeholder và chạy CI trên repository thật trước khi dùng để phát hành binary.
