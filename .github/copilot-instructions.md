# WATHACI CONNECT - Copilot Instructions

## Project Overview

WATHACI CONNECT is a comprehensive platform built with React, TypeScript, Vite, and Supabase. It includes:
- **Frontend**: React 18 + TypeScript + Vite with SWC for fast compilation
- **Backend**: Node.js Express API with serverless deployment to Vercel
- **Database**: PostgreSQL via Supabase with Row Level Security (RLS)
- **UI**: Radix UI components with Tailwind CSS and shadcn/ui design system
- **Authentication**: Supabase Auth with email/SMS OTP verification
- **Payments**: Lenco payment gateway integration

## Architecture

- **Monorepo structure**: Frontend in `/src`, backend in `/backend`
- **Frontend dev server**: Port 8080 (Vite)
- **Backend dev server**: Port 4000 (Express)
- **Serverless deployment**: Vercel for both frontend and backend
- **Database migrations**: Supabase CLI with migrations in `/supabase/migrations`

## Code Standards and Conventions

### TypeScript & React

- Use TypeScript for all new code (`.ts`, `.tsx` files)
- Follow strict TypeScript configuration with `strict: true`
- Use functional components with React Hooks (no class components)
- Prefer `const` arrow functions for components
- Use `@/` path alias for imports from `src` directory (configured in tsconfig.json)
- Example: `import { Button } from "@/components/ui/button"`

### Styling

- Use Tailwind CSS utility classes for styling
- Follow the shadcn/ui component patterns for UI components
- Use CSS custom properties (CSS variables) for theming with HSL color format
- Example: `hsl(var(--primary))` for theme colors
- Support both light and dark mode using `darkMode: ["class"]` strategy
- Place UI components in `src/components/ui/`
- Use `cn()` utility from `@/lib/utils` for conditional class names

### File Organization

```
src/
├── components/     # Reusable React components
│   ├── ui/        # shadcn/ui components (accordion, button, dialog, etc.)
│   └── ...        # Feature-specific components
├── pages/         # Route/page components
├── lib/           # Utility functions and API clients
│   ├── api/       # API integration modules
│   └── services/  # Business logic services
├── hooks/         # Custom React hooks
├── contexts/      # React context providers
├── types/         # TypeScript type definitions
├── config/        # Configuration files
└── utils/         # General utility functions
```

### Backend Patterns

- Backend uses Express.js in `/backend`
- **Serverless deployment pattern**:
  - `backend/index.js` exports the Express app (no `.listen()`)
  - `backend/api/index.js` is the Vercel serverless entry point
  - `backend/server.js` is for local development only
- Use custom CORS middleware: `createCorsMiddleware` from `/backend/middleware/cors.js`
  - Set `allowNoOrigin: true` for serverless environments
- Backend is JavaScript (not TypeScript) - excluded from ESLint via `ignores: ["backend/**"]`
- Backend dev server runs on port 4000

### Database & Migrations

- Use Supabase PostgreSQL with Row Level Security (RLS)
- Store migrations in `supabase/migrations/` with timestamp-based naming
- Profile tables schema:
  - Use `user_id` as PRIMARY KEY (not `id`)
  - Include optional `profile_id` as FK to `profiles(id)`
  - Examples: `sme_profiles`, `professional_profiles`, `investor_profiles`
- **Always include** `NOTIFY pgrst, 'reload schema'` after schema changes to refresh PostgREST cache
- Use Supabase CLI for migrations: `npm run supabase:push`

### API Configuration

- Frontend API base URL:
  - Development: `http://localhost:4000`
  - Production: `https://wathaci-connect-platform2.vercel.app`
  - Configurable via `VITE_API_BASE_URL` environment variable
- See `src/config/api.ts` for API configuration

### Environment Variables

- Frontend variables must be prefixed with `VITE_`
- Use `.env.example` as template for development
- Use `.env.production.example` for production template
- Never commit actual `.env` files
- Required variables:
  - `VITE_SUPABASE_URL` - Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Public anon key for frontend
  - `VITE_API_BASE_URL` - Backend API endpoint
  - `SUPABASE_SERVICE_ROLE_KEY` - Backend service role key (server-side only)

## Build and Development

### Available Scripts

**Frontend:**
```bash
npm run dev              # Start Vite dev server on port 8080
npm run build            # Production build
npm run build:dev        # Development build
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking
npm run preview          # Preview production build
```

