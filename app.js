const fileInput = document.querySelector("#telegram-files");
const pdfPageRangeInput = document.querySelector("#pdf-page-range");
const importStatus = document.querySelector("#import-status");
const storyList = document.querySelector("#story-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const downloadButton = document.querySelector("#download-button");
const toast = document.querySelector("#toast");
const storageKey = "current-desk-stories-v1";
const maximumSavedStories = 1000;
const maximumOnlineItems = 10;
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
const zipSources = [
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
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
let zipLoadPromise;
let activeOnlineSection = "national";
let onlineRequestInProgress = false;
const onlineCache = new Map();

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

function hasReadableText(text) {
  const letters = (text.match(/\p{L}/gu) || []).length;
  const visibleCharacters = (text.match(/\S/g) || []).length;
  return letters >= 35 && letters / Math.max(visibleCharacters, 1) >= 0.48;
}

function hasReadableLine(text) {
  const letters = (text.match(/\p{L}/gu) || []).length;
  const visibleCharacters = (text.match(/\S/g) || []).length;
  return letters >= 5 && letters / Math.max(visibleCharacters, 1) >= 0.5;
}

function cleanOcrLine(line) {
  const cleaned = removeNewspaperFurniture(line)
    .replace(/[|¦_~`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || !hasReadableLine(cleaned)) return "";
  if (!/[\u0c80-\u0cff]/.test(cleaned)) {
    return cleaned.split(/\s+/).filter((word) => word.length > 1 || /^(a|i)$/i.test(word)).join(" ");
  }
  return cleaned;
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

function removeNewspaperFurniture(line) {
  return line
    .replace(/\bwww\.[\w.-]+\.[a-z]{2,}\b/gi, " ")
    .replace(/\b(?:financial express|the hindu|times of india|economic times)\b/gi, " ")
    .replace(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+\w+\s+\d{1,2},?\s+\d{4}\b/gi, " ")
    .replace(/\bpage\s+\d+\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textFromOcrResult(data, pageHeight) {
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  let skipped = 0;
  const articles = [];
  const sortedBlocks = [...blocks].sort((a, b) => (a.bbox?.y0 || 0) - (b.bbox?.y0 || 0)
    || (a.bbox?.x0 || 0) - (b.bbox?.x0 || 0));

  for (const block of sortedBlocks) {
    const bounds = block.bbox;
    if (bounds && pageHeight && (bounds.y1 < pageHeight * 0.035 || bounds.y0 > pageHeight * 0.97)) {
      skipped += 1;
      continue;
    }
    if (Number.isFinite(block.confidence) && block.confidence < 35) {
      skipped += 1;
      continue;
    }

    const lines = (block.paragraphs || [])
      .flatMap((paragraph) => (paragraph.lines || []).map((line) => line.text || ""))
      .filter(Boolean);
    const blockText = cleanText(lines.join(" "));
    if (isAdvertisementText(blockText)) {
      skipped += 1;
      continue;
    }
    const keptLines = lines.map(cleanOcrLine).filter((line) => {
      if (!line || isAdvertisementText(line)) {
        skipped += 1;
        return false;
      }
      return true;
    });
    const text = cleanText(keptLines.join(" "));
    if (text.length < 80 || !hasReadableText(text)) {
      skipped += 1;
      continue;
    }

    const title = cleanText(keptLines[0] || "").slice(0, 180);
    articles.push({ text, title });
  }

  if (!blocks.length) {
    const lines = (data.text || "").split(/\r?\n/).map(removeNewspaperFurniture)
      .filter((line) => line && !isAdvertisementText(line));
    const text = cleanText(lines.join(" "));
    if (text.length >= 80 && hasReadableText(text)) {
      articles.push({ text, title: cleanText(lines[0] || "").slice(0, 180) });
    }
  }
  return { articles, skipped };
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

function loadZipLibrary() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (zipLoadPromise) return zipLoadPromise;

  zipLoadPromise = (async () => {
    for (const source of zipSources) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = source;
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Could not load PowerPoint support from ${new URL(source).hostname}.`));
          document.head.append(script);
        });
        if (window.JSZip) return window.JSZip;
      } catch (error) {
        console.warn(error.message);
      }
    }
    throw new Error("PowerPoint support could not load. Check your internet connection, then reload and retry the PPTX.");
  })().finally(() => {
    zipLoadPromise = null;
  });
  return zipLoadPromise;
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

