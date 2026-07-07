# 🏡 OneHOA-Hosted

OneHOA-Hosted is a premium, modern, and fully-featured Homeowners Association (HOA) Management platform. Built using **Next.js 16 (App Router)**, **React 19**, and **MongoDB**, it provides an intuitive, robust dashboard for HOA administrators, presidents, and officers to efficiently coordinate homeowner directories, monitor payment ledgers, print custom ID cards, broadcast announcements, and log system audits.

The application is engineered as a **Progressive Web App (PWA)**, featuring comprehensive offline capability and mobile responsiveness for on-the-go community management.

---

## 🚀 Key Features

### 📊 Modern Dashboard
* **Real-time Analytics:** Visual representation of total registered homeowners, active vs. inactive users, pending registrations, and monthly collections.
* **Quick Actions:** Easy access to register new homeowners, log payments, schedule activities, and broadcast community alerts.

### 👥 Homeowner & Occupant Management
* **Comprehensive Profiles:** Detailed record-keeping including household member relationships, occupant status, employment information, and digital photo uploads.
* **Smart ID Generation:** Built-in A4-compliant front & back **HOA ID Card Generator** (90mm x 60mm) featuring auto-scaling typography and cloud-hosted photo integrations.
* **Archive System:** Soft-delete and archive capability to preserve historical occupancy records.

### 💳 Ledger & Payment Monitoring
* **Dues Tracking:** Comprehensive ledger monitoring to track monthly dues, special assessments, and outstanding balances.
* **Receipt & Invoice Generation:** Customizable print-ready statement of account templates.
* **Thermal Printing Support:** Direct receipt printing integration powered by `react-thermal-printer` for physical transaction records.

### 📅 Community Activities & Notices
* **Community Calendar:** Schedule meetings, neighborhood cleanups, and social events.
* **Public Announcements:** Post notices with digital media support and distribute automatic system notifications to registered users.

### 🔒 Enterprise-Grade Security & Audit Logs
* **Role-Based Access Control (RBAC):** Granular authorization flow restricting high-impact routes (e.g. settings, account creation) to admins and presidents.
* **Automated Audit Logs:** Chronological recording of system activities (creates, updates, status changes, user logins) for accountability.
* **JWT & Bcrypt Auth:** Secure session tokens and robust password hashing with custom complexity criteria.

---

## 🛠️ Tech Stack & Architecture

### Frontend
* **Core:** React 19 (App Router) & Next.js 16.1.6
* **Styling:** Vanilla CSS & CSS Modules for granular, harmonized interface design
* **State & Toasting:** `react-hot-toast` for micro-interactions and asynchronous status tracking

### Backend & Middleware
* **API Architecture:** Next.js Server Components & Next.js Route Handlers
* **Authorization:** JSON Web Token (JWT) stateless auth and custom Next.js Middleware routing engine
* **Database Driver:** Mongoose / MongoDB Atlas driver

### Third-Party Services
* **Media Uploads:** Cloudinary (Dynamic secure image storage & retrieval)
* **Email System:** SMTP relay integrations (Nodemailer) for password reset flows and transactional notifications
* **Receipt Hardware:** `react-thermal-printer` integration for POS/thermal printouts

---

## 🔑 Role-Based Access Matrix

| Feature | Admin | President | Officer | Homeowner / Guest |
| :--- | :---: | :---: | :---: | :---: |
| **System Settings & Backups** | ✅ | ❌ | ❌ | ❌ |
| **Admin & Officer Account Management** | ✅ | ❌ | ❌ | ❌ |
| **Pending Registration Approvals** | ✅ | ✅ | ❌ | ❌ |
| **Homeowner Directory Management** | ✅ | ✅ | ✅ | ❌ (View Only) |
| **Dues & Payment Ledger Tracking** | ✅ | ✅ | ✅ | ❌ |
| **Audit Logs Viewing** | ✅ | ✅ | ❌ | ❌ |
| **Notice Board & Events Posting** | ✅ | ✅ | ✅ | ❌ (View Only) |

