# SmartWifi client portal

Private client and event database for [SmartWifi](https://www.smartwifi.co.uk/). Sign in, then keep contacts, companies, event dates, job requirements and notes in one list that is available from any signed-in browser.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

- Username: `admin`
- Password: `Pa55w0rd12#`

On this machine, records are saved to `data/clients.json`. That file is gitignored.

## Deploy on Vercel

This is a Next.js app. Vercel hosts the pages and the API routes together. Import the repository (or use Publish). Leave the framework preset as Next.js. No extra build command or output directory is required.

Sign-in works as soon as the deployment is live, using the username and password above. To change them without editing code, set these environment variables on the Vercel project and redeploy:

- `PORTAL_USERNAME`
- `PORTAL_PASSWORD`
- `SESSION_SECRET` — a long random string, so session cookies cannot be forged

### Keep records across devices

Vercel’s servers do not have a permanent disk. Connect a Blob store so the client list is saved and shows up wherever you sign in:

1. In the Vercel project, open **Storage**.
2. Create a **Blob** store and connect it to this project. Vercel adds `BLOB_STORE_ID` and signs requests with its own OIDC token. Older connections may set `BLOB_READ_WRITE_TOKEN` instead. Either one is enough.
3. Redeploy.

Until that store is connected, you can still sign in, and the portal explains that records are not being kept yet.

## Scripts

- `npm run dev` — local site
- `npm run build` — production build
- `npm run lint` — lint
- `npm test` — checks for dates, validation and sign-in sessions