function buildStory(text, source, date, id, minimumLength = 35, title = "") {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length < minimumLength) return null;
  const sourceName = cleanText(source) || "Telegram export";
  const taggedTopics = topics.filter((topic) => topic.pattern.test(cleaned)).map((topic) => topic.name);
  if (!taggedTopics.length) taggedTopics.push("General affairs");
  const isKarnataka = karnatakaPattern.test(cleaned);
  return {
    id: `${sourceName.toLowerCase()}-${String(id || cleaned.slice(0, 80))}`,
    text: cleaned,
    title: cleanText(title),
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

async function fromPdfFile(file, onPageRead) {
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
  let selectedPages;
  let pagesWithoutText = 0;
  let filteredOcrBlocks = 0;
  const ocrWorkers = [];
  let usedOcr = false;
  const ocrLanguage = isKannadaNewspaper(file.name) ? "kan" : "eng";
  const ocrModel = ocrDataSources.find((model) => model.language === ocrLanguage);

  try {
    selectedPages = parsePdfPageRange(pdfPageRangeInput.value, pageCount);
    for (const pageNumber of selectedPages) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = cleanText(content.items
        .filter((item) => "str" in item)
        .map((item) => item.str)
        .join(" "));
      let pageArticles = [];
      let pageUsedOcr = false;

      if (text.length < 35 || hasCorruptText(text) || !hasReadableText(text)) {
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
          const filtered = textFromOcrResult(result.data, canvas.height);
          filteredOcrBlocks += filtered.skipped;
          pageArticles = filtered.articles;
          usedOcr = true;
          pageUsedOcr = true;
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      }

      if (pageArticles.length) {
        for (let articleIndex = 0; articleIndex < pageArticles.length; articleIndex += 1) {
          const article = pageArticles[articleIndex];
          const story = buildStory(
            article.text.slice(0, 12000),
            `${paper} · page ${pageNumber}`,
            file.lastModified,
            `${file.name}-page-${pageNumber}-article-${articleIndex + 1}`,
            80,
            article.title,
          );
          if (!story) continue;
          pages.push(story);
          onPageRead?.(story, pageNumber, pageCount);
        }
        continue;
      }

      if (pageUsedOcr || text.length < 35 || !hasReadableText(text)) {
        pagesWithoutText += 1;
        continue;
      }
      const story = buildStory(text.slice(0, 12000), `${paper} · page ${pageNumber}`, file.lastModified, `${file.name}-page-${pageNumber}`);
      if (story) {
        pages.push(story);
        onPageRead?.(story, pageNumber, pageCount);
      }
    }
  } finally {
    await Promise.all(ocrWorkers.map(({ worker }) => worker.terminate()));
    await document.destroy();
  }

  if (!pages.length) {
    throw new Error(`${file.name}: no readable English or Kannada text was found. Scanned text may be too small or unclear for OCR.`);
  }
  return {
    stories: pages,
    pageCount,
    selectedPageCount: selectedPages.length,
    skippedPages: pagesWithoutText,
    ocrUsed: usedOcr,
    filteredOcrBlocks,
  };
}

function parsePdfPageRange(value, pageCount) {
  const selection = value.trim();
  if (!selection) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = new Set();
  for (const part of selection.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error("Enter PDF pages like 1-5,8, or leave the field blank for all pages.");
    const first = Number(match[1]);
    const last = Number(match[2] || match[1]);
    if (first < 1 || last < first || last > pageCount) {
      throw new Error(`PDF page ranges must be between 1 and ${pageCount}, with the first page no greater than the last.`);
    }
    for (let page = first; page <= last; page += 1) pages.add(page);
  }
  return [...pages].sort((first, last) => first - last);
}