---

## 📦 Getting Started & Local Installation

### Prerequisites
Make sure you have the following installed on your local machine:
* **Node.js** (v18.x or above recommended)
* **MongoDB** (Local instance or MongoDB Atlas Connection String)
* **Cloudinary Account** (For profile photos and notice board attachments)
* **SMTP Server Credentials** (e.g. Brevo, Gmail SMTP, Mailtrap)

---

### Step-by-Step Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Kyu020/OneHOA-Hosted.git
cd OneHOA
```

#### 2. Install Project Dependencies
```bash
npm install
```

#### 3. Configure Environment Variables
Create a `.env` file in the root directory. You can use the template below as a guide:

```env
# Database Configuration
MONGODB_URI=mongodb://your-username:your-password@your-atlas-shard-address/OneHOA?ssl=true&authSource=admin

# JWT Authentication
JWT_SECRET=your_super_secure_jwt_secret_key
JWT_EXPIRES_IN=1d

# Client Configuration
CLIENT_ORIGIN=http://localhost:3000

# SMTP / Email Configuration (Brevo/Sendinblue example)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_LOGIN=your_smtp_login_email@example.com
SMTP_PASSWORD=your_smtp_relay_password
EMAIL_FROM="OneHOA Management <no-reply@onehoa.org>"
RESET_CODE_EXPIRY_MINUTES=10

# Cloudinary Integration (Image Uploads)
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name
CLOUDINARY_FOLDER=onehoa/homeowners
CLOUDINARY_ACTIVITY_FOLDER=onehoa/activities
```

#### 4. Run the Development Server
To launch the project locally under hot-reloading:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser to access the landing page.

#### 5. Building for Production
To optimize bundles and serve a production-ready application:
```bash
npm run build
npm run start
```

---

## 📱 Progressive Web App (PWA) Support

OneHOA-Hosted is configured with `@serwist/next` to act as a Progressive Web App (PWA). 

* **Offline Ready:** The service worker caches static assets, fonts, layouts, and public resources so that the interface remains functional during intermittent internet drops.
* **Installable:** Fully compatible with Android, iOS, ChromeOS, and Windows App installation frameworks.
* **Cache Management:** Built on modern Serwist configurations guaranteeing instant loads and background cache sync.

---

## 🏛️ Database Schemas & Data Model

The application leverages a highly normalized Mongoose schema schema design, comprising the following collections:

1. **`users` (`User`):** Officer, President, and Admin accounts including hashed passwords, system statuses, and authorization roles.
2. **`records` (`Record`):** Homeowner records storing details, occupant classification, relationship matrix of household members, digital ID configurations, and soft-delete archives.
3. **`addresses` (`Address`):** Block, Lot, Phase, and physical street address representations mapped to homeowner records.
4. **`pictures` (`Picture`):** Cloudinary secure URLs and file IDs for profile photos.
5. **`payments` (`Payment`):** Dues ledgers, ledger IDs, receipt timestamps, payment formats, amounts, and audit associations.
6. **`activities` (`Activity`):** Neighborhood notices, events, and calendar announcements.
7. **`notifications` (`Notification`):** Inbox messages, community-wide alerts, and read states.
8. **`auditLogs` (`AuditLog`):** Comprehensive system actions recording IP addresses, user operations, and modified documents.
9. **`settings` (`Settings`):** Dynamic global settings including HOA name, default due amounts, and printing specifications.

---

## 🛡️ License

This project is licensed under the **ISC License**. Feel free to use, modify, and build upon this platform for your local communities.

---

## 👥 Authors & Contributions

* Developed by **Kyu020** & **khaynem**.
* Contributions, bug reports, and pull requests are welcome! For major design shifts, please open an issue first to discuss what you'd like to modify.
