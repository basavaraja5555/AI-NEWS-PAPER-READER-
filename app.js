const fileInput = document.querySelector("#telegram-files");
const importStatus = document.querySelector("#import-status");
const storyList = document.querySelector("#story-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const downloadButton = document.querySelector("#download-button");
const toast = document.querySelector("#toast");
const storageKey = "current-desk-stories-v1";
const maximumSavedStories = 1000;
const pdfJsSources = [
  {
    library: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    worker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  },
  {
    library: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
    worker: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
  },
];
const tesseractSources = [
  "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js",
];
const ocrDataSources = [
  { language: "eng", langPath: "https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_fast@main" },
  { language: "kan", langPath: "https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata@main" },
];
let activeFilter = "all";
let toastTimer;
let stories = loadStories();
let pdfJsLoadPromise;
let tesseractLoadPromise;

const topics = [
  { name: "Polity & governance", pattern: /\b(parliament|supreme court|high court|constitution|constitutional|bill|act|judg(?:e)?ment|election|electoral|governance|federal|cabinet|ordinance|commission|rights|amendment)\b|ಸಂವಿಧಾನ|ಸುಪ್ರೀಂ ಕೋರ್ಟ್|ಹೈಕೋರ್ಟ್|ಚುನಾವಣೆ|ಸರ್ಕಾರ|ವಿಧಾನಸಭೆ/i },
  { name: "Economy", pattern: /\b(economy|economic|gdp|inflation|budget|rbi|reserve bank|repo rate|tax|fiscal|monetary|trade|export|import|employment|unemployment|market|investment|banking|rupee)\b|ಆರ್ಥಿಕತೆ|ಹಣದುಬ್ಬರ|ಬಜೆಟ್|ಮಾರುಕಟ್ಟೆ|ಉದ್ಯೋಗ|ರಿಸರ್ವ್ ಬ್ಯಾಂಕ್/i },
  { name: "Environment", pattern: /\b(climate|environment|pollution|forest|wildlife|biodiversity|emission|renewable|solar|conservation|tiger|elephant|wetland|drought|flood)\b|ಪರಿಸರ|ಹವಾಮಾನ|ಅರಣ್ಯ|ವನ್ಯಜೀವಿ|ಮಾಲಿನ್ಯ|ಮಳೆ|ಬರಗಾಲ/i },
  { name: "Science & technology", pattern: /\b(science|technology|artificial intelligence|\bAI\b|isro|space|satellite|mission|vaccine|research|cyber|semiconductor|digital|biotechnology)\b|ವಿಜ್ಞಾನ|ತಂತ್ರಜ್ಞಾನ|ಇಸ್ರೋ|ಉಪಗ್ರಹ|ಬಾಹ್ಯಾಕಾಶ/i },
  { name: "International relations", pattern: /\b(united nations|india.{0,25}(china|pakistan|us |u\.s\.|russia|bangladesh|nepal|sri lanka)|bilateral|diplomacy|summit|treaty|foreign policy|g20|brics|nato)\b/i },
  { name: "Society & health", pattern: /\b(health|hospital|disease|education|school|university|nutrition|poverty|women|children|census|population|social justice|tribal|caste)\b|ಆರೋಗ್ಯ|ಶಿಕ್ಷಣ|ಆಸ್ಪತ್ರೆ|ರೈತರು|ಕೃಷಿ|ಮಹಿಳೆ|ಮಕ್ಕಳು/i },
  { name: "Security", pattern: /\b(defence|defense|security|terror|terrorism|military|armed forces|border|cybersecurity|insurgency|army|navy|air force)\b/i },
  { name: "Schemes & public policy", pattern: /\b(scheme|yojana|programme|program|public policy|beneficiar|subsidy|welfare|rural development|infrastructure|ministry|government launched)\b/i },
];

const karnatakaPattern = /\b(karnataka|bengaluru|bangalore|mysuru|mysore|mangaluru|mangalore|kalaburagi|gulbarga|belagavi|belgaum|vijayapura|bijapur|ballari|bellary|shivamogga|shimoga|tumakuru|tumkur|dharwad|hampi|hubballi|hubli|karnataka high court|karnataka government|karnataka state)\b|ಕರ್ನಾಟಕ|ಬೆಂಗಳೂರು|ಮೈಸೂರು|ಮಂಗಳೂರು|ಕಲಬುರಗಿ|ಬೆಳಗಾವಿ|ವಿಜಯಪುರ|ಬಳ್ಳಾರಿ|ಶಿವಮೊಗ್ಗ|ತುಮಕೂರು|ಧಾರವಾಡ|ಹುಬ್ಬಳ್ಳಿ|ಹಂಪಿ/i;

function loadStories() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(saved)) return [];
    const uniqueIds = new Set();
    const readable = saved.filter((story) => {
      if (!story || typeof story.text !== "string" || hasCorruptText(story.text) || uniqueIds.has(story.id)) return false;
      uniqueIds.add(story.id);
      return true;
    });
    if (readable.length !== saved.length) {
      localStorage.setItem(storageKey, JSON.stringify(readable));
    }
    return readable;
  } catch (error) {
    console.error("Could not read saved current affairs stories.", error);
    return [];
  }
}