async function fromPowerPointFile(file, onSlideRead) {
  const JSZip = await loadZipLibrary();
  let archive;
  try {
    archive = await JSZip.loadAsync(await file.arrayBuffer());
  } catch (error) {
    throw new Error(`${file.name}: PowerPoint could not be opened (${error.message}). Save it as a .pptx file and try again.`);
  }

  const slideFiles = Object.keys(archive.files)
    .map((path) => ({ path, match: path.match(/^ppt\/slides\/slide(\d+)\.xml$/) }))
    .filter((entry) => entry.match && !archive.files[entry.path].dir)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));
  if (!slideFiles.length) {
    throw new Error(`${file.name}: no presentation slides were found. Use a .pptx file (older .ppt files are not supported).`);
  }

  const stories = [];
  const drawingNamespace = "http://schemas.openxmlformats.org/drawingml/2006/main";
  for (let index = 0; index < slideFiles.length; index += 1) {
    const slideNumber = Number(slideFiles[index].match[1]);
    const xmlText = await archive.files[slideFiles[index].path].async("text");
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    if (xml.querySelector("parsererror")) {
      throw new Error(`${file.name}: slide ${slideNumber} contains invalid PowerPoint XML.`);
    }
    const slideShapes = [...xml.getElementsByTagNameNS(
      "http://schemas.openxmlformats.org/presentationml/2006/main",
      "sp",
    )];
    const titleParagraphs = [];
    const bodyParagraphs = [];
    for (const shape of slideShapes) {
      const placeholder = shape.getElementsByTagNameNS(
        "http://schemas.openxmlformats.org/presentationml/2006/main",
        "ph",
      )[0];
      const isTitle = ["title", "ctrTitle"].includes(placeholder?.getAttribute("type"));
      const paragraphs = [...shape.getElementsByTagNameNS(drawingNamespace, "p")]
        .map((paragraph) => [...paragraph.getElementsByTagNameNS(drawingNamespace, "t")]
          .map((textNode) => textNode.textContent || "")
          .join(""))
        .filter(Boolean);
      (isTitle ? titleParagraphs : bodyParagraphs).push(...paragraphs);
    }
    const title = cleanText(titleParagraphs[0] || bodyParagraphs[0] || "");
    const contentParagraphs = titleParagraphs.length || bodyParagraphs.length > 1
      ? [...titleParagraphs.slice(1), ...bodyParagraphs]
      : bodyParagraphs.slice(1);
    const text = cleanText([title, contentParagraphs.join(" • ")].filter(Boolean).join(" "));
    const story = buildStory(
      text,
      `${file.name.replace(/\.pptx$/i, "")} · slide ${slideNumber}`,
      file.lastModified,
      `${file.name}-slide-${slideNumber}`,
      20,
      title,
    );
    if (!story) continue;
    stories.push(story);
    onSlideRead?.(story, index + 1, slideFiles.length);
  }

  if (!stories.length) {
    throw new Error(`${file.name}: no readable text was found in ${slideFiles.length} slides. Image-only slides are not OCR-processed.`);
  }
  return { stories, slideCount: slideFiles.length, skippedSlides: slideFiles.length - stories.length };
}

async function parseFile(file, onPageRead) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "pdf") return fromPdfFile(file, onPageRead);
  if (extension === "pptx") return fromPowerPointFile(file, onPageRead);
  if (extension === "ppt") throw new Error(`${file.name}: older .ppt files are not supported. Open it in PowerPoint and save as .pptx first.`);
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
  heading.textContent = story.title || story.text.split(/(?<=[.!?])\s/)[0].slice(0, 180);
  const displayText = story.title && story.text.startsWith(story.title)
    ? story.text.slice(story.title.length).replace(/^\s*[—–:-]\s*/, "").trim()
    : story.text;
  const body = document.createElement("p");
  body.className = "story-text";
  body.textContent = displayText.length > 280 ? `${displayText.slice(0, 277)}...` : displayText;
  const fullText = displayText.length > 280 ? document.createElement("details") : null;
  if (fullText) {
    fullText.className = "story-full-text";
    const summary = document.createElement("summary");
    summary.textContent = "Read full extracted text";
    const fullTextBody = document.createElement("p");
    fullTextBody.textContent = displayText;
    fullText.append(summary, fullTextBody);
  }

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

  article.append(meta, heading, body);
  if (fullText) article.append(fullText);
  article.append(tags);
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
    emptyState.querySelector("h3").textContent = "Your daily brief starts with a newspaper or presentation";
    emptyState.querySelector("p").textContent = "Choose an English or Kannada newspaper PDF, or a PPTX presentation. Scanned newspaper text is split into best-effort article cards; presentation slides use their title and text. Topic tags are keyword suggestions, not verified exam classifications.";
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

