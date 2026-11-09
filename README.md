# Seidor Planning — Frontend

React and TypeScript frontend for Seidor's SAP consultant and project planning application.

[Frontend repository](https://github.com/molkka/seidor-frontend-) · [Backend repository](https://github.com/molkka/seidor-backend-)

## Features

- Authentication, registration, email verification, and password reset.
- Consultant and project management.
- Annual planning, scenario optimization, and navigation between planning years.
- Effort estimation and time allocation tracking.
- Dashboards and analytics, including embedded Apache Superset dashboards.
- Planning email workflows and an assistant chatbot.

Some features require corresponding backend services and configuration.

## Technology

React 19, TypeScript, Vite 8, Tailwind CSS 4, Shadcn UI / Radix UI, TanStack Router and Query, Zustand, Axios, and Recharts.

## Local setup

Use Node.js 22.14 or newer in the Node.js 22 release line, matching the project's CI configuration, and npm.

```bash
git clone https://github.com/molkka/seidor-frontend-.git
cd seidor-frontend-
npm ci
```

Create a `.env.local` file in the project root:

```dotenv
VITE_API_URL=http://localhost:8000
# Optional: Google sign-in client ID, matching the backend configuration.
VITE_GOOGLE_CLIENT_ID=
```

The API URL defaults to `http://localhost:8000` if omitted. Restart Vite after changing environment variables. Variables prefixed with `VITE_` are visible in the browser; keep service credentials and API secrets in the backend configuration.

Start the backend using the instructions and configuration in the [backend repository](https://github.com/molkka/seidor-backend-), then start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. The backend must allow this frontend origin through its CORS configuration.

Google sign-in is optional. The inherited Clerk example routes use `VITE_CLERK_PUBLISHABLE_KEY`; this is separate from the application's backend authentication.

## Commands

| Command                        | Purpose                                 |
| ------------------------------ | --------------------------------------- |
| `npm run dev`                  | Start the development server            |
| `npm run build`                | Check TypeScript and build into `dist/` |
| `npm run preview`              | Preview the production build locally    |
| `node --test tests/*.test.mjs` | Run frontend unit tests                 |
| `npm run lint`                 | Run ESLint                              |
| `npm run format:check`         | Check formatting                        |

GitHub Actions runs the unit tests and production build on pushes and pull requests.

## Project structure

- `src/pages/`: Seidor application pages, including planning, consultants, projects, dashboards, authentication, and chatbot.
- `src/routes/`: TanStack Router route definitions.
- `src/components/`: Shared components and UI primitives.
- `src/services/api.ts`: API client and authentication interceptors.
- `src/store/`: Application state.
- `tests/`: Frontend unit tests.
- `public/`: Static assets.

## Deployment

Set `VITE_API_URL` to the deployed backend URL before running `npm run build`. Deploy the generated `dist/` directory to a static host, configure fallback routing to `index.html`, and allow the deployed frontend origin in the backend CORS configuration.

Superset embedding, Airflow workflows, email delivery, and chatbot provider credentials are configured on the backend.

## Attribution and license

The UI is adapted from [Shadcn Admin by Sat Naing](https://github.com/satnaing/shadcn-admin). The original MIT license and copyright notice are preserved in [LICENSE](LICENSE).