function persistStories() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(stories.slice(0, maximumSavedStories)));
    return true;
  } catch (error) {
    console.error("Could not save current affairs stories.", error);
    showToast("Browser storage is full. Download your brief and clear some saved stories.");
    return false;
  }
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasCorruptText(text) {
  if (!text) return false;
  const replacements = (text.match(/\uFFFD/g) || []).length;
  return replacements / text.length > 0.01;
}

function isAdvertisementText(text) {
  const normalized = cleanText(text);
  if (!normalized) return false;
  if (/\b(advertisement|advertorial|classifieds?|sponsored content|paid promotion)\b/i.test(normalized)) return true;

  const promotionalCue = /\b(call now|book now|buy now|visit us|shop now|subscribe today|limited time|special offer|launch offer|free delivery|for details|contact us|apply now)\b/i.test(normalized);
  const offerCue = /\b(discount|% off|cashback|emi|price|starting at|offer|sale|deal)\b/i.test(normalized);
  const contactCue = /\b(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{7,}\d)\b/i.test(normalized);
  const words = normalized.split(/\s+/).length;
  return (promotionalCue && (offerCue || contactCue))
    || (contactCue && words <= 8 && !/[.!?।]/.test(normalized))
    || (promotionalCue && words <= 8 && !/[.!?।]/.test(normalized));
}

function textWithoutAdvertisements(text) {
  const lines = String(text || "").split(/\r?\n/);
  const kept = lines.filter((line) => !isAdvertisementText(line));
  return {
    text: cleanText(kept.join(" ")),
    skipped: lines.length - kept.length,
  };
}

function textFromOcrResult(data) {
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  const blockLines = blocks.flatMap((block) => (block.paragraphs || [])
    .flatMap((paragraph) => (paragraph.lines || []).map((line) => line.text || ""))
    .filter(Boolean));
  const lines = blockLines.length ? blockLines : (data.text || "").split(/\r?\n/);
  let skipped = 0;
  const keptLines = [];

  if (blockLines.length) {
    const groupedBlocks = blocks.map((block) => (block.paragraphs || [])
      .flatMap((paragraph) => (paragraph.lines || []).map((line) => line.text || ""))
      .filter(Boolean));
    for (const block of groupedBlocks) {
      const blockText = block.join(" ");
      if (isAdvertisementText(blockText)) {
        skipped += block.length;
        continue;
      }
      for (const line of block) {
        if (isAdvertisementText(line)) skipped += 1;
        else keptLines.push(line);
      }
    }
  } else {
    for (const line of lines) {
      if (isAdvertisementText(line)) skipped += 1;
      else keptLines.push(line);
    }
  }

  return { text: cleanText(keptLines.join(" ")), skipped };
}

