# Basava Kademane Study Desk

A local browser dashboard for UPSC and Karnataka KPSC current-affairs study. Browse national and international headlines, a separate Karnataka current-affairs feed, and government-job updates from public RSS feeds. Import English or Kannada newspaper PDFs and PPTX presentations, search extracted text, review basic keyword-based topic tags, and download the brief.

## Online current affairs and job updates

Use **Online updates** in the sidebar to show only the live RSS briefing. Select **PDF imports** to switch to the local file importer and your saved study cards; the two views are not displayed together.

1. Run `start-local.ps1` in PowerShell and keep its window open. If port 8765 is already occupied by an older server, run `.\start-local.ps1 -Port 8766`; the dashboard checks the updated API on port 8766 first, then falls back to its current local server.
2. Open `http://127.0.0.1:8765/` in Edge or Chrome.
3. Select National, International, Karnataka current affairs, or Govt jobs, then refresh to load the public RSS feed. Each section shows up to 10 recent, distinct headlines; a feed may return fewer relevant items. No API key or paid API is required. The local server caches each section for 15 minutes and filters out feed items older than seven days (30 days for job notices).

National, international, and Karnataka current-affairs headlines come from Bing News RSS search feeds. The Karnataka feed uses English searches focused on Karnataka news, state current affairs, government, and policy. Several related queries are combined and duplicate links removed to fill the 10-headline limit where possible. Government-job listings come from FreeJobAlert's public RSS feed; this is an aggregator, not an official vacancy feed. Feed summaries are publisher-provided, not AI-generated. Verify posts, eligibility, deadlines, and application URLs directly on the official UPSC, Karnataka PSC, SSC, or National Career Service portals. Feed searches and results go through the configured public RSS providers; opening an article connects to its publisher.

## Import a newspaper or presentation

1. Open `index.html` in Edge or Chrome.
2. Optionally enter a PDF page range such as `1-5,8` in **PDF pages**. Leave it blank to import all pages. Click **Choose files** and select PDFs, PPTX presentations, or supported Telegram exports from Downloads. On reimport, only selected PDF pages are replaced; other pages from that file are preserved.
3. The app first extracts selectable PDF text. If a page is scanned or its embedded font produces corrupted text, it renders that page temporarily in the browser and runs local OCR. Only recognised text is saved; rendered page images are discarded and never uploaded. Obvious ad blocks and promotional/contact lines in OCR output are filtered heuristically, but this cannot reliably identify every advertisement and may occasionally exclude nearby article text. Newspaper filenames containing `Kannada`, `Prajavani`, `Vijay Karnataka`, or `Udayavani` use the Kannada model; other filenames use the English model.
4. Watch the import status for page counts, skipped pages, or actionable errors. Text pages are saved and shown as each page finishes, rather than waiting for the whole PDF.

PPTX presentation text is extracted locally, with each readable slide added as one study card using the slide title as its heading. This extracts the slide text; it does not generate an AI rewrite or summary. Images embedded in slides are not OCR-read, and older `.ppt` presentations must be saved as `.pptx` first. The browser loads JSZip from a public CDN to read the PPTX archive; the presentation itself stays in the browser and is not uploaded.

Scanned newspaper PDF OCR filters low-confidence, page-header/footer, and obvious-ad blocks, then displays remaining recognised text blocks as best-effort article cards with the first readable line as the heading. Newspaper columns, image quality, and ads can still make boundaries or words inaccurate. Reimporting a file replaces its earlier saved extraction. Searchable PDF pages stay as page-level entries. Topic/exam tags are broad keyword matches, not verified exam classifications.

The browser loads PDF.js, Tesseract.js, JSZip, and English/Kannada OCR models from public CDNs as needed. The selected files are processed in the browser and are not uploaded. First-time downloads can be substantial and scanned newspapers can take time to process. OCR renders at a balanced resolution to reduce processing time; accuracy depends on scan resolution and print quality.

Telegram JSON/HTML exports and plain-text files are also supported. ZIP exports must be extracted before importing.

## What this app does and does not do

- Keeps imported stories in the browser's local storage on this device.
- Shows extracted PDF page or PPTX slide text and basic keyword-based UPSC/Karnataka topic suggestions.
- Does not read Downloads automatically or connect to Telegram. Online headlines are retrieved from public RSS feeds through the local server.
- Does not generate AI summaries, verify claims, or replace reading the source article.
