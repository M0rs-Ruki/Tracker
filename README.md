# 💰 Notion-Style Finance Tracker

A modern, responsive finance tracking web application with a 7-day calendar view, drag-and-drop organization, AI-powered summaries, and PDF export.

## ✨ Features

- **🔐 Google Authentication** - Secure sign-in with Google OAuth
- **📁 Notion-style Sidebar** - Hierarchical folders with drag-and-drop reordering
- **📅 7-Day Finance Canvas** - Weekly view for tracking daily expenses and income
- **📝 Rich Entry Types** - Support for expense, income, and note entries
- **🤖 AI Summaries** - Daily and weekly AI-generated financial insights (bring your own API key)
- **📊 PDF Export** - Export your weekly finances as PDF
- **💾 Autosave** - Changes are automatically saved
- **🌙 Dark Mode** - Full dark mode support
- **📱 Responsive** - Works on desktop and mobile

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google OAuth credentials

### Setup

1. **Clone and install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy `.env.local.example` to `.env.local` and update:

   ```env
   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017/finance-tracker

   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

   # Google OAuth (from Google Cloud Console)
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret

   # Encryption Key for API Keys
   ENCRYPTION_KEY=generate-with-openssl-rand-base64-32
   ```

3. **Set up Google OAuth:**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable OAuth 2.0
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Copy Client ID and Secret to your `.env.local`

4. **Run the development server:**

   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** NextAuth.js with Google Provider
- **State Management:** Zustand
- **API Client:** Axios
- **Styling:** Tailwind CSS with shadcn/ui components
- **Drag & Drop:** @dnd-kit
- **PDF Export:** jsPDF + html2canvas
- **AI Integration:** OpenAI, Anthropic, Google AI, OpenRouter, HuggingFace

## 📂 Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   │   ├── auth/      # NextAuth configuration
│   │   ├── folder/    # Folder CRUD
│   │   ├── page/      # Page & entry management
│   │   ├── ai/        # AI summary endpoints
│   │   └── export/    # PDF export
│   ├── auth/          # Auth pages
│   ├── dashboard/     # Main dashboard
│   └── page.tsx       # Landing page
├── components/
│   ├── ui/            # shadcn/ui components
│   ├── sidebar.tsx    # Notion-style sidebar
│   ├── page-canvas.tsx # 7-day finance view
│   ├── onboarding.tsx # First-time setup wizard
│   └── ...
├── hooks/             # Custom React hooks
├── lib/               # Utilities & configs
├── models/            # Mongoose models
├── store/             # Zustand store
└── types/             # TypeScript definitions
```

## 🎯 Usage

### First Time Setup

1. Sign in with Google
2. Complete the onboarding wizard:
   - Set your monthly budget
   - Add fixed expenses (rent, subscriptions, etc.)
   - Optionally add AI API keys for summaries

### Creating Pages

1. Click "New Page" in the sidebar
2. Select or create a folder
3. A new 7-day page will be created

### Adding Entries

1. Click on any day column
2. Fill in the entry details:
   - Title
   - Type (expense, income, or note)
   - Amount
   - Optional description
3. Press Enter or click Save

### AI Summaries

- Add your API key in Settings
- Click the AI icon to generate daily or weekly summaries

### PDF Export

- Open a page
- Click the export button to download a PDF

## 📝 License

MIT