function newspaperName(filename) {
  const name = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const normalized = name.toLowerCase();
  const papers = [
    [/times of india|\btoi\b/, "The Times of India"],
    [/economic times|\bet\b/, "The Economic Times"],
    [/vijay ?karnataka|ವಿಜಯ ಕರ್ನಾಟಕ/, "Vijay Karnataka"],
    [/prajavani|ಪ್ರಜಾ ವಾಣಿ|ಪ್ರಜಾವಾಣಿ/, "Prajavani"],
    [/kannada prabha|ಕನ್ನಡ ಪ್ರಭ/, "Kannada Prabha"],
    [/deccan herald|\bdh\b/, "Deccan Herald"],
    [/the hindu|\bhindu\b/, "The Hindu"],
    [/indian express/, "The Indian Express"],
    [/new indian express/, "The New Indian Express"],
    [/business standard/, "Business Standard"],
    [/hindu businessline|businessline/, "BusinessLine"],
    [/mint\b/, "Mint"],
  ];
  return papers.find(([pattern]) => pattern.test(normalized))?.[1] || name || "Newspaper PDF";
}

function isKannadaNewspaper(filename) {
  return /vijay[\s_-]*karnataka|prajavani|kannada|udayavani|ಪ್ರಜಾವಾಣಿ|ಪ್ರಜಾ ವಾಣಿ|ಕನ್ನಡ ಪ್ರಭ|ಉದಯವಾಣಿ|ವಿಜಯ ಕರ್ನಾಟಕ/i.test(filename);
}

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfJsLoadPromise) return pdfJsLoadPromise;

  pdfJsLoadPromise = (async () => {
    for (const source of pdfJsSources) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = source.library;
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Could not load PDF support from ${new URL(source.library).hostname}.`));
          document.head.append(script);
        });
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = source.worker;
          return window.pdfjsLib;
        }
      } catch (error) {
        console.warn(error.message);
      }
    }
    throw new Error("PDF support could not load. Check your internet connection, then reload and retry the PDF.");
  })().finally(() => {
    pdfJsLoadPromise = null;
  });
  return pdfJsLoadPromise;
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractLoadPromise) return tesseractLoadPromise;

  tesseractLoadPromise = (async () => {
    for (const source of tesseractSources) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = source;
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Could not load OCR support from ${new URL(source).hostname}.`));
          document.head.append(script);
        });
        if (window.Tesseract) return window.Tesseract;
      } catch (error) {
        console.warn(error.message);
      }
    }
    throw new Error("Kannada/English OCR could not load. Check your internet connection and reload the page.");
  })().finally(() => {
    tesseractLoadPromise = null;
  });
  return tesseractLoadPromise;
}

function extractTelegramText(value) {
  if (typeof value === "string") return cleanText(value);
  if (!Array.isArray(value)) return "";
  return cleanText(value.map((part) => {
    if (typeof part === "string") return part;
    if (part && typeof part.text === "string") return part.text;
    return "";
  }).join(""));
}

