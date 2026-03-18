# Oracle ICS Frontend - Customer Panel

Đây là frontend cho khách hàng/người dùng của Oracle Cloud Vietnam. Trang này cho phép người dùng:

- Đăng nhập và đăng ký tài khoản
- Xem và lựa chọn các gói dịch vụ (Starter, Professional, Enterprise, AI)
- Quản lý subscription của mình
- Quản lý ví tài khoản
- Xem thông tin tài khoản cá nhân
- Thanh toán qua QR code hoặc ví tài khoản

## Lưu ý

- **Admin Panel** đã được tách sang folder riêng: `admin_oracle-ics-frontend`
- Frontend này chỉ dành cho khách hàng/người dùng thường
- Backend dùng chung với admin panel

## Cài đặt

```bash
pnpm install
pnpm dev
```

## Biến môi trường

Tạo file `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3003
```

## Port

Mặc định chạy trên port **3000** (khách hàng)

## Kết nối Backend

Backend API được cấu hình ở `NEXT_PUBLIC_API_URL`

## Cấu trúc thư mục

```
app/
  - layout.tsx          # Root layout
  - page.tsx            # Homepage
  - login/              # Trang đăng nhập
  - register/           # Trang đăng ký
  - profile/            # Quản lý hồ sơ cá nhân
  - package-management/ # Quản lý gói dịch vụ
  - add-funds/          # Nạp tiền vào ví
  - checkout/           # Thanh toán
  - cloud/              # Quản lý VM instances
  - ...

api/                    # API client functions
components/             # React components
  - layout/             # Header, Footer
  - ui/                 # UI components (Card, Button, etc.)
  - auth/               # Authentication components
  - providers/          # Context providers
lib/                    # Utilities
hooks/                  # Custom React hooks
i18n/                   # Translations (vi, en, ja, ko, zh)
types/                  # TypeScript types
```
