# Real Estate Listings

A full-stack property listings platform with AI-powered natural language search. Design decisions and reasoning can be found in [REASONING.md](./REASONING.md).

## Tech stack

- **Backend** — Node.js, Express 5, Prisma 7, better-sqlite3
- **Frontend** — React 18, Vite, TypeScript
- **AI** — Google AI SDK (SSE streaming)
- **Validation** — Zod
- **Testing** — Jest

## Quick start

The repository includes a pre-seeded SQLite database and sample raw data, so no data preparation is needed.

### 1. Install dependencies

```bash
npm install && npm install --prefix client
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `GEMINI_API_KEY` in `.env`. This is required to use the AI chat search — the rest of the app works without it.

### 3. Start

```bash
npm start
```

- Client: http://localhost:5173
- API: http://localhost:3000

## Data pipeline

Raw listing data (JSON or HTML) enters through `extractorService.extract()`, which detects the format and routes it:

- **Structured JSON** → `llmExtractorService.extractFromJson` stringifies the payload and sends it to Gemini with a `responseSchema`
- **Raw HTML** → `llmExtractorService.extractFromHtml` strips noise tags (script, style, nav, footer), then sends the plain text to Gemini with the same `responseSchema`

Both paths go through Gemini and terminate at `ExtractedPropertySchema.safeParse` — the extraction layer is source-agnostic, so adding a new listing platform requires no new parsing code. Invalid records return null and are skipped.

## AI search

The chat interface posts the full conversation history to `POST /api/search/ai`. The backend sends it to Gemini with a fixed system prompt as `systemInstruction`, streams the response back via SSE, and extracts a `<FILTERS>` JSON block from the completed response to update the UI filters automatically.

## Example scenarios

### Scenario A — Structured filter search

Ana is relocating to Barcelona for work and knows she wants to live in the Eixample or Gràcia area. She opens the app on the **For Rent** tab and types "Barcelona" in the city field. The Districts dropdown appears — she checks **Eixample** and **Gràcia**. The Neighborhoods dropdown activates showing only the neighborhoods belonging to those two districts; she selects **Vila de Gràcia** to narrow further.

She then sets her constraints in the filter bar: minimum 2 rooms, minimum 60 m², max price 1,400 €. She opens the Features dropdown and checks **Elevator required** (she has a bike she needs to bring upstairs) and **Terrace**. The grid updates and shows only listings that match all conditions. She clicks a card, reads the description and floor plan details, and submits a visit request for the following Thursday through the contact form.

---

### Scenario B — AI chat search

Marc has just accepted a job near Atocha station in Madrid but doesn't know the city well enough to pick a district. He switches to the **For Sale** tab and types into the chat:

> *"Looking for a spacious flat in Madrid, reasonable budget, first-time buyer"*

The assistant responds explaining it is targeting larger properties within a mid-range budget, and sets `minArea = 80`, `maxPrice = 400,000`, `city = Madrid` — the listings grid filters automatically as the response streams in.

Marc follows up:

> *"I commute to Atocha so somewhere close would be ideal, and I need a parking spot"*

The assistant carries the budget and size constraints from the first message, resolves Atocha to the Arganzuela district, and adds `parking` to the extras filter — `districts = [Arganzuela]`, `extras = [parking]`, `maxPrice` unchanged at 400,000. Marc sees a focused set of results, clicks through to a listing, and submits an offer through the offer form.

In case there are no results, the chatbot will tell you.

---

## Available scripts

| Script | Description |
|---|---|
| `npm start` | Start API and client concurrently |
| `npm test` | Run test suite |
| `npm run init` | Generate Prisma client, push schema, seed DB (only needed if starting fresh) |
| `npm run dev` | Start API server only (watch mode) |
| `npm run db:seed` | Re-seed the database from results/raw/ |
| `npm run format` | Format all files with Prettier |
