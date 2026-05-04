# Reasoning Document

## What data did you decide to extract and why?

The schema captures what buyers and renters actually weigh when evaluating a listing: price, area, rooms, bathrooms, floor, location (city / district / neighborhood / street address), and amenities like parking, terrace, or pool.

The decision to separate whether the property has an elevator from the other amenities was made based on the fact that it is a hard requirement for some users (disabilities, old age), not merely a preference. Amenities are stored in a junction table (`Extra`) rather than a JSON string column so they can be filtered server-side with AND semantics, meaning a user asking for both parking and a terrace gets only properties that have both.

The source `listingUrl` is preserved for attribution and so users can cross-reference the original listing.

Beyond listing data, the schema also models user interactions: contact requests (visits or general enquiries) and offers are persisted against a property. These flows are mocked: submissions are saved to the database but no notification or email is sent to an agent.

---

## How did you handle unstructured or low-quality data?

All inputs, regardless of source or format, are routed through Gemini with a fixed `responseSchema`. A format detector checks whether the input is raw HTML or a structured JSON payload and prepares the content accordingly: HTML is stripped of noise tags (script, style, nav, footer) before being sent; JSON is stringified as-is. Gemini maps the content to the target schema in both cases, so the extraction layer is source-agnostic by design, adding a new listing platform requires no new parsing code.

After Gemini returns, the response is validated through Zod, a TypeScript schema validation library that acts as a runtime contract on the LLM output. It enforces that required fields are present and correctly typed, coerces values where possible, and applies defaults for optional fields (`bathrooms: 1`, `hasElevator: false`, `extras: []`) so partial records degrade gracefully rather than failing outright. Records that fail validation entirely are logged and skipped; the pipeline continues with the remaining batch.

Before persisting, each normalized record is fingerprinted by serializing its key identifying fields (price, area, rooms, location, extras, etc.) to JSON and computing a SHA-256 hash of that string, with the result stored as a unique constraint. If the same property arrives again, from a re-run or a second source, the hash match prevents it from being inserted twice.

I had trouble fetching live data due to a Cloudflare layer, so I generated synthetic data modelled on real listings from fotocasa.es and idealista.es, covering both source formats (JSON API payload and HTML web crawl) across multiple neighborhoods in Barcelona and Madrid. The crawling step is mocked: instead of making live HTTP requests, the pipeline reads from pre-prepared input files and runs them through the full extraction, validation, and storage flow. The synthetic data was generated directly in normalized form from the raw records, bypassing the LLM extractor, as running 100+ records through Gemini would have meant waiting through multiple rate limit recharge cycles. The LLM pipeline is demonstrated on a smaller set of inputs in `tests/fixtures/` (`fotocasa_raw.json` and `listing_raw.html`); to run custom cases, execute `npx tsx src/scripts/testPipeline.ts` and swap in your own files.

---

## Where and why did you use AI?

**Natural language search.** Users think in intent ("cheap flat near the park, 2 bedrooms") rather than filter fields. Mapping free text to structured DB filters without AI would require a bespoke NLP pipeline. A single Gemini call with a structured system prompt and `<FILTERS>` delimiters gives reliable JSON extraction in one round trip, with the added benefit of geographic reasoning, resolving "near Atocha station" to the Arganzuela district without a look-up table.

**Streaming + chat history.** The AI response takes 1–3 seconds to complete. Streaming via SSE shows the reasoning as it generates, making the wait feel productive rather than frozen. Preserving conversation history means refinements like "actually make it cheaper" on the second turn carry over all previous constraints without the user having to restate them.

**Data normalization.** Whether the input is a JSON payload from an aggregator or raw HTML from a listing page, the pipeline sends it to Gemini with a `responseSchema` and gets back a validated object. This removes the need for per-source field mapping or CSS selectors; the model reads whatever the scraper returns and maps it to the schema, making the extraction layer resilient to source changes.

---

## One key assumption

Users search within one city at a time. The filter model has a single `city` field and location data is pre-defined per city, so cross-city searches ("show me flats in both Barcelona and Madrid") are not supported. The assumption is that real estate intent is local, meaning people have already decided what city they're targeting before they start refining.

---

## One success metric

**Click-through rate after an AI turn without manual filter adjustment**: the share of AI chat turns where the user clicks on a property card without touching the filter panel first. This measures whether the LLM actually captured the user's intent, and not just whether it produced structured output. A user who clicks through without adjusting filters is implicitly validating that the applied filters surfaced relevant results. A low rate means the model is producing plausible-looking filters that don't match what the user had in mind, which is a more actionable signal than simply tracking whether filters were applied at all.

---

## One failure mode or limitation

The AI chat has no awareness of listing prices in context, mapping adjectives like "cheap" or "reasonable" to fixed price thresholds hardcoded in the prompt, regardless of what the actual data looks like. If the database contains only high-end listings, a user asking for "something affordable" will get no results with no explanation of why. A potential solution would be to base these thresholds on statistical analysis, using the 1.5 IQR rule to derive meaningful price brackets from the quartile distribution of the current dataset, recomputed periodically as inventory changes, or sourced from an official real estate statistics API.

---

## What would you improve with more time?

**Live scraper.** A Playwright-based scraper with rate limiting, proxy rotation, and incremental change detection would make the platform self-sustaining and keep listings current.

**Automatic tab switching.** The AI chat is scoped to whichever tab is active when the conversation starts. A user asking "I want to buy a flat in Eixample" while on the For Rent tab will get no results. Detecting buy/rent intent from the first message and switching the active tab automatically would remove this friction entirely.

**Saved searches and alerts.** Each chat conversation naturally produces a validated filter state. Persisting that state and running it nightly against new listings, then notifying the user by email, would turn a one-off search into a continuous discovery loop.
