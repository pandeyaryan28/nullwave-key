# NullWave

NullWave is a secure content gating, access control, and digital asset distribution platform built for creators, engineers, and digital operators. It enables creators to lock resources behind access keys, passcodes, or verification requirements with real-time analytics and creator profile hubs.

## Overview

- **Content Access Engine**: Lock documents, code snippets, guides, and download packages with passcode verification, access keys, or public access.
- **Creator Hubs**: Public-facing creator profiles showcasing active publications, verified links, and unlocked resources.
- **Multi-Page Architecture**: Distinct routes for Features, How It Works, Pricing, About, Authentication, and Creator Management.
- **Dual-Theme Parity**: Native dark and light mode support with high-contrast, accessible typography and surface states.
- **Offline & Fallback Resilience**: Local storage dual-key compatibility and mock fallback engines for development and offline testing.

## Tech Stack

- **Frontend**: React 18, TypeScript 5, Vite 6
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **Backend & Storage**: Firebase Authentication, Cloud Firestore, Cloud Storage
- **Testing**: Node.js native test runner (`node --test`)

## Project Structure

```text
src/
├── components/          # Reusable UI elements (Navbar, Footer, ThemeToggle)
├── config/              # Firebase and app runtime configuration
├── lib/
│   ├── analytics/       # Event tracking and telemetry storage
│   ├── auth/            # AuthContext, session handlers, credentials
│   ├── resources/       # Resource CRUD, Firestore queries, access validation
│   └── utils/           # Utility helpers and class merges
├── pages/
│   ├── auth/            # Login, Signup, Onboarding
│   ├── dashboard/       # Creator dashboard, New Resource, Settings
│   └── public/          # Landing, Features, How It Works, Pricing, About, Creator Profiles
└── tests/               # Unit and regression test suites
```

## Getting Started

### Prerequisites

- Node.js 20+ (or Node 22+)
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/pandeyaryan28/nullwave-key.git
cd nullwave-key

# Install dependencies
npm install
```

### Environment Configuration

Create a `.env` file in the project root with your Firebase configuration credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Development

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

### Production Build

```bash
npm run build
npm run preview
```

## License

MIT