function normalizeDate(value) {
  if (typeof value === "number" || /^\d{10,13}$/.test(String(value || ""))) {
    const numeric = Number(value);
    const milliseconds = String(value).length === 13 ? numeric : numeric * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function buildStory(text, source, date, id) {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length < 35) return null;
  const sourceName = cleanText(source) || "Telegram export";
  const taggedTopics = topics.filter((topic) => topic.pattern.test(cleaned)).map((topic) => topic.name);
  if (!taggedTopics.length) taggedTopics.push("General affairs");
  const isKarnataka = karnatakaPattern.test(cleaned);
  return {
    id: `${sourceName.toLowerCase()}-${String(id || cleaned.slice(0, 80))}`,
    text: cleaned,
    source: sourceName,
    date: normalizeDate(date),
    topics: taggedTopics,
    language: /[\u0c80-\u0cff]/.test(cleaned) ? "Kannada" : "English / other",
    upsc: taggedTopics.some((topic) => topic !== "General affairs"),
    karnataka: isKarnataka,
    importedAt: new Date().toISOString(),
  };
}

function fromTelegramJson(data, filename) {
  const messages = [];
  function collect(container, sourceName) {
    if (!container || typeof container !== "object") return;
    const items = Array.isArray(container) ? container : Array.isArray(container.messages) ? container.messages : [];
    const source = cleanText(container.name || container.title || sourceName || filename);
    for (const message of items) {
      if (!message || typeof message !== "object" || message.type === "service") continue;
      const text = extractTelegramText(message.text);
      const story = buildStory(text, source, message.date || message.date_unixtime, message.id);
      if (story) messages.push(story);
    }
    if (container.chats && Array.isArray(container.chats.list)) {
      for (const chat of container.chats.list) collect(chat, chat.name || chat.title || filename);
    }
  }
  collect(data, filename.replace(/\.[^.]+$/, ""));
  return messages;
}

function fromTelegramHtml(html, filename) {
  const documentFromFile = new DOMParser().parseFromString(html, "text/html");
  const chatTitle = cleanText(documentFromFile.querySelector(".page_header, h1")?.textContent) || filename.replace(/\.[^.]+$/, "");
  const messageNodes = [...documentFromFile.querySelectorAll(".message.default, .message:not(.service)")];
  return messageNodes.map((node) => {
    const text = cleanText(node.querySelector(".text")?.textContent || node.textContent);
    const source = cleanText(node.querySelector(".from_name")?.textContent) || chatTitle;
    const dateNode = node.querySelector(".date.details, time[datetime], a.date");
    const date = dateNode?.getAttribute("title") || dateNode?.getAttribute("datetime") || dateNode?.textContent || "";
    return buildStory(text, source, date, node.id || `${filename}-${messagesIndex(node)}`);
  }).filter(Boolean);
}

function messagesIndex(node) {
  return [...node.parentElement.children].indexOf(node);
}

function fromPlainText(text, filename) {
  return text.split(/\r?\n(?:\s*\r?\n)+/).map((chunk, index) =>
    buildStory(chunk, newspaperName(filename), "", `${filename}-${index}`)
  ).filter(Boolean);
}

async function fromPdfFile(file) {
  const pdfjs = await loadPdfJs();
  let document;
  try {
    document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  } catch (error) {
    throw new Error(`${file.name}: PDF could not be opened (${error.message}). Try opening it in a PDF reader and saving a fresh copy.`);
  }
  const paper = newspaperName(file.name);
  const pages = [];
  const pageCount = document.numPages;
  let pagesWithoutText = 0;
  let advertisementLinesSkipped = 0;
  const ocrWorkers = [];
  let usedOcr = false;
  const ocrLanguage = isKannadaNewspaper(file.name) ? "kan" : "eng";
  const ocrModel = ocrDataSources.find((model) => model.language === ocrLanguage);

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = cleanText(content.items
        .filter((item) => "str" in item)
        .map((item) => item.str)
        .join(" "));

      if (text.length < 35 || hasCorruptText(text)) {
        if (!ocrWorkers.length) {
          importStatus.textContent = `Scanned or font-encoded pages found in ${file.name}. Loading ${ocrLanguage === "kan" ? "Kannada" : "English"} OCR…`;
          const tesseract = await loadTesseract();
          let lastLoggerUpdate = 0;
          const logger = (event) => {
            const now = Date.now();
            if (event.status && (now - lastLoggerUpdate > 800 || event.status === "recognizing text")) {
              const progress = Number.isFinite(event.progress) ? ` ${Math.round(event.progress * 100)}%` : "";
              importStatus.textContent = `OCR in progress: ${file.name}, page ${pageNumber} of ${pageCount} — ${event.status}${progress}`;
              lastLoggerUpdate = now;
            }
          };
          try {
            importStatus.textContent = `Loading ${ocrLanguage === "kan" ? "Kannada" : "English"} OCR model for ${file.name}…`;
            const worker = await tesseract.createWorker(ocrLanguage, 1, { langPath: ocrModel.langPath, gzip: false, logger });
            ocrWorkers.push({ language: ocrLanguage, worker });
          } catch (error) {
            throw new Error(`${ocrLanguage === "kan" ? "Kannada" : "English"} OCR model could not be loaded: ${error.message}`);
          }
        }

        importStatus.textContent = `Rendering scanned page ${pageNumber} of ${pageCount} for local OCR…`;
        const viewport = page.getViewport({ scale: 1.25 });
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error(`Could not prepare page ${pageNumber} for OCR.`);
        await page.render({ canvasContext: context, viewport }).promise;
        try {
          const result = await ocrWorkers[0].worker.recognize(canvas);
          const filtered = textFromOcrResult(result.data);
          text = filtered.text;
          advertisementLinesSkipped += filtered.skipped;
          usedOcr = true;
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      }

      if (text.length < 35) {
        pagesWithoutText += 1;
        continue;
      }
      const story = buildStory(text.slice(0, 12000), `${paper} · page ${pageNumber}`, file.lastModified, `${file.name}-page-${pageNumber}`);
      if (story) pages.push(story);
    }
  } finally {
    await Promise.all(ocrWorkers.map(({ worker }) => worker.terminate()));
    await document.destroy();
  }

  if (!pages.length) {
    throw new Error(`${file.name}: no readable English or Kannada text was found. Scanned text may be too small or unclear for OCR.`);
  }
  return { stories: pages, pageCount, skippedPages: pagesWithoutText, ocrUsed: usedOcr, advertisementLinesSkipped };
}