function formatOnlineDate(value) {
  const compactDate = String(value || "").match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  const normalized = compactDate
    ? `${compactDate[1]}-${compactDate[2]}-${compactDate[3]}T${compactDate[4]}:${compactDate[5]}:${compactDate[6]}Z`
    : value;
  const date = new Date(normalized || "");
  return Number.isNaN(date.getTime())
    ? "Recent"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function renderOnlineItems(items) {
  const list = document.querySelector("#online-list");
  const safeItems = Array.isArray(items) ? items.slice(0, maximumOnlineItems) : [];
  list.replaceChildren();
  if (!safeItems.length) {
    const empty = document.createElement("p");
    empty.className = "online-empty";
    empty.textContent = activeOnlineSection === "jobs"
      ? "No recent recruitment news mentions were returned. Use the official recruitment portals above to check open notices."
      : "No headlines were returned for this section. Try refreshing later.";
    list.append(empty);
    return;
  }

  for (const item of safeItems) {
    if (!item || typeof item.title !== "string" || !/^https:\/\//i.test(item.url || "")) continue;
    const article = document.createElement("article");
    article.className = "online-item";
    const heading = document.createElement("h3");
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.title;
    heading.append(link);
    if (item.summary) {
      const summary = document.createElement("p");
      summary.className = "online-summary";
      summary.textContent = item.summary;
      article.append(heading, summary);
    } else {
      article.append(heading);
    }
    const meta = document.createElement("p");
    meta.className = "online-meta";
    meta.textContent = [item.source || "News source", item.country, formatOnlineDate(item.publishedAt)]
      .filter(Boolean)
      .join(" · ");
    article.append(meta);
    list.append(article);
  }
}

async function loadOnlineUpdates(section = activeOnlineSection, force = false) {
  if (onlineRequestInProgress) return;
  activeOnlineSection = section;
  const status = document.querySelector("#online-status");
  const refreshButton = document.querySelector("#refresh-online");
  const officialLinks = document.querySelector("#official-job-links");
  const tabs = [...document.querySelectorAll("[data-online-section]")];
  const labels = {
    national: "national",
    international: "international",
    karnataka: "Karnataka current-affairs",
    jobs: "government job",
  };
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.onlineSection === section));
  officialLinks.hidden = section !== "jobs";

  const cached = onlineCache.get(section);
  if (!force && cached && Date.now() - cached.savedAt < 5 * 60 * 1000) {
    renderOnlineItems(cached.items);
    status.textContent = `Updated ${formatOnlineDate(cached.fetchedAt)} · ${Math.min(cached.items.length, maximumOnlineItems)} headline(s)`;
    return;
  }

  onlineRequestInProgress = true;
  refreshButton.disabled = true;
  status.textContent = `Searching recent ${labels[section]} updates through public RSS feeds…`;
  try {
    const localApiUrls = [...new Set([
      "http://127.0.0.1:8766/api/news",
      `${window.location.origin}/api/news`,
      "http://127.0.0.1:8765/api/news",
    ])];
    let data;
    let lastError;
    for (let index = 0; index < localApiUrls.length; index += 1) {
      try {
        const url = new URL(localApiUrls[index]);
        url.searchParams.set("section", section);
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `News API returned HTTP ${response.status}.`);
        data = payload;
        if (Array.isArray(payload.items) && payload.items.length) break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!data && lastError) throw lastError;
    const items = Array.isArray(data?.items) ? data.items.slice(0, maximumOnlineItems) : [];
    onlineCache.set(section, { items, fetchedAt: data.fetchedAt, savedAt: Date.now() });
    renderOnlineItems(items);
    status.textContent = `Updated ${formatOnlineDate(data.fetchedAt)} · ${items.length} item(s) · ${data.provider || "public RSS"}`;
  } catch (error) {
    status.textContent = `Could not load online updates: ${error.message} Start start-local.ps1 and refresh.`;
    document.querySelector("#online-list").replaceChildren();
  } finally {
    onlineRequestInProgress = false;
    refreshButton.disabled = false;
  }
}

