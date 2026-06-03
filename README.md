# content-restriction-text-to-voice

This repository contains a Next.js frontend and a Node.js backend providing a content-moderation + voice-agent demo. The project includes:

- `frontend/` - Next.js app (upload UI, voice demo)
- `backend/` - Node.js Fastify server (CLIP classifier, Dialogflow integration, file moderation)

Quick setup (local):

1. Install dependencies for both packages

```bash
cd c:\agent_restriction\backend
npm install
cd ../frontend
npm install
```

2. Start backend (loads CLIP model):

```powershell
cd c:\agent_restriction\backend
node src/app.js
```

3. Start frontend:

```bash
cd c:\agent_restriction\frontend
npm run dev
```

Prepare repository for GitHub and Vercel

1. Initialize git (if not already):

```bash
cd c:\agent_restriction
git init
git add .
git commit -m "Initial commit"
```

2. Create a repository on GitHub and add remote. Replace `USERNAME` and `REPO`.

Using HTTPS:

```bash
git remote add origin https://github.com/USERNAME/REPO.git
git branch -M main
git push -u origin main
```

Or using SSH:

```bash
git remote add origin git@github.com:USERNAME/REPO.git
git branch -M main
git push -u origin main
```

3. Deploy to Vercel

- Recommended: In Vercel dashboard, import this GitHub repository.
- Set the root directory for the deployment to `frontend` so Vercel builds the Next.js app.
- Add an environment variable `BACKEND_URL` pointing to your backend (deployed elsewhere).

Note on backend deployment

Vercel is optimized for frontend / serverless functions. The `backend/` folder here runs as a normal Node server and binds to a port; to deploy the backend you can:

- Deploy it to a service that supports long-running Node servers (Render, DigitalOcean App Platform, a VM, or Railway), then set `BACKEND_URL` in Vercel.
- Alternatively convert backend endpoints into Vercel Serverless Functions under `api/` in the `frontend/` project.

Vercel config files

- `vercel.json` configures the frontend build and GitHub integration.
- `.vercelignore` prevents accidental upload of the backend and keys.

Security reminder

Keep `keys/dialogflow-key.json` and other credentials out of source control. The repo's `.gitignore` excludes `keys/` and `*.local` env files.

If you want, I can:

- Convert the backend endpoints into Vercel serverless functions (requires code changes).
- Create a GitHub Actions workflow to auto-deploy to Vercel when you push (requires `VERCEL_TOKEN` secret).