async function parseFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "pdf") return fromPdfFile(file);
  const content = await file.text();
  if (extension === "json") {
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      throw new Error(`${file.name} is not valid JSON.`);
    }
    return { stories: fromTelegramJson(data, file.name) };
  }
  if (extension === "html" || extension === "htm") return { stories: fromTelegramHtml(content, file.name) };
  if (extension === "txt") return { stories: fromPlainText(content, file.name) };
  throw new Error(`${file.name} has an unsupported format.`);
}

function displayDate(date) {
  if (!date) return "Date not included in export";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

function matchesSearch(story, query) {
  const haystack = `${story.text} ${story.source} ${story.topics.join(" ")}`.toLowerCase();
  return haystack.includes(query);
}

function createStoryCard(story) {
  const article = document.createElement("article");
  article.className = "story-card";
  const meta = document.createElement("div");
  meta.className = "story-meta";
  const date = document.createElement("span");
  date.textContent = displayDate(story.date);
  const source = document.createElement("span");
  source.className = "story-source";
  source.textContent = story.source;
  meta.append(date, source);

  const heading = document.createElement("h3");
  heading.textContent = story.text.split(/(?<=[.!?])\s/)[0].slice(0, 180);
  const body = document.createElement("p");
  body.className = "story-text";
  body.textContent = story.text.length > 180 ? `${story.text.slice(0, 177)}...` : story.text;

  const tags = document.createElement("div");
  tags.className = "story-tags";
  story.topics.forEach((topic) => {
    const tag = document.createElement("span");
    tag.className = "topic-tag";
    tag.textContent = topic;
    tags.append(tag);
  });
  if (story.language === "Kannada") {
    const languageTag = document.createElement("span");
    languageTag.className = "language-tag";
    languageTag.textContent = "ಕನ್ನಡ · Kannada";
    tags.append(languageTag);
  }
  if (story.upsc) {
    const upsc = document.createElement("span");
    upsc.className = "exam-tag upsc-tag";
    upsc.textContent = "UPSC-relevant";
    tags.append(upsc);
  }
  const kpsc = document.createElement("span");
  kpsc.className = story.karnataka ? "exam-tag kpsc-tag" : "exam-tag general-tag";
  kpsc.textContent = story.karnataka ? "KPSC · Karnataka link" : "KPSC · General";
  tags.append(kpsc);

  const review = document.createElement("p");
  review.className = "revision-hint";
  review.textContent = story.karnataka
    ? "Revision focus: identify the issue, relevant institution or policy, and its impact on Karnataka."
    : "Revision focus: identify the issue, relevant institution or policy, and its wider public impact.";
  article.append(meta, heading, body, tags, review);
  return article;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = stories.filter((story) => {
    const examMatch = activeFilter === "all"
      || (activeFilter === "upsc" && story.upsc)
      || (activeFilter === "kpsc" && story.karnataka);
    return examMatch && matchesSearch(story, query);
  });
  storyList.replaceChildren(...visible.map(createStoryCard));
  emptyState.hidden = stories.length > 0;
  storyList.hidden = visible.length === 0;
  if (stories.length > 0 && visible.length === 0) {
    emptyState.hidden = false;
    emptyState.querySelector("h3").textContent = "No stories match these filters";
    emptyState.querySelector("p").textContent = "Try another search or switch the exam filter.";
  } else {
    emptyState.querySelector("h3").textContent = "Your daily brief starts with a newspaper PDF";
    emptyState.querySelector("p").textContent = "Choose a downloaded English or Kannada newspaper PDF above. Searchable PDFs are extracted locally and shown as page-based study entries with rule-based topic tags.";
  }
  document.querySelector("#story-count").textContent = String(stories.length);
  document.querySelector("#upsc-count").textContent = String(stories.filter((story) => story.upsc).length);
  document.querySelector("#kpsc-count").textContent = String(stories.filter((story) => story.karnataka).length);
  document.querySelector("#brief-date").textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(new Date());
  downloadButton.disabled = stories.length === 0;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 4200);
}

