# Student Management System (SMS)
## Document 14: AKTU BCS 554 Project Documentation Plan & Report Blueprint

---

### 1. Academic Guidelines Compliance & Standards Overview

This documentation blueprint establishes the exact structural, pedagogical, and typographical compliance framework for the mini-project report required under:
- **University:** Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow.
- **Curriculum:** B.Tech Computer Science & Engineering (CSE).
- **Course Code:** BCS 554 – Internship Assessment / Mini Project.
- **Academic Session:** 2026–2027.

#### 1.1 Strict Institutional Mandates
1. **Report Volume:** The complete final hard-bound report must ordinarily contain **at least 40 pages** of substantive technical documentation.
2. **Plagiarism Ceiling:** Turnitin / Urkund similarity index must remain strictly **below 10%** (excluding title page, certificates, and bibliography).
3. **Continuous Progress Monitoring:** Weekly progress logs signed by the designated Faculty Guide throughout the 4-week execution cycle.
4. **Authenticity:** All architectural diagrams, schema models, test results, and UI screenshots must represent actual implementation artifacts produced during project execution.

---

### 2. Comprehensive Report Structure & Page Distribution

The project report is divided into **Preliminary Front Matter**, **Seven Prescribed Core Chapters**, and **Back Matter**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   AKTU BCS 554 REPORT COMPOSITION                      │
├────────────────────────────┬─────────────────────────────┬─────────────┤
│   PRELIMINARY PAGES        │    SEVEN CORE CHAPTERS      │ BACK MATTER │
│ (Cover, Certs, Decl, Abs)  │ (Ch 1 to Ch 7 - 40+ Pages)  │ (Ref, App)  │
└────────────────────────────┴─────────────────────────────┴─────────────┘
```

#### 2.1 Detailed Section Breakdown & Target Page Budget

| Section / Chapter | Title & Scope | Target Pages |
| :--- | :--- | :---: |
| **Front Matter** | **Preliminary Academic Materials** | ~8 Pages |
| | - Title & Cover Page (Standard AKTU prescribed format with college crest) | 1 |
| | - Certificate of Originality & Institutional Approval (Guide & HOD) | 1 |
| | - Student Declaration | 1 |
| | - Acknowledgements | 1 |
| | - Executive Summary / Abstract | 1–2 |
| | - Table of Contents with Page Indexing | 2 |
| | - List of Figures & List of Tables | 1 |
| **Chapter 1** | **Introduction** | ~6 Pages |
| | 1.1 Academic Project Background & Institutional Need | |
| | 1.2 Problem Statement of Manual Student Administration | |
| | 1.3 Proposed System Solution Overview | |
| | 1.4 Project Objectives (SMART criteria) | |
| | 1.5 Project Scope, Boundaries & Target Personas | |
| | 1.6 Report Organization Structure | |
| **Chapter 2** | **System Requirements & Facilities** | ~6 Pages |
| | 2.1 Hardware Requirements (Development, Server & Client) | |
| | 2.2 Software Environment & Technology Stack Justification | |
| | 2.3 Software Requirements Specification (SRS - IEEE 830) | |
| | 2.4 Functional Requirements (FR) by Domain | |
| | 2.5 Non-Functional Requirements (NFR - Performance, Security) | |
| **Chapter 3** | **System Design & Architecture** | ~10 Pages |
| | 3.1 3-Tier System Architecture Diagram & Description | |
| | 3.2 Data Flow Diagrams (Context Level 0, Level 1, Level 2) | |
| | 3.3 Complete Entity-Relationship (ER) Diagram & Data Dictionary | |
| | 3.4 Role-Based Access Control (RBAC) Permission Matrix | |
| | 3.5 System Workflow & Sequence Diagrams | |
| | 3.6 REST API Endpoint Architecture | |
| **Chapter 4** | **Implementation & Core Algorithms** | ~8 Pages |
| | 4.1 MERN Stack Directory Structure & Monorepo Configuration | |
| | 4.2 Database Schemas & Mongoose Indexing Implementation | |
| | 4.3 Authentication Engine (bcrypt + JWT + Middleware) | |
| | 4.4 Real-Time Attendance Percentage Calculation Algorithm | |
| | 4.5 AKTU 10-Point Grade & SGPA Calculation Engine | |
| | 4.6 Front-End State Management (TanStack Query + React Hook Form)| |
| **Chapter 5** | **Screenshots, Testing & Results** | ~8 Pages |
| | 5.1 Verification & Testing Strategy | |
| | 5.2 Test Case Matrix & Executed Validation Scenarios | |
| | 5.3 User Interface Walkthrough & Annotated Screenshots | |
| | - Admin Dashboard & Master Data Management | |
| | - Faculty Attendance Roll-Call & Marks Entry Interface | |
| | - Student Self-Service Dashboard & Grade Sheet | |
| | 5.4 Performance, Security & Responsive Evaluation Results | |
| **Chapter 6** | **Real-World Applications & Future Scope** | ~4 Pages |
| | 6.1 Practical Deployment in AKTU Affiliated Colleges | |
| | 6.2 Administrative & Environmental ROI (Paperless Campus) | |
| | 6.3 Future Technical Roadmap: | |
| | - Biometric / RFID IoT Hardware Integration | |
| | - Multi-Institutional / Multi-Campus Federation | |
| | - Native Mobile Applications (React Native) | |
| | - Automated SMS / WhatsApp Gateway Integration | |
| **Chapter 7** | **Conclusion** | ~3 Pages |
| | 7.1 Project Synthesis & Summary of Achievements | |
| | 7.2 Academic Learning Outcomes & Engineering Experience | |
| | 7.3 Concluding Remarks | |
| **Back Matter** | **References & Appendices** | ~4 Pages |
| | - References & Bibliography (IEEE / Harvard Citation Format) | 2 |
| | - Appendix A: Key Source Code Listings | 2 |
| | - Appendix B: Weekly Progress Diary / Guide Review Log | 1 |
| **TOTAL** | **Target Final Academic Report Size** | **45–52 Pages** |

---

### 3. Detailed Formatting & Typographical Guidelines

In strict accordance with AKTU Mini Project submission norms, the document must be prepared according to the following layout specifications:

#### 3.1 Page Setup & Margins
- **Page Size:** Standard A4 ($210\text{ mm} \times 297\text{ mm}$).
- **Margins:**
  - Left Margin (Binding Side): **1.25 inches (32 mm)**.
  - Right Margin: **1.0 inch (25.4 mm)**.
  - Top Margin: **1.0 inch (25.4 mm)**.
  - Bottom Margin: **1.0 inch (25.4 mm)**.
- **Header & Footer:**
  - Header: Right-aligned chapter title in 9pt italicized muted font with bottom hairline rule.
  - Footer: Centered page numbers (Roman numerals for Preliminary pages `i, ii, iii...`; Arabic numerals `1, 2, 3...` starting from Chapter 1).

#### 3.2 Typography & Paragraph Styling
- **Body Font:** Times New Roman, regular, **12 pt**.
- **Line Spacing:** **1.5 lines** throughout the body text.
- **Paragraph Alignment:** Fully Justified (`Ctrl + J`).
- **Heading Hierarchy:**
  - Chapter Heading: **16 pt Bold, Centered, Uppercase** (e.g., `CHAPTER 3: SYSTEM DESIGN & ARCHITECTURE`).
  - First-Level Heading (1.1, 1.2): **14 pt Bold, Left-Aligned**.
  - Second-Level Heading (1.1.1): **12 pt Bold, Left-Aligned**.
  - Third-Level Heading: **12 pt Italic, Left-Aligned**.

#### 3.3 Figures, Tables & Mathematical Formulations
- **Figures:** Centered, accompanied by sequential captions beneath the figure:
  - *Format:* `Figure 3.1: High-Level 3-Tier System Architecture`.
- **Tables:** Centered, accompanied by sequential titles above the table:
  - *Format:* `Table 2.1: Software Technology Stack Justification`.
- **Equations:** Displayed centered with right-aligned equation numbering:
  $$\text{SGPA} = \frac{\sum_{i=1}^{n} (C_i \times G_i)}{\sum_{i=1}^{n} C_i} \tag{4.1}$$

---

### 4. Evidence Collection & Authenticity Protocol

To guarantee that the project report reflects genuine, empirical engineering work:
1. **Git Commit History:** Maintain regular, granular Git commits on GitHub demonstrating the incremental evolution of both client and server modules.
2. **Live Deployment URLs:** Prominently cite the live production URLs (Vercel Frontend, Render API, and MongoDB Atlas cluster dashboard) on the report cover and preface.
3. **Real UI Screenshots:** High-resolution screenshots captured directly from the live web application showing sample student data (e.g., AKTU roll numbers, departmental names, real attendance percentages, calculated SGPA).
4. **Plagiarism Verification Certificate:** Run the completed text through institutional anti-plagiarism software prior to binding and include the official summary report confirming $<10\%$ similarity.
