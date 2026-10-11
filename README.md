# Daily Current Affairs Desk

A local browser dashboard for UPSC and Karnataka KPSC current-affairs study. Import English or Kannada newspaper PDFs, search extracted page text, review basic keyword-based topic tags, and download the brief.

## Import a newspaper

1. Open `index.html` in Edge or Chrome.
2. Click **Choose newspaper files** and select PDFs from Downloads.
3. The app first extracts selectable PDF text. If a page is scanned or its embedded font produces corrupted text, it renders that page temporarily in the browser and runs local OCR. Only recognised text is saved; rendered page images are discarded and never uploaded. Obvious ad blocks and promotional/contact lines in OCR output are filtered heuristically, but this cannot reliably identify every advertisement and may occasionally exclude nearby article text. Newspaper filenames containing `Kannada`, `Prajavani`, `Vijay Karnataka`, or `Udayavani` use the Kannada model; other filenames use the English model.
4. Watch the import status for page counts, skipped pages, or actionable errors.

The browser loads PDF.js, Tesseract.js and English/Kannada OCR models from public CDNs as needed. The selected newspaper files are processed in the browser and are not uploaded. First-time downloads can be substantial and scanned newspapers can take time to process. OCR renders at a balanced resolution to reduce processing time; accuracy depends on scan resolution and print quality.

Telegram JSON/HTML exports and plain-text files are also supported. ZIP exports must be extracted before importing.

## What this app does and does not do

- Keeps imported stories in the browser's local storage on this device.
- Shows extracted page text and basic keyword-based UPSC/Karnataka topic suggestions.
- Does not read Downloads automatically, connect to Telegram, or fetch live news.
- Does not generate AI summaries, verify claims, or replace reading the source article.