**Testing:**
```bash
npm test                 # Run all tests
npm run test:jest        # Run Jest tests
npm run test:jest:watch  # Jest in watch mode
npm run test:accessibility  # Accessibility tests
npm run test:lighthouse  # Lighthouse performance tests
```

**Supabase:**
```bash
npm run supabase:login   # Authenticate with Supabase
npm run supabase:link    # Link to remote project
npm run supabase:status  # Check project status
npm run supabase:pull    # Pull remote schema changes
npm run supabase:push    # Push local migrations to remote
npm run supabase:deploy  # Deploy edge functions
```

**Backend:**
```bash
cd backend
npm run dev              # Start backend dev server (port 4000)
npm start                # Start backend production server
```

### Vercel Deployment

- Frontend uses modern Vercel configuration format:
  - `buildCommand`, `outputDirectory`, `rewrites` (not deprecated `builds`/`routes`)
  - Source: `package.json` (not `index.html`)
  - SPA routing via `rewrites` with `source`/`destination` fields
- Backend deployed as serverless functions via `/backend/api/index.js`
- Review `vercel.json` for deployment configuration

## Testing

- Jest for unit and integration tests
- `@testing-library/react` for component testing
- `jest-axe` for accessibility testing
- Lighthouse for performance testing
- Test files located in `src/__tests__/` or colocated with components
- Test setup: `jest.setup.ts`

## Code Quality

### Linting
- ESLint with TypeScript support
- React Hooks linting enabled
- Configuration: `eslint.config.js`
- Run: `npm run lint`
- **Note**: `@typescript-eslint/no-explicit-any` is disabled (legacy code uses `any`)

### Type Checking
- Strict TypeScript mode enabled
- Run type check: `npm run typecheck`
- Path aliases configured in `tsconfig.json`

## Security Best Practices

- Never commit secrets or API keys
- Use environment variables for sensitive data
- Backend uses Helmet for security headers
- Backend uses express-rate-limit for rate limiting
- Use sanitize-html for user input sanitization
- Implement Row Level Security (RLS) for all Supabase tables
- Validate all user inputs with Joi (backend) or Zod (frontend)

## Authentication Patterns

- Supabase Auth for user management
- Support for email and SMS/WhatsApp OTP verification
- Email confirmations enabled for new signups
- Password reset flows implemented
- Multiple account types supported (SME, Professional, Investor, etc.)
- Auth context: Check `src/contexts/` for auth state management

## Payment Integration

- Lenco payment gateway for transactions
- Webhook configuration required for production
- Payment security service: `src/lib/services/payment-security-service.ts`
- See `docs/PAYMENT_INTEGRATION_GUIDE.md` for details

## Documentation

Key documentation files in the repository:
- `README.md` - Project overview and quick start
- `PRODUCTION_READINESS_COMPLETE.md` - Production deployment checklist
- `docs/` - Comprehensive documentation directory
  - `docs/release/LAUNCH_CHECKLIST.md` - Pre-launch checklist
  - `docs/PAYMENT_INTEGRATION_GUIDE.md` - Payment setup
  - Various API reference docs for Lenco integration

## Internationalization

- i18next for internationalization
- Translation files in `src/locales/`
- See `docs/I18N_SETUP.md` for i18n configuration

## Common Patterns

### API Calls
```typescript
import { apiClient } from '@/lib/apiClient';

const response = await apiClient.get('/endpoint');
```

### Supabase Client
```typescript
import { supabase } from '@/lib/wathaciSupabaseClient';

const { data, error } = await supabase
  .from('table_name')
  .select('*');
```

### UI Components
```typescript
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

// Use components with Tailwind classes
<Button variant="primary" size="lg">Click me</Button>
```

### Form Handling
- Use `react-hook-form` with Zod validation
- Use `@hookform/resolvers` for Zod integration

## Git Workflow

- Create feature branches from main
- Use descriptive commit messages
- Test locally before pushing
- Ensure linting and type checking pass
- Run relevant tests before committing

## Important Notes

- The backend directory is excluded from TypeScript/ESLint checks
- Profile tables use `user_id` as primary key, not `id`
- Always notify PostgREST after schema changes in migrations
- Use absolute paths with `/` base for Vite to avoid asset 404s on deep routes
- Frontend and backend are deployed separately to Vercel as different services
