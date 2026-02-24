# CaseCut Frontend Setup Guide

## Prerequisites
- Node.js 18+ and npm
- Firebase account (free)
- Backend API running

## Installation Steps

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Click "Add Project"
   - Name it "CaseCut" or similar
   - Disable Google Analytics (optional)

2. **Enable Authentication**
   - In Firebase Console, go to **Authentication**
   - Click "Get Started"
   - Enable **Email/Password** sign-in method
   - Enable **Google** sign-in provider
     - Add your email as test user

3. **Enable Firestore Database**
   - Go to **Firestore Database**
   - Click "Create Database"
   - Start in **Production Mode**
   - Choose your region
   - Go to **Rules** tab and update:
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /chats/{chatId} {
           allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
           allow create: if request.auth != null;
         }
       }
     }
     ```

4. **Get Firebase Config**
   - Go to **Project Settings** (gear icon)
   - Scroll to **Your apps** section
   - Click **Web** icon (`</>`)
   - Register app with nickname "CaseCut Web"
   - Copy the `firebaseConfig` object

### 3. Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase config from step 2:
   ```env
   VITE_API_URL=http://localhost:8000
   
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=casecut-xxxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=casecut-xxxxx
   VITE_FIREBASE_STORAGE_BUCKET=casecut-xxxxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

3. After deploying backend to Railway, update `VITE_API_URL`:
   ```env
   VITE_API_URL=https://your-app.railway.app
   ```

### 4. Run Development Server
```bash
npm run dev
```

Visit http://localhost:5173

## TypeScript + Tailwind Setup

Already configured:
- ✅ TypeScript 5.3 with strict mode
- ✅ Tailwind CSS 3.4 with shadcn/ui theme
- ✅ Path aliases (`@/components`, `@/lib`, etc.)
- ✅ PostCSS with Autoprefixer
- ✅ ESLint + Vite config

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ui/              # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       └── hero-shutter-text.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx  # Firebase auth provider
│   ├── lib/
│   │   ├── firebase.ts      # Firebase initialization
│   │   └── utils.ts         # Utility functions
│   ├── pages/
│   │   ├── LandingPage.tsx  # Homepage (public)
│   │   ├── AboutPage.tsx    # About page (public)
│   │   ├── LoginPage.tsx    # Login (public)
│   │   ├── SignupPage.tsx   # Signup (public)
│   │   └── ChatPage.tsx     # Chat interface (protected)
│   ├── main.tsx             # Entry point with routing
│   └── index.css            # Tailwind + theme variables
├── .env                     # Your Firebase config (DO NOT COMMIT)
├── .env.example             # Template
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Key Features

### Authentication Flow
- **Public Routes**: `/`, `/about`, `/login`, `/signup`
- **Protected Routes**: `/chat` (requires login)
- **Auto-redirect**: Logged-in users can't access login/signup
- **Logout**: Available in chat sidebar

### Chat Interface
- ✅ ChatGPT-style UI with collapsible sidebar
- ✅ Chat history saved to Firestore
- ✅ Role selector (Lawyer/Judge/Student)
- ✅ Case citation expansion
- ✅ Dark mode toggle
- ✅ Suggested prompts for new users
- ✅ Real-time loading indicators

### Styling
- **Theme**: Dark/light mode with CSS variables
- **Colors**: Indigo primary, purple accents
- **Animations**: Framer Motion for smooth transitions
- **Icons**: Lucide React
- **Responsive**: Mobile-first design

## Building for Production

```bash
npm run build
```

Output: `dist/` folder ready for deployment

## Deployment to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## Troubleshooting

### Firebase Auth Error
- Check that Email/Password is enabled in Firebase Console
- Verify all `VITE_FIREBASE_*` variables are set correctly
- Check browser console for specific error messages

### API Connection Failed
- Ensure backend is running on `VITE_API_URL`
- Check CORS settings in backend (`main.py`)
- Verify backend health: `curl <VITE_API_URL>/health`

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run build
```

### Tailwind Styles Not Loading
- Restart dev server after editing `tailwind.config.js`
- Check that `index.css` imports Tailwind directives

## Adding New shadcn/ui Components

```bash
# Example: Add Dialog component
npx shadcn-ui@latest add dialog

# Example: Add Dropdown Menu
npx shadcn-ui@latest add dropdown-menu
```

This automatically installs dependencies and creates component files in `src/components/ui/`.

## Next Steps

1. ✅ Setup Firebase project
2. ✅ Configure environment variables
3. ✅ Run development server
4. Test authentication flow
5. Test chat functionality
6. Deploy to Vercel

For deployment instructions, see `DEPLOYMENT_GUIDE.md`.
For cost monitoring, see `COST_MONITORING.md`.