document.querySelectorAll("[data-online-section]").forEach((button) => {
  button.addEventListener("click", () => loadOnlineUpdates(button.dataset.onlineSection, true));
});
document.querySelector("#refresh-online").addEventListener("click", () => loadOnlineUpdates(activeOnlineSection, true));

document.querySelectorAll("[data-desk-view]").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.deskView;
    document.querySelectorAll("[data-desk-view]").forEach((tab) => {
      const isActive = tab === button;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-pressed", String(isActive));
    });
    document.querySelectorAll("[data-view-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.viewPanel !== view;
    });
  });
});

fileInput.addEventListener("change", async () => {
  const files = [...fileInput.files];
  if (!files.length) return;
  let imported = [];
  const errors = [];
  const importNotes = [];
  const knownBeforeImport = new Set(stories.map((story) => story.id));
  for (const file of files) {
    let removedPreviousImport = false;
    try {
      importStatus.textContent = `Reading ${file.name} locally…`;
      const result = await parseFile(file, (story, pageNumber, pageCount) => {
        if (!removedPreviousImport) {
          const fileMarker = `${file.name.toLowerCase()}-page-`;
          const slideMarker = `${file.name.toLowerCase()}-slide-`;
          const isPdf = file.name.toLowerCase().endsWith(".pdf");
          const selectedPages = isPdf ? new Set(parsePdfPageRange(pdfPageRangeInput.value, pageCount)) : null;
          stories = stories.filter((savedStory) => {
            const savedId = String(savedStory.id).toLowerCase();
            if (isPdf && savedId.includes(fileMarker)) {
              const pageMatch = savedId.match(/-page-(\d+)(?:-|$)/);
              return !pageMatch || !selectedPages.has(Number(pageMatch[1]));
            }
            return !savedId.includes(fileMarker) && !savedId.includes(slideMarker);
          });
          removedPreviousImport = true;
        }
        stories = [story, ...stories.filter((savedStory) => savedStory.id !== story.id)].slice(0, maximumSavedStories);
        persistStories();
        render();
        const unit = file.name.toLowerCase().endsWith(".pptx") ? "slide" : "page";
        importStatus.textContent = `Reading ${file.name}: ${unit} ${pageNumber} of ${pageCount} processed · ${stories.length} item(s) saved so far.`;
      });
      imported.push(...result.stories);
      if (result.pageCount) {
        const method = result.ocrUsed ? `${isKannadaNewspaper(file.name) ? "Kannada" : "English"} OCR` : "searchable-text extraction";
        importNotes.push(`${file.name}: ${result.stories.length} text item(s) extracted from ${result.selectedPageCount} selected page(s) (of ${result.pageCount}) using ${method}; ${result.skippedPages} selected page(s) had too little readable text${result.filteredOcrBlocks ? `; ${result.filteredOcrBlocks} low-quality, header, or ad OCR block(s) filtered` : ""}.`);
      } else if (result.slideCount) {
        importNotes.push(`${file.name}: ${result.stories.length} text story/stories extracted from ${result.slideCount} slide(s); ${result.skippedSlides} slide(s) had too little readable text.`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  const known = new Set(knownBeforeImport);
  const unique = imported.filter((story) => !known.has(story.id) && known.add(story.id));
  const savedDuringImport = new Set(stories.map((story) => story.id));
  const notYetSaved = unique.filter((story) => !savedDuringImport.has(story.id));
  stories = [...notYetSaved, ...stories].slice(0, maximumSavedStories);
  const saved = persistStories();
  render();
  const failedFiles = errors.length;
  const summary = `${unique.length} new item(s) imported${imported.length - unique.length ? `; ${imported.length - unique.length} duplicate(s) skipped` : ""}${failedFiles ? `; ${failedFiles} file(s) need attention` : ""}.`;
  const details = [...importNotes, ...errors].join(" ");
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
    "> Locally extracted newspaper, presentation, or Telegram text with keyword-based exam tags. Scanned newspaper articles are grouped heuristically; these are not AI-generated summaries or verified facts.",
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
loadOnlineUpdates("national");
