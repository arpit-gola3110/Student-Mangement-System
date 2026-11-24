# Student Management System (SMS)
## AKTU B.Tech CSE Mini Project | Course Code: BCS 554 (Session 2026–27)

---

### Project Overview
An enterprise-grade, full-stack Student Management System engineered for institutions affiliated with **Dr. A.P.J. Abdul Kalam Technical University (AKTU)**. 

### Technology Stack
- **Frontend:** React.js 18, Vite, Tailwind CSS, React Router v6, TanStack Query, Axios, Lucide React, Recharts.
- **Backend:** Node.js, Express.js REST API, JWT authentication, bcryptjs, Helmet, CORS, Rate-Limit.
- **Database:** MongoDB Atlas, Mongoose ODM v8.
- **Deployment:** Vercel (Frontend), Render (Backend), MongoDB Atlas (Database).

---

### Project Directory Structure
```
student-management-system/
├── client/                     # React 18 + Vite + Tailwind CSS Application
│   ├── src/
│   │   ├── components/         # Reusable UI & Layout Components
│   │   ├── context/            # AuthContext & Session Management
│   │   ├── layouts/            # DashboardLayout & Navigation
│   │   ├── pages/              # Role-Based Views (Admin, Faculty, Student)
│   │   ├── services/           # Axios REST API Client
│   │   └── App.jsx             # React Router Configuration
│   └── package.json
│
├── server/                     # Node.js + Express.js REST API Server
│   ├── config/                 # MongoDB Atlas Connection
│   ├── controllers/            # Business Logic & Request Handlers
│   ├── middleware/             # JWT Auth, RBAC Guards, Error Handler
│   ├── models/                 # 14 Mongoose Schema Models & Indexes
│   ├── routes/                 # Express API Endpoint Definitions
│   ├── utils/                  # AKTU Grade Engine & Seed Script
│   └── server.js               # Server Entry Point
│
└── docs/
    └── blueprint/              # Complete 14 Technical Architecture Blueprints
```

---

### Quick Start Guide

#### 1. Backend Server Setup
```bash
cd server
npm install
npm run seed     # Seeds demo Admin, Faculty, Student, Department, Courses
npm run dev      # Starts server on http://localhost:5000
```

#### 2. Frontend Client Setup
```bash
cd client
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

#### 3. Default Demo Credentials
- **System Administrator:** `admin@aktu.ac.in` / `AdminPassword@123`
- **Faculty Instructor:** `faculty@aktu.ac.in` / `FacultyPassword@123`
- **Student Portal:** `student@aktu.ac.in` / `StudentPassword@123`