fileInput.addEventListener("change", async () => {
  const files = [...fileInput.files];
  if (!files.length) return;
  let imported = [];
  const errors = [];
  const pdfNotes = [];
  for (const file of files) {
    try {
      importStatus.textContent = `Reading ${file.name} locally…`;
      const result = await parseFile(file);
      imported.push(...result.stories);
      if (result.pageCount) {
        const method = result.ocrUsed ? `${isKannadaNewspaper(file.name) ? "Kannada" : "English"} OCR` : "searchable-text extraction";
        pdfNotes.push(`${file.name}: ${result.stories.length} text page(s) extracted from ${result.pageCount} using ${method}; ${result.skippedPages} page(s) had too little readable text${result.advertisementLinesSkipped ? `; ${result.advertisementLinesSkipped} advertisement-like OCR line(s) skipped` : ""}.`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  const known = new Set(stories.map((story) => story.id));
  const unique = imported.filter((story) => !known.has(story.id) && known.add(story.id));
  stories = [...unique, ...stories].slice(0, maximumSavedStories);
  const saved = persistStories();
  render();
  const failedFiles = errors.length;
  const summary = `${unique.length} new story/page(s) imported${imported.length - unique.length ? `; ${imported.length - unique.length} duplicate(s) skipped` : ""}${failedFiles ? `; ${failedFiles} file(s) need attention` : ""}.`;
  const details = [...pdfNotes, ...errors].join(" ");
  importStatus.textContent = details ? `${summary} ${details}` : summary;
  showToast(errors.length ? `${summary} ${errors[0]}` : saved ? summary : "Imported stories could not all be saved. Download your brief before leaving.");
  fileInput.value = "";
});

searchInput.addEventListener("input", render);
document.querySelectorAll(".filter-tab").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    render();
  });
});

document.querySelector("#clear-button").addEventListener("click", () => {
  if (!stories.length) return;
  if (!window.confirm("Clear all imported stories saved in this browser? This cannot be undone.")) return;
  stories = [];
  persistStories();
  render();
  importStatus.textContent = "Saved stories cleared.";
});

downloadButton.addEventListener("click", () => {
  const markdown = [
    `# Daily Current Affairs — ${document.querySelector("#brief-date").textContent}`,
    "",
    "> Imported Telegram channel text with local keyword-based exam tags. These are not AI-generated summaries or verified facts.",
    "",
    ...stories.flatMap((story) => [
      `## ${story.text.split(/(?<=[.!?])\s/)[0].slice(0, 180)}`,
      `**Source:** ${story.source} · ${displayDate(story.date)}`,
      `**Topics:** ${story.topics.join(", ")}`,
      `**Exam focus:** ${story.upsc ? "UPSC-relevant" : "General news"} · ${story.karnataka ? "Karnataka KPSC (Karnataka link)" : "Karnataka KPSC (general)"}`,
      "",
      story.text,
      "",
      story.karnataka
        ? "_Revision focus: identify the issue, relevant institution or policy, and its impact on Karnataka._"
        : "_Revision focus: identify the issue, relevant institution or policy, and its wider public impact._",
      "",
    ]),
  ].join("\n");
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `current-affairs-${new Date().toISOString().slice(0, 10)}.md`;
  link.click();
  URL.revokeObjectURL(url);
});

render();
if (stories.length) importStatus.textContent = `${stories.length} saved newspaper page(s) loaded from this browser.`;
