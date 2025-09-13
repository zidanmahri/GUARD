# GUARD - Discord to Roblox ban bridge

This project provides simple slash commands (`/ban`, `/unban`, `/userinfo`) and a small HTTP endpoint so your Roblox game can fetch the ban list.

Setup

1. Install dependencies:

```bash
npm install
```

2. Set up `.env` in the project root with these variables:

```
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-application-id
GUILD_ID=your-test-guild-id
PORT=3000 # optional
```

3. Deploy slash commands (the project registers commands on startup). Start the bot:

```bash
node index.js
```

How it works

- `/ban username [reason]` — resolves Roblox username to id and adds an entry to `bans.json`.
- `/unban username|id` — removes matching ban entry.
- `/userinfo username` — existing command which queries Roblox public APIs.
- HTTP GET `/bans` — returns the JSON array of ban entries that your Roblox game can fetch with `HttpService:GetAsync("https://yourserver/bans")`.

Notes and next steps

- This project stores bans in a simple JSON file — for production consider a proper database.
- If you want the Roblox server to perform an actual ban (place-level or account ban), you'll need to implement that in your game code and optionally use an authenticated backend to perform moderation action through Roblox APIs (requires cookie/API token and caution).

Railway deployment

1. Create a new Railway project and connect your GitHub repo (or push this project to Railway directly).
2. In Railway, set environment variables (Variables tab) with the same keys from `.env`: `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, and optionally `PORT`.
3. Railway will run `npm install` automatically and start `node index.js` (make sure Start Command is `node index.js`).
4. Railway provides a public URL for your service — use that URL in your Roblox game's `HttpService:GetAsync("https://your-railway-url/bans")`.

Healthchecks and keep-alive

- The app exposes `/` which returns a simple running message and `/bans` for the ban list. Use Railway health check or an external uptime monitor to hit `/` so the service stays awake.

Using your Roblox game's database/backend


If your Roblox game already has a backend or database for bans, you don't need to store bans in `bans.json` on Railway. The bot supports these Railway environment variable names (it will take the first defined):

- `BAN_ENDPOINT` or `API_BASE` or `API_URL` — public endpoint on your game backend that accepts POST requests to create bans (e.g. `https://yourgame.example.com/api/bans`). The bot will POST JSON { userId, username, reason, bannedBy, timestamp }.
- `BAN_TOKEN` or `ROBLOX_API_KEY` — (optional) bearer token the bot will send as `Authorization: Bearer <TOKEN>`; use this to authenticate requests from the bot.

Also make sure the following Railway variables are set for the bot itself:

- `CLIENT_ID` — your Discord application id
- `DISCORD_TOKEN` — your bot token
- `GUILD_ID` — the guild id where you want to register slash commands (for testing)
- `UNIVERSE_ID` — (optional) your Roblox Universe id if you need it later

Behavior:
- If `BAN_ENDPOINT` is set, `/ban` will POST the ban to that endpoint. If POST fails, the bot will fallback to writing `bans.json` locally.
- If `BAN_ENDPOINT` is set, `/unban` will POST to `${BAN_ENDPOINT}/unban` with JSON { input, requestedBy } and return the response status to the moderator. If POST fails, it will fallback to local file removal.

On the Roblox backend side, implement two endpoints (recommended):
- `POST /api/bans` — create a ban in your DB.
- `POST /api/bans/unban` — remove ban by username or id.

Secure these endpoints with a token and validate requests.
