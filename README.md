# Damco FMS v2.0 — Feedback Management System

## Overview
A fully redesigned FMS with:
- **Damco Brand Identity** (Red #E32200, Meiryo/Calibri fonts)
- **4 Role System**: Super Admin, Admin, Manager, Assignee
- **Local JWT Auth** (replaced Azure AD / Microsoft Login)
- **Password Reset with OTP** via MailCatcher
- **Full Responsive Design** (mobile bottom nav, tablet, desktop)
- **User Management Module** (Super Admin CRUD)

---

## 👤 User Credentials

> **Default password for ALL users: `damco@123`**

| Role        | Email                              | Password    |
|-------------|------------------------------------|-------------|
| Super Admin | superadmin@damcogroup.com          | damco@123   |
| Admin       | jessica.gibson@damcogroup.com      | damco@123   |
| Admin       | sayed.muzammil@damcogroup.com      | damco@123   |
| Manager     | rajesh.kapoor@damcogroup.com       | damco@123   |
| Manager     | anita.sharma@damcogroup.com        | damco@123   |
| Assignee    | nishit.singhal@damcogroup.com      | damco@123   |
| Assignee    | tripti.badoni@damcogroup.com       | damco@123   |
| Assignee    | rachna.kohli@damcogroup.com        | damco@123   |

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Node.js 18+
- npm 9+
- (Optional) Ruby + `gem install mailcatcher` for email testing

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed     # Creates all users with damco@123
npm run dev             # Starts on http://localhost:3001
```

### 2. Start MailCatcher (email OTP testing)
```bash
gem install mailcatcher
mailcatcher
# Web UI → http://localhost:1080
# SMTP   → localhost:1025
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev             # Starts on http://localhost:5173
```

Open **http://localhost:5173** → Login with any credential above.

---

## 🐳 Docker (Full Stack)

```bash
# From project root
docker-compose up --build

# Seed the database (first time only)
docker exec fms_backend npm run prisma:seed
```

| Service     | URL                       |
|-------------|---------------------------|
| Frontend    | http://localhost:3000     |
| Backend API | http://localhost:3001     |
| MailCatcher | http://localhost:1080     |

---

## 🔑 Role Permissions

| Feature                 | Super Admin | Admin | Manager | Assignee |
|-------------------------|:-----------:|:-----:|:-------:|:--------:|
| View Dashboard          | ✅          | ✅    | ✅      | ✅       |
| View Feedback List      | ✅          | ✅    | ✅      | ✅       |
| Create Feedback         | ✅          | ✅    | ✅      | ❌       |
| Edit/Update Feedback    | ✅          | ✅    | ✅      | ✅*      |
| User Management (CRUD)  | ✅          | 👁️    | ❌      | ❌       |
| Assign Roles            | ✅          | ❌    | ❌      | ❌       |
| Deactivate Users        | ✅          | ❌    | ❌      | ❌       |

*Assignees can update tickets assigned to them.

---

## 📁 Project Structure

```
fms/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # DB schema (SuperAdmin, Manager added)
│   │   └── seed.ts              # All 8 users seeded with damco@123
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT middleware (replaces Azure AD)
│   │   ├── routes/
│   │   │   ├── auth.ts          # NEW: login, forgot-pwd, OTP, reset-pwd
│   │   │   ├── userManagement.ts# NEW: SuperAdmin user CRUD
│   │   │   ├── feedback.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── employees.ts
│   │   │   └── users.ts
│   │   └── server.ts            # Express app
│   ├── .env                     # JWT_SECRET, MailCatcher config
│   └── package.json             # Added bcryptjs, nodemailer
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.tsx  # JWT auth (replaces MSAL)
│   │   ├── components/
│   │   │   └── common/
│   │   │       ├── AppShell.tsx # Damco branded, mobile bottom nav
│   │   │       └── PrivateRoute.tsx # NEW: auth guard
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx         # Credential login (no MSAL)
│   │   │   ├── ForgotPasswordPage.tsx# NEW: OTP reset flow
│   │   │   └── UserManagementPage.tsx# NEW: SuperAdmin CRUD
│   │   ├── services/api.ts      # Added userMgmtApi, authApi
│   │   └── App.tsx              # Removed MSAL providers
│   ├── tailwind.config.js       # Damco Red #E32200, Meiryo/Calibri
│   └── index.css                # Damco brand styles, mobile utilities
│
└── docker-compose.yml           # Added MailCatcher service
```

---

## 🎨 Damco Brand Guidelines Applied

| Element     | Specification                     |
|-------------|-----------------------------------|
| Primary     | `#E32200` (Damco Red)             |
| Headings    | Meiryo (fallback: Noto Sans)      |
| Body        | Calibri (fallback: Noto Sans)     |
| Icons       | FontAwesome 6 (solid/duotone)     |
| No gradients| ✅ Flat design only               |
| High contrast| ✅ White text on red              |

---

## 🔧 Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL="file:./dev.db"
PORT=3001
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
MAILCATCHER_HOST=localhost
MAILCATCHER_PORT=1025
SMTP_FROM=noreply@damcogroup.com
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:3001
```

---

## 📧 Password Reset (OTP Flow)

1. Click "Forgot Password" on login page
2. Enter registered email → OTP sent to MailCatcher
3. Open http://localhost:1080 → View OTP in email
4. Enter 6-digit OTP (valid 15 minutes)
5. Set new password (min 6 chars)

---

## 🔄 Changes from v1.0

### Removed
- ❌ Microsoft/Azure AD login (MSAL)
- ❌ Demo Admin / Demo Assignee buttons
- ❌ DEMO_MODE environment variable
- ❌ `demoAuth.ts` middleware
- ❌ `MockAuthContext.tsx`
- ❌ `msalConfig.ts`

### Added
- ✅ Local JWT authentication (`bcryptjs`)
- ✅ SuperAdmin role with full system access
- ✅ Manager role (between Admin and Assignee)
- ✅ Password field in `UserRoleModel` (bcrypt hashed)
- ✅ OTP fields for password reset
- ✅ `/api/auth/*` routes (login, forgot, verify-otp, reset)
- ✅ `/api/user-management/*` CRUD routes
- ✅ `UserManagementPage.tsx` (Super Admin UI)
- ✅ `ForgotPasswordPage.tsx` (3-step OTP flow)
- ✅ `PrivateRoute.tsx` (auth guard)
- ✅ Mobile bottom navigation bar
- ✅ MailCatcher integration for email testing
- ✅ Damco Red (#E32200) throughout
- ✅ Meiryo + Calibri typography
- ✅ FontAwesome 6 icons

---

© 2024 Damco Group. Feedback Management System v2.0
