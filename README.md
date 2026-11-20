# SmartStock Workspace (v3.0) 📦

A modern, neo-brutalist warehouse inventory telemetry and management platform built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

![SmartStock Overview](https://bolt.new/static/og_default.png)

---

## ⚡ Features

- **Real-Time Telemetry & Inventory**: Live stock levels, bay capacity tracking, inbound/outbound flow velocity.
- **AI Warehouse Copilot (Pip AI)**: Automated restock recommendations, predictive stockout detection, and clearance promotions.
- **Stock Movement Operations**: Quick actions to receive cargo, dispatch van manifests, and adjust bin stock.
- **Authentication & User Management**:
  - Secure sign-in and sign-up powered by Supabase Auth and local session fallbacks.
  - One-click **⚡ Instant Demo Access** for test drivers and reviewers.
  - Profile dropdown with active role badge (`Super Admin`) and instant sign-out.
- **Error Resilience**: React Error Boundary and graceful fallback state for uninterrupted warehouse operations.
- **Vercel Ready**: Pre-configured SPA rewrite rules in `vercel.json` for seamless production hosting.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root (reference `.env.example`):

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-publishable-key"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-publishable-key"
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for Production
```bash
npm run build
```

---

## ☁️ Deployment on Vercel

1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com/new).
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. Vercel will build and host your app with SPA routing pre-configured via `vercel.json`.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Space Grotesk, DM Sans, Neo-Brutalist design system
- **Icons**: Lucide React
- **Backend / Database**: Supabase (PostgreSQL, Row Level Security, Realtime)
- **Deployment**: Vercel
