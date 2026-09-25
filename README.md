<div align="center">

# 🌱 AgriConnect
### Crop Yield Optimization & Intelligent Plant Disease Analysis System

**CO2060 Software Systems Design Project**  
**Department of Computer Engineering | Faculty of Engineering | University of Peradeniya (UOP)**

<br/>

[![Live Demo](https://img.shields.io/badge/🚀_Live_Platform-agriconnectsl.vercel.app-059669?style=for-the-badge&logo=vercel&logoColor=white)](https://agriconnectsl.vercel.app/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js_5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Python AI](https://img.shields.io/badge/Python_AI_Engine-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![CI/CD](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)

<br/>

<a href="https://agriconnectsl.vercel.app/" target="_blank">
  <img src="docs/data/cover_page.jpg" alt="AgriConnect Banner" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);" />
</a>

<br/><br/>

👉 **Live Web Application:** [https://agriconnectsl.vercel.app/](https://agriconnectsl.vercel.app/)

<br/>

[🌟 Overview](#-project-overview) •
[🧩 Core Modules](#-core-system-modules) •
[🏛️ Architecture & Tech Flow](#%EF%B8%8F-system-architecture--how-technologies-connect) •
[🛠️ Tech Stack](#%EF%B8%8F-technologies-used) •
[🚀 Installation](#-installation--quickstart) •
[🧪 Testing & QA](#-testing--quality-assurance) •
[👥 Contributors](#-team-mythix--contributors) •
[🔗 Links](#-project-links)

</div>

---

## 🌾 Project Overview

**AgriConnect** is an enterprise-grade digital agriculture platform engineered for the **CO2060 Software Systems Design Project** at the **Department of Computer Engineering, University of Peradeniya**.

In Sri Lanka, the paddy and rice sector faces severe structural bottlenecks:
- **Market Asymmetry & "Rice Mafia":** Monopolistic large millers create artificial scarcity and suppress farmgate purchasing prices, leaving farmers vulnerable.
- **Delayed Disease Intervention:** Slow manual identification of fungal and bacterial infections causes catastrophic yield destruction across major agricultural districts.
- **Unstructured Disaster Relief:** Lack of verifiable, empirical harvest and disaster records prevents transparent government subsidy and relief distribution.

**AgriConnect directly solves these issues by unifying AI diagnostics, smart disaster reporting, and an objective yield-to-point incentive structure on the web:**
🌐 **Explore Live:** [https://agriconnectsl.vercel.app/](https://agriconnectsl.vercel.app/)

---

## 🧩 Core System Modules

The platform is designed around **six integrated modules** that streamline communication, safety, productivity, and fair incentives for Sri Lankan farming communities:

<div align="center">
<table width="100%" border="0" style="border-collapse: separate; border-spacing: 12px;">
  <tr>
    <td width="50%" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 18px; vertical-align: top;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #065f46; font-size: 15px;">🤖 AGRIBOT ADVISORY</strong>
        <span style="font-size: 20px;">🌾</span>
      </div>
      <p style="color: #334155; font-size: 13px; line-height: 1.5; margin: 0;">
        Seeding, modern practices, input use and common crop questions in local language.
      </p>
      <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 10px 0;" />
      <small style="color: #64748b;">
        <strong>Tech Realization:</strong> Automated <code>n8n</code> workflow integration, multilingual Sinhala/Tamil/English translation via <code>i18next</code>, real-time AI query handling via <code>/api/chatbot</code>.
      </small>
    </td>
    <td width="50%" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 18px; vertical-align: top;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #065f46; font-size: 15px;">🔬 AI DISEASE ANALYSIS</strong>
        <span style="font-size: 20px;">🌾</span>
      </div>
      <p style="color: #334155; font-size: 13px; line-height: 1.5; margin: 0;">
        Photo screening with confidence, prevention guidance and expert escalation.
      </p>
      <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 10px 0;" />
      <small style="color: #64748b;">
        <strong>Tech Realization:</strong> Deep Learning CNN microservice (PyTorch/OpenCV) hosted at <code>ai-plant-disease-scanner.onrender.com</code>, identifying 6 pathologies with dynamic confidence scoring and agronomic treatments.
      </small>
    </td>
  </tr>
  <tr>
    <td width="50%" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 18px; vertical-align: top;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #065f46; font-size: 15px;">🌊 FLOOD ALERTS</strong>
        <span style="font-size: 20px;">🌾</span>
      </div>
      <p style="color: #334155; font-size: 13px; line-height: 1.5; margin: 0;">
        Location-based flood-risk updates help farmers prepare early and reduce losses.
      </p>
      <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 10px 0;" />
      <small style="color: #64748b;">
        <strong>Tech Realization:</strong> Geo-targeted environmental risk ingestion via <code>/api/flood</code>, spatial coordinate evaluation, early precipitation monitoring to safeguard standing crops.
      </small>
    </td>
    <td width="50%" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 18px; vertical-align: top;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #065f46; font-size: 15px;">🚨 DISASTER REPORTING</strong>
        <span style="font-size: 20px;">🌾</span>
      </div>
      <p style="color: #334155; font-size: 13px; line-height: 1.5; margin: 0;">
        Farmers submit flood, drought or crop-damage reports with status tracking.
      </p>
      <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 10px 0;" />
      <small style="color: #64748b;">
        <strong>Tech Realization:</strong> Geotagged damage submission portal with photo evidence upload via <code>Supabase Storage</code>, real-time lifecycle tracking, and agricultural officer verification boards.
      </small>
    </td>
  </tr>
  <tr>
    <td width="50%" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 18px; vertical-align: top;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #065f46; font-size: 15px;">📩 INQUIRIES</strong>
        <span style="font-size: 20px;">🌾</span>
      </div>
      <p style="color: #334155; font-size: 13px; line-height: 1.5; margin: 0;">
        Farmers can report any cultivation loss with proves efficiently and quickly. They can monitor the status of their inquiries via the system.
      </p>
      <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 10px 0;" />
      <small style="color: #64748b;">
        <strong>Tech Realization:</strong> Dedicated backend inquiry pipeline (<code>/api/inquiries</code>), proof attachment handling, status progression (Pending ➔ In Review ➔ Resolved), and officer messaging.
      </small>
    </td>
    <td width="50%" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 18px; vertical-align: top;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #065f46; font-size: 15px;">🏆 YIELD + POINTS</strong>
        <span style="font-size: 20px;">🌾</span>
      </div>
      <p style="color: #334155; font-size: 13px; line-height: 1.5; margin: 0;">
        Verified yield plus disaster context supports fair recognition, subsidies and targeted benefits.
      </p>
      <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 10px 0;" />
      <small style="color: #64748b;">
        <strong>Tech Realization:</strong> Automated benchmark evaluation against district/island averages (<code>/api/avg-yields</code>), formulaic point crediting, verifiable PDF certification via <code>jsPDF</code>.
      </small>
    </td>
  </tr>
</table>
</div>

---

## 🏛️ System Architecture & How Technologies Connect

The diagram below illustrates how every user touchpoint, module interface, REST API gateway, AI classification engine, and cloud component interoperate:

<div align="center">
  <img src="docs/images/system_architecture.svg" alt="AgriConnect System Architecture Diagram" width="100%" style="border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);" />
</div>

<br/>

### 🔄 End-to-End Technology Interconnection (Mermaid)

```mermaid
flowchart TB
    subgraph MODULES["6 Core System Modules"]
        M1["🤖 Agribot Advisory"]
        M2["🔬 AI Disease Analysis"]
        M3["🌊 Flood Alerts"]
        M4["🚨 Disaster Reporting"]
        M5["📩 Cultivation Inquiries"]
        M6["🏆 Yield + Points Engine"]
    end

    subgraph FRONTEND["Frontend SPA (React 18 + TypeScript + Vite)"]
        UI["🎨 Tailwind CSS v4 & Radix UI"]
        GIS["🗺️ Leaflet GIS & SL District Heatmap"]
        I18N["🌐 i18next (Sinhala, Tamil, English)"]
        AXIOS["📡 Axios Client (JWT Interceptor)"]
        DOCS["📄 jsPDF & html2canvas Certificate Export"]
    end

    subgraph GATEWAY["Backend API Gateway (Express 5 & Node.js)"]
        SEC["🛡️ Helmet & Express Rate Limiter"]
        AUTH["🔑 JWT Authentication Middleware"]
        ROUTERS["🔀 Routers: /api/farms, /api/users, /api/inquiries, /api/flood"]
        BENCHMARK["📊 Benchmark Calculation Engine"]
        HEATMAP_AGG["📍 6-Month District Disease Aggregator"]
    end

    subgraph MICROSERVICES["AI & External Services"]
        PY_AI["🤖 Python AI Microservice (ai-plant-disease-scanner)"]
        N8N["⚡ n8n Webhook AI Chatbot Engine"]
        SUPABASE["☁️ Supabase Cloud Storage (Crop Images & Proofs)"]
        NODEMAILER["📧 Nodemailer SMTP (OTP & Critical Alerts)"]
        METEO["🌧️ Hydrological & Meteorological APIs"]
    end

    subgraph PERSISTENCE["Database Layer (MongoDB Atlas)"]
        DB[("🍃 MongoDB Atlas")]
        INDEXES["⚡ Compound Indexes for Sub-millisecond District Queries"]
        COLLECTIONS["📦 Collections: users, farms, avgYields, diseaseReports, inquiries"]
    end

    subgraph DEVOPS["DevOps & CI/CD Pipeline"]
        GHA["🐙 GitHub Actions"]
        VERCEL["▲ Vercel Production: agriconnectsl.vercel.app"]
        RENDER["🚀 Render Production: Node.js API"]
    end

    %% Wiring
    MODULES --> FRONTEND
    FRONTEND -->|REST / JSON with Bearer Token| GATEWAY
    GATEWAY -->|Mongoose ODM / Compound Indexes| DB
    DB --- INDEXES
    DB --- COLLECTIONS

    M1 -.->|Relays Chat Inquiries| N8N
    M2 -.->|Uploads Leaf Image & Triggers CNN| PY_AI
    M3 -.->|Fetches Live Weather Coordinates| METEO
    M4 & M5 -.->|Uploads Photo Proofs| SUPABASE
    M6 -.->|Calculates Subsidy Points & Averages| BENCHMARK
    GATEWAY -.->|Dispatches Security OTPs| NODEMAILER

    GHA -->|Auto Test & Deploy Frontend| VERCEL
    GHA -->|Auto Test & Deploy Backend| RENDER
```

### 🔗 Technical Connectivity Highlights:
1. **Client & Multi-Language UI:**
   - Deployed at **[agriconnectsl.vercel.app](https://agriconnectsl.vercel.app/)**, users interact with localized screens in English, Sinhala, or Tamil.
2. **Secure Communication Pipeline:**
   - Centralized Axios interceptors (`services/api.ts`) automatically inject `Authorization: Bearer <token>` into outgoing requests.
3. **AI Disease Analysis Connectivity:**
   - When a farmer uploads an affected leaf image, it is stored in **Supabase Storage** and dispatched via POST to the **Python Deep Learning microservice** (`ai-plant-disease-scanner.onrender.com/api/predict_url`).
   - The model evaluates 6 classes (*Bacterial Leaf Blight, Brown Spot, Leaf Blast, Leaf Scald, Narrow Brown Spot, Healthy Leaf*) and returns class confidence distributions.
4. **Disease Heatmap Aggregation:**
   - Backend groups disease incidents across all 25 districts over the past 6 months, feeding the **Leaflet GIS** map with live outbreak density colors.
5. **Yield-to-Point Incentive Math:**
   - Harvest inputs are compared against regional rolling averages (`/api/avg-yields`), immediately computing earned points for transparent subsidy redemption.

---

## 🛠️ Technologies Used

### 🎨 Frontend Layer
| Technology | Badge | Purpose |
| :--- | :--- | :--- |
| **React 18** | ![React](https://img.shields.io/badge/React_18-20232A?style=flat&logo=react&logoColor=61DAFB) | Dynamic SPA component architecture |
| **TypeScript 5** | ![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=flat&logo=typescript&logoColor=white) | Strict type safety, clean interfaces, and error prevention |
| **Vite 6** | ![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=flat&logo=vite&logoColor=white) | Ultra-fast SWC bundling and developer HMR |
| **Tailwind CSS v4** | ![Tailwind](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white) | Utility-first modern responsive UI design |
| **Radix UI** | ![Radix](https://img.shields.io/badge/Radix_UI-161618?style=flat&logo=radix-ui&logoColor=white) | Accessible, unstyled UI primitives |
| **Leaflet GIS** | ![Leaflet](https://img.shields.io/badge/Leaflet_GIS-199900?style=flat&logo=leaflet&logoColor=white) | Interactive 25-district disease heatmap visualization |
| **i18next** | ![i18next](https://img.shields.io/badge/i18n-26A69A?style=flat&logo=i18next&logoColor=white) | Tri-lingual localization (English, Sinhala, Tamil) |
| **Recharts** | ![Recharts](https://img.shields.io/badge/Recharts-22b5bf?style=flat) | Visual harvest performance charts & officer analytics |
| **jsPDF & html2canvas** | ![jsPDF](https://img.shields.io/badge/jsPDF-E11D48?style=flat) | Client-side verifiable harvest & subsidy PDF creation |

### ⚙️ Backend & API Gateway
| Technology | Badge | Purpose |
| :--- | :--- | :--- |
| **Node.js 20** | ![Node](https://img.shields.io/badge/Node.js_20-339933?style=flat&logo=nodedotjs&logoColor=white) | Asynchronous event-driven server runtime |
| **Express.js 5** | ![Express](https://img.shields.io/badge/Express_5-000000?style=flat&logo=express&logoColor=white) | RESTful API routing, controllers, and middleware |
| **Mongoose ODM** | ![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat&logo=mongoose&logoColor=white) | Schema modeling, compound indexing, and validation |
| **JWT & bcrypt** | ![JWT](https://img.shields.io/badge/JWT_Auth-000000?style=flat&logo=jsonwebtokens&logoColor=white) | Stateless authentication and salted password hashing |
| **Helmet & Rate Limit**| ![Helmet](https://img.shields.io/badge/Helmet_Security-4B5563?style=flat) | HTTP security headers and DDoS rate limiting |
| **Nodemailer** | ![Nodemailer](https://img.shields.io/badge/Nodemailer-0F9D58?style=flat) | Automated email verification and OTP dispatch |

### 🤖 AI, Automation & Cloud
| Technology | Badge | Purpose |
| :--- | :--- | :--- |
| **Python Computer Vision** | ![Python](https://img.shields.io/badge/Python_AI-3776AB?style=flat&logo=python&logoColor=white) | Deep Learning / OpenCV rice disease classification engine |
| **n8n Automation** | ![n8n](https://img.shields.io/badge/n8n_Workflow-EA4B71?style=flat&logo=n8n&logoColor=white) | Webhook-driven conversational AgriBot advisory |
| **MongoDB Atlas** | ![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-4EA94B?style=flat&logo=mongodb&logoColor=white) | High-availability cloud NoSQL database |
| **Supabase Storage** | ![Supabase](https://img.shields.io/badge/Supabase_Storage-3ECF8E?style=flat&logo=supabase&logoColor=white) | Cloud object bucket storage for crop images and proofs |

### 🚀 DevOps, Deployment & QA
| Technology | Badge | Purpose |
| :--- | :--- | :--- |
| **Vercel** | ![Vercel](https://img.shields.io/badge/Vercel_Hosting-000000?style=flat&logo=vercel&logoColor=white) | Production deployment for frontend: `agriconnectsl.vercel.app` |
| **Render** | ![Render](https://img.shields.io/badge/Render_Cloud-46E3B7?style=flat&logo=render&logoColor=black) | Production deployment for Node.js REST API service |
| **GitHub Actions** | ![GHA](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=github-actions&logoColor=white) | Full-stack CI/CD automated test and deployment pipeline |
| **Docker & Compose** | ![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat&logo=docker&logoColor=white) | Multi-container local and production orchestration |
| **Vitest & RTL** | ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat&logo=vitest&logoColor=white) | Unit and component testing suite |
| **Jest & Supertest**| ![Jest](https://img.shields.io/badge/Jest-C21325?style=flat&logo=jest&logoColor=white) | Backend endpoint integration and security tests |
| **Playwright** | ![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white) | Cross-browser End-to-End user flow test automation |
| **Apache JMeter** | ![JMeter](https://img.shields.io/badge/Apache_JMeter-D22128?style=flat&logo=apachejmeter&logoColor=white) | Stress, breakpoint, spike, and load testing suite |

---

## 📸 System Demonstration

<div align="center">
  <table width="100%">
    <tr>
      <td width="50%" align="center">
        <a href="https://agriconnectsl.vercel.app/" target="_blank">
          <img src="docs/data/thumbnail.jpg" alt="AgriConnect Dashboard" width="100%" style="border-radius: 8px;" />
        </a>
        <br/>
        <em>Fig 1: AgriConnect Agricultural Overview & Analytics</em>
      </td>
      <td width="50%" align="center">
        <a href="https://agriconnectsl.vercel.app/" target="_blank">
          <img src="code/frontend/src/assets/sri_lanka_heatmap.png" alt="Disease Heatmap" width="100%" style="border-radius: 8px;" />
        </a>
        <br/>
        <em>Fig 2: 25 Districts Plant Disease Heatmap</em>
      </td>
    </tr>
  </table>
</div>

---

## 🚀 Installation & Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
- [npm](https://www.npmjs.com/) (v9.x or later)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)
- [Docker](https://www.docker.com/) *(Optional, for containerized run)*

### 1. Clone the Repository
```bash
git clone https://github.com/cepdnaclk/e22-co2060-Crop-Yield-Optimization-and-Intelligent-Plant-Disease-Analysis.git
cd e22-co2060-Crop-Yield-Optimization-and-Intelligent-Plant-Disease-Analysis
```

### 2. Configure Backend Environment
Create `code/backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/cropYieldDB?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
FRONTEND_URL=http://localhost:3000
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
CHATBOT_WEBHOOK_URL=https://n8n-opvk.onrender.com/webhook/d3d42ea4-6323-495c-b7c7-09075db3cdca/chat
```

### 3. Configure Frontend Environment
Create `code/frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Locally

#### Option A: Running with npm
```bash
# Terminal 1: Backend Service
cd code/backend
npm install
npm start

# Terminal 2: Frontend Service
cd code/frontend
npm install
npm run dev
```
- Frontend: **http://localhost:3000** (or `http://localhost:5173`)
- Backend API: **http://localhost:5000**
- Online Deployed Platform: **[https://agriconnectsl.vercel.app/](https://agriconnectsl.vercel.app/)**

#### Option B: Running with Docker Compose
```bash
cd code
docker-compose up --build
```

---

## 🧪 Testing & Quality Assurance

AgriConnect includes a comprehensive testing suite across all tiers:

### 1. Frontend Unit & Integration Tests (Vitest)
```bash
cd code/frontend
npm run test
```

### 2. Backend API & Security Tests (Jest & Supertest)
```bash
cd code/backend
npm test
```

### 3. End-to-End User Flow Tests (Playwright)
```bash
cd code/frontend
npm run test:e2e
```

### 4. Load & Performance Testing (Apache JMeter)
Automated test scripts located in `JMeter Tests/`:
- `Test 1.1` - Concurrency Stress Testing
- `Test 2.1` - System Breakpoint Determination
- `Test 3.0` - High-Traffic Spike Testing
- `Test 4.0` - Multipart Leaf Image Upload Stress Test
- `Test 5.0` - Yield & Points Incentive Engine Calculation Under Load
- `Test 6.0` - Security & Authentication Regression Testing

---

## 👥 Team Mythix & Contributors

This project was developed for **CO2060 Software Systems Design Project** by undergraduate students of the **Department of Computer Engineering, Faculty of Engineering, University of Peradeniya**:

<div align="center">
<table border="0" style="margin: 0 auto; text-align: center; border-collapse: collapse;">
  <tr>
    <td align="center" width="25%" style="padding: 16px;">
      <a href="https://people.ce.pdn.ac.lk/students/e22/130/" target="_blank">
        <img src="https://people.ce.pdn.ac.lk/images/students/e22/e22130.jpg" width="130" height="130" style="border-radius: 50%; object-fit: cover; border: 3px solid #10b981; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" alt="S. H. S. Hansara" />
      </a>
      <br/>
      <strong>S. H. S. Hansara</strong>
      <br/>
      <small><strong>E/22/130</strong></small>
      <br/>
      <span style="display:inline-block; margin-top:4px; padding:2px 8px; background:#dcfce7; color:#15803d; border-radius:12px; font-size:11px; font-weight:600;">Product Owner</span>
      <br/>
      <a href="mailto:e22130@eng.pdn.ac.lk">
        <img src="https://img.shields.io/badge/Email-e22130-informational?style=flat-square&logo=gmail&logoColor=white" alt="Email" />
      </a>
    </td>
    <td align="center" width="25%" style="padding: 16px;">
      <a href="https://people.ce.pdn.ac.lk/students/e22/008/" target="_blank">
        <img src="https://people.ce.pdn.ac.lk/images/students/e22/e22008.jpg" width="130" height="130" style="border-radius: 50%; object-fit: cover; border: 3px solid #0284c7; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" alt="T. H. Abeywickrama" />
      </a>
      <br/>
      <strong>T. H. Abeywickrama</strong>
      <br/>
      <small><strong>E/22/008</strong></small>
      <br/>
      <span style="display:inline-block; margin-top:4px; padding:2px 8px; background:#e0f2fe; color:#0369a1; border-radius:12px; font-size:11px; font-weight:600;">Team Leader</span>
      <br/>
      <a href="mailto:e22008@eng.pdn.ac.lk">
        <img src="https://img.shields.io/badge/Email-e22008-informational?style=flat-square&logo=gmail&logoColor=white" alt="Email" />
      </a>
    </td>
    <td align="center" width="25%" style="padding: 16px;">
      <a href="https://people.ce.pdn.ac.lk/students/e22/126/" target="_blank">
        <img src="https://people.ce.pdn.ac.lk/images/students/e22/e22126.jpg" width="130" height="130" style="border-radius: 50%; object-fit: cover; border: 3px solid #6366f1; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" alt="H. P. J. Gunawardhana" />
      </a>
      <br/>
      <strong>H. P. J. Gunawardhana</strong>
      <br/>
      <small><strong>E/22/126</strong></small>
      <br/>
      <span style="display:inline-block; margin-top:4px; padding:2px 8px; background:#ede9fe; color:#6d28d9; border-radius:12px; font-size:11px; font-weight:600;">Project Collaborator</span>
      <br/>
      <a href="mailto:e22126@eng.pdn.ac.lk">
        <img src="https://img.shields.io/badge/Email-e22126-informational?style=flat-square&logo=gmail&logoColor=white" alt="Email" />
      </a>
    </td>
    <td align="center" width="25%" style="padding: 16px;">
      <a href="https://people.ce.pdn.ac.lk/students/e22/135/" target="_blank">
        <img src="https://people.ce.pdn.ac.lk/images/students/e22/e22135.jpg" width="130" height="130" style="border-radius: 50%; object-fit: cover; border: 3px solid #ec4899; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" alt="H. T. D. Hatharasinghe" />
      </a>
      <br/>
      <strong>H. T. D. Hatharasinghe</strong>
      <br/>
      <small><strong>E/22/135</strong></small>
      <br/>
      <span style="display:inline-block; margin-top:4px; padding:2px 8px; background:#fce7f3; color:#be185d; border-radius:12px; font-size:11px; font-weight:600;">Project Collaborator</span>
      <br/>
      <a href="mailto:e22135@eng.pdn.ac.lk">
        <img src="https://img.shields.io/badge/Email-e22135-informational?style=flat-square&logo=gmail&logoColor=white" alt="Email" />
      </a>
    </td>
  </tr>
</table>
</div>

---

## 🏛️ Academic Affiliation & Supervision

- **Course:** CO2060 — Software Systems Design Project
- **Academic Department:** [Department of Computer Engineering](http://www.ce.pdn.ac.lk/)
- **Faculty:** [Faculty of Engineering](https://eng.pdn.ac.lk/)
- **University:** [University of Peradeniya (UOP)](https://www.pdn.ac.lk/)

---

## 🔗 Project Links

- 🌐 **Live Web Application:** [https://agriconnectsl.vercel.app/](https://agriconnectsl.vercel.app/)
- 📖 **Project Web Page:** [cepdnaclk.github.io/e22-co2060-Crop-Yield-Optimization-and-Intelligent-Plant-Disease-Analysis](https://cepdnaclk.github.io/e22-co2060-Crop-Yield-Optimization-and-Intelligent-Plant-Disease-Analysis)
- 🐙 **Source Repository:** [github.com/cepdnaclk/e22-co2060-Crop-Yield-Optimization-and-Intelligent-Plant-Disease-Analysis](https://github.com/cepdnaclk/e22-co2060-Crop-Yield-Optimization-and-Intelligent-Plant-Disease-Analysis)
- 🏛️ **Department of Computer Engineering:** [people.ce.pdn.ac.lk](https://people.ce.pdn.ac.lk/)

---

<div align="center">
  <sub>Developed with pride by Team Mythix for the CO2060 Software Systems Design Project • Department of Computer Engineering, University of Peradeniya</sub>
</div>
