# 🎓 Academic Management Dashboard — Premium Emerald Edition

A state-of-the-art, high-performance Academic Management System (AMS) built for administrative excellence. This platform features a harmonized **Premium Emerald** design system, robust architectural patterns, and full-spectrum management for Students, Courses, Faculty, and Enrollments.

🚀 **[Live Demonstration](https://academic-dashboard-0up4.onrender.com/)**

---

## 💎 Design Philosophy: The Premium Emerald Aesthetic

The dashboard employs a custom-crafted design system focused on visual hierarchy, deep slate tones, and vibrant emerald accents.
- **Glassmorphic Elements**: Subtle backdrop blurs and translucent borders for a sophisticated feel.
- **Unified Detail Layouts**: A centralized infrastructure for entity views with integrated hero sections and contextual actions.
- **Micro-interactions**: Smooth hover transitions and dynamic scaling to enhance user engagement.
- **Responsive Mastery**: Fluid grid systems optimized for everything from ultra-wide monitors to mobile devices.

## 🛠️ Core Capabilities

### 🏢 Faculty & Personnel Management
- **Role-protected dashboard**: Faculty can access assigned course rosters and grade tools, plus the institution-wide student directory with audited profile updates.
- **Professional Portfolios**: Detailed identity panels with verification badges and contact portals.
- **Service Termination Flow**: Integrated modal-based management for personnel records.

### 📚 Academic Catalog (Courses)
- **Live Registry**: Real-time course tracking with credit-unit visualization.
- **Class Rosters**: Instant access to student enrollment history per course.
- **Statistics Engine**: Visualize total enrollment, completion rates, and leanings at a glance.
- **Faculty enrollment management**: Faculty can enroll any registered student in any available course, subject to duplicate enrollment validation.
- **Academic activity**: Faculty and Super Admins can manage attendance, course announcements, and weekly class/examination timetables. Faculty management is scoped to their assigned courses.

### 👤 Student Information System
- **Profile Archiving**: Comprehensive academic transcripts and GPA tracking.
- **Enrollment History**: Dynamic tables showing course status, semester cycles, and verified grades.
- **Academic activity**: Students can view their attendance history and course percentages, announcements for enrolled courses, and term-matched weekly timetables and upcoming examinations.
- **Search & Filter**: Advanced filtering by academic year and department.

## 🏗️ Technical Architecture

### **The Stack**
- **Framework**: [Next.js](https://nextjs.org/) (Pages Router) for optimal SEO and SSR performance.
- **Language**: [TypeScript](https://www.typescriptlang.org/) with strict typing for enterprise-grade reliability.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a custom design token system.
- **Validation**: [Zod](https://zod.dev/) for type-safe schema validation across forms and API routes.
- **Icons**: [Lucide-React](https://lucide.dev/) for a consistent, accessible iconography.

### **Server-Side & Data Strategy**
- **MySQL 8**: Academic records, role accounts, sessions, and audit events are stored in MySQL with foreign keys, unique constraints, indexes, parameterized queries, and SQL migrations.
- **Optimized SSR**: Direct database access in `getServerSideProps` to bypass network latency and ensure instant page loads for detail views.
- **Password/session security**: Passwords use Node.js scrypt hashes; opaque random session tokens are stored only as SHA-256 hashes and delivered through HttpOnly, SameSite=Strict cookies. Production cookies use Secure and the `__Host-` prefix.
- **Role and record-level authorization**: API routes and protected server-rendered detail pages check role and linked student/faculty/course relationships.

The `db.json` file remains a migration seed, not the live system of record. The migration command imports existing `data/db.json` first (if present), otherwise root `db.json`, without overwriting records with matching IDs. Back up both source files and the MySQL database before migration.

### **Verified scope and current limitations**
- Three sign-in choices are provided: Student, Faculty, and Super Admin. Admin-created Student/Faculty accounts must change their initial password; administrators can deactivate accounts and issue one-time temporary password resets.
- Super Admin can manage institutional student/course/faculty/enrollment records, accounts, audit logs, attendance, announcements, and timetables. Faculty can view and update the existing student profile fields in the institution-wide directory and view the shared course catalog. Faculty can edit course names and departments only for courses assigned to their profile; course codes, credits, and assignments remain protected. Faculty can create enrollments for any student and course, update enrollment grades/status, and cancel active enrollments; these actions are audited. Faculty attendance, announcement, and timetable management remains scoped to assigned courses. Students can read only their own linked profile and enrollment/activity records.
- Academic GPA and grade data are descriptive records, not predictions. Automated announcement notifications, MFA, ML predictions, recovery automation, and full profile self-service are not implemented.
- This application has not been penetration tested. Configure TLS, database network restrictions, encrypted backups, IAM, and operational monitoring before production use.

### **Architecture Decisions**

**Why Custom REST API and MySQL?**
The project implements a **Custom REST API using Next.js API Routes** and a MySQL-backed service layer. This architectural choice was made to:
1.  **Enforce Strict Type Safety**: Utilizing TypeScript and Zod to validate every request payload, ensuring data integrity that "dummy" APIs cannot match.
2.  **Implement Complex Business Logic**: The custom backend allows for relationship validation (e.g., ensuring a student exists before enrolling them in a course) which is impossible with static JSON placeholder APIs.
3.  **Transactional account setup**: User accounts and linked academic profiles are provisioned in a single database transaction.

## 📂 Project Blueprint

```bash
academic-dashboard/
├── src/
│   ├── components/
│   │   ├── dashboard/       # Specialized chart and stat components
│   │   ├── forms/           # Robust validated form systems
│   │   ├── layout/          # Unified DetailLayout & Global Header
│   │   └── ui/              # Atom-level design components (Card, etc.)
│   ├── lib/
│   │   ├── auth.ts          # Password hashing, sessions, and authorization helpers
│   │   ├── database.ts      # MySQL connection pool
│   │   └── validators.ts    # Centralized Zod validation schemas
│   ├── pages/
│   │   ├── api/             # Authenticated, role-checked REST endpoints
│   │   ├── faculty/         # Specialized dashboard & detail routes
│   │   └── students/        # SIP pages & analytics
│   ├── services/            # Abstracted API communication layer
│   └── types/               # Global TypeScript definitions
│
├── migrations/              # MySQL schema
├── scripts/                 # Migration and first-admin CLI
├── db.json                  # Initial/legacy migration seed
└── next.config.ts           # Framework configuration
```

## 🚀 Deployment & Local Setup

### Prerequisites
- Node.js 20.9 or higher (required by Next.js 16)
- MySQL 8.0.16 or higher (for enforced CHECK constraints)
- npm or yarn

### Quick Start
1. **Clone & Navigate**
   ```bash
   git clone https://github.com/dileepkumargs/AWS-Based-Smart-Student-Academic-Management-and-Performance-Analysis-System.git
   cd AWS-Based-Smart-Student-Academic-Management-and-Performance-Analysis-System
   ```
2. **Install Ecosystem**
   ```bash
   npm ci
   ```
3. **Configure MySQL**

   Create the database in MySQL:
   ```sql
   CREATE DATABASE academic_dashboard
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_0900_ai_ci;
   ```

   In Windows PowerShell, copy the environment template and edit the local copy:
   ```powershell
   Copy-Item .env.example .env.local
   notepad .env.local
   ```
   Set `DATABASE_URL` to the URL for the MySQL database you created and set `DATABASE_SSL=false` for local MySQL. Keep `.env.local` private; it is ignored by Git. Do not use the example placeholder credentials.
4. **Launch Development Workspace**
   ```bash
   npm run db:migrate
   npm run db:create-super-admin -- admin@institution.edu
   npm run dev
   ```

The first Super Admin is created only by the one-time interactive CLI command. It asks for the password without echoing it, requires 12+ characters, refuses to run if a Super Admin already exists, and stores only a password hash. Do not add a default administrator or store passwords in environment files.

Required environment variables:
- `DATABASE_URL`: MySQL URL, for example `mysql://academic_app:password@127.0.0.1:3306/academic_dashboard`. URL-encode special characters in the username or password. Create the database before running migrations, and use a least-privilege database user.
- `DATABASE_SSL`: set `true` for TLS connections to managed MySQL (including Amazon RDS for MySQL); local MySQL can use `false`.

The migration imports existing seed data without overwriting conflicting IDs and applies the numbered SQL migrations in `migrations/`. This includes the enrollment branch and year-of-study fields. Review the data snapshot and database before running it; make a backup first.

### Production Build
```bash
npm run build
npm start
```

### ☁️ AWS deployment considerations

- **Amazon EC2**: Run the Node.js app behind TLS termination and set `DATABASE_URL` to Amazon RDS. Restrict inbound database traffic to the application security group.
- **Amazon RDS**: Use MySQL 8.0.16+ with encryption, automated backups, point-in-time recovery, and TLS; create an application DB user with only the required schema permissions.
- **Amazon S3**: Do not use S3 as a directly writable database file. It can hold backups or protected documents after adding appropriate authorization and encryption.
- **IAM and CloudWatch**: Keep AWS access in an instance/task IAM role; do not put credentials in source files. Forward logs/metrics to CloudWatch and alert on authentication and database failures.
- **Render/Vercel/serverless**: Configure the required MySQL `DATABASE_URL` secret and TLS. No live cloud resources or AWS credentials are configured by this repository.

## 🤝 Acknowledgments
Crafted with passion by **Tanvir Mahtab Rafat**. This project serves as a showcase of modern web architecture, clean code principles, and premium UI/UX design.

---
**⭐ If this architecture inspires your next project, feel free to give it a star!**
