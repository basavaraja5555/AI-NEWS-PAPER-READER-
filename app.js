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
const maximumFetchedOnlineItems = 50;
const languageStorageKey = "current-desk-language-v1";
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
let activeOnlinePage = 1;
let onlineRequestInProgress = false;
const onlineCache = new Map();
const translations = {
  en: {
    studyDesk: "STUDY DESK",
    studyDeskViews: "Study desk views",
    examPreparation: "UPSC + KARNATAKA KPSC",
    onlineUpdates: "Online updates",
    pdfImports: "PDF imports",
    localSourced: "Local + sourced",
    privacyDescription: "Imported files stay in this browser. Online headlines link to their publishers and feeds.",
    basavaStudyDesk: "Basava's study desk",
    currentAffairs: "Current affairs",
    languageLabel: "Language",
    onThisDevice: "On this device",
    heroLineOne: "Today's news.",
    heroLineTwo: "Tomorrow's advantage.",
    heroDescription: "Stay exam-ready with national and global news, Karnataka updates, and government job alerts—all in one study desk for UPSC and Karnataka KPSC.",
    freshHeadlines: "10 HEADLINES PER PAGE · PUBLIC RSS FEEDS",
    dailyBriefing: "The daily briefing",
    refresh: "↻ Refresh",
    onlineCategory: "Online update category",
    national: "National",
    international: "International",
    karnataka: "Karnataka",
    karnatakaCurrentAffairs: "Karnataka current affairs",
    governmentJobs: "Govt jobs",
    jobs: "Jobs",
    onlineDisclaimer: "National, international and Karnataka headlines use Bing News RSS; job listings use FreeJobAlert RSS and are not official vacancy notices. Feeds may return fewer than 10 relevant updates. Confirm dates, eligibility and application links on official recruitment sites. Article summaries come from their feed; open the linked publisher to verify context.",
    upscRecruitment: "UPSC recruitment",
    karnatakaPsc: "Karnataka PSC",
    sscNotices: "SSC notices",
    careerService: "National Career Service",
    importFiles: "Import files",
    importDescription: "Optional: select newspaper PDFs or PowerPoint presentations, or import Telegram HTML and JSON exports.",
    chooseFiles: "Choose files",
    fileHelp: "PDF / PPTX / HTML / JSON / text · Files stay in your browser · Nothing is uploaded",
    clearSaved: "Clear saved posts",
    pdfPages: "PDF pages",
    allPages: "All pages",
    pageRangeHelp: "Optional: enter pages like 1-5,8. Blank imports every page. Only selected pages are replaced when you reimport.",
    importHelpTitle: "How to import newspapers and Telegram exports",
    importStepOne: "Click Choose files. In the file picker, open Downloads, select PDFs, PPTX files, or supported exports, and click Open. Optionally enter a PDF page range such as 1-5,8; leave it blank to import all pages.",
    importStepTwo: "Selectable PDF text is extracted page by page. PPTX slide text is extracted locally, with each readable slide added as a study story. Images embedded in slides are not OCR-read; older .ppt files should be saved as .pptx first.",
    importStepThree: "Scanned PDFs are rendered temporarily in your browser for OCR. Low-confidence text, common page headers and footers, and obvious ad blocks are filtered; the remaining text is grouped into best-effort article cards. Only recognised text is saved, not page images; pages are saved as they finish. Reimporting replaces only the selected pages from that PDF and preserves the others. Some ads or scan errors may remain.",
    importStepFour: "The OCR engine and language models download from public CDNs the first time; the newspaper PDF itself stays on your device. First-time OCR can be slow.",
    importStepFive: "For Telegram newspaper posts: in Telegram Desktop open Settings → Advanced → Export Telegram data, export selected chats as JSON or HTML, then import those files here.",
    importPrivacy: "This page cannot scan Downloads by itself. Choose only files you want to import. Files are processed in your browser and are not uploaded. Online headlines use free public Bing News RSS and FreeJobAlert RSS feeds through the local server; opening a headline takes you to its publisher. Start start-local.ps1 to enable online updates and open http://127.0.0.1:8765/. PDF.js, OCR files, and the PPTX zip parser load from public CDNs.",
    yourImportedNews: "YOUR IMPORTED NEWS",
    downloadBrief: "↓ Download brief",
    itemsSaved: "ITEMS SAVED",
    upscMatches: "UPSC TOPIC MATCHES",
    karnatakaMentions: "KARNATAKA MENTIONS",
    searchNews: "Search imported news...",
    filterByExam: "Filter by exam",
    allNews: "All news",
    upsc: "UPSC",
    karnatakaKpsc: "Karnataka KPSC",
    emptyTitle: "Your daily brief starts with a newspaper or presentation",
    emptyDescription: "Choose an English or Kannada newspaper PDF, or a PPTX presentation. Scanned newspaper text is split into best-effort article cards; presentation slides use their title and text. Topic tags are keyword suggestions, not verified exam classifications.",
    importDisclaimer: "Exam/topic labels are keyword matches and Karnataka mentions, not verified exam relevance. OCR article grouping is best-effort; check the source paper for exact wording and context.",
    dashboardLabel: "Current affairs dashboard",
    footerPrivacy: "Basava Kademane Study Desk · Files stay on this device",
    prepareWith: "PREPARE WITH",
    purpose: "PURPOSE",
    onlineJobsEmpty: "No recent recruitment news mentions were returned. Use the official recruitment portals above to check open notices.",
    onlineEmpty: "No headlines were returned for this section. Try refreshing later.",
    previousPage: "Previous",
    nextPage: "Next",
    pageNumber: "Page {page}",
    pageCount: "Page {page} of {total}",
    headlinePages: "Headline pages",
    chatTitle: "Ask ChatGPT",
    chatDescription: "Write a question and continue it in ChatGPT. This study desk stays open in this tab.",
    chatPlaceholder: "Ask about current affairs or your studies…",
    chatSend: "Continue in ChatGPT",
    chatPrivacy: "Your prompt will be sent to ChatGPT when you continue. ChatGPT replies in its own tab.",
    readingFile: "Reading {file} locally…",
    scannedPages: "Scanned or font-encoded pages found in {file}. Loading {language} OCR…",
    loadingOcrModel: "Loading {language} OCR model for {file}…",
    ocrProgress: "OCR in progress: {file}, page {page} of {total} — {status}{progress}",
    renderingPage: "Rendering scanned page {page} of {total} for local OCR…",
    processingFile: "Reading {file}: {unit} {page} of {total} processed · {count} item(s) saved so far.",
    importToast: "{summary} {error}",
    savedStoriesCleared: "Saved stories cleared.",
    clearConfirm: "Clear all imported stories saved in this browser? This cannot be undone.",
    clearStorageFull: "Browser storage is full. Download your brief and clear some saved stories.",
    saveFailure: "Imported stories could not all be saved. Download your brief before leaving.",
    fullExtractedText: "Read full extracted text",
    kannadaLanguage: "ಕನ್ನಡ · Kannada",
    upscRelevant: "UPSC-relevant",
    kpscKarnatakaLink: "KPSC · Karnataka link",
    kpscGeneral: "KPSC · General",
    noStoriesMatch: "No stories match these filters",
    tryDifferentFilters: "Try another search or switch the exam filter.",
    emptyBriefTitle: "Your daily brief starts with a newspaper or presentation",
    chooseNewspaper: "Choose an English or Kannada newspaper PDF, or a PPTX presentation. Scanned newspaper text is split into best-effort article cards; presentation slides use their title and text. Topic tags are keyword suggestions, not verified exam classifications.",
    searchUpdates: "Searching recent {section} updates through public RSS feeds…",
    updatedItems: "Updated {date} · {count} item(s) · {provider}",
    updatedHeadlines: "Updated {date} · {count} headline(s)",
    onlineLoadError: "Could not load online updates: {error} Start start-local.ps1 and refresh.",
    clearConfirm: "Clear all imported stories saved in this browser? This cannot be undone.",
    cleared: "Saved stories cleared.",
    noImportedYet: "No newspaper files imported yet.",
    readFile: "Reading {file} locally…",
    scannedPages: "Scanned or font-encoded pages found in {file}. Loading {language} OCR…",
    loadingOcr: "Loading {language} OCR model for {file}…",
    ocrProgress: "OCR in progress: {file}, page {page} of {total} — {status}{progress}",
    renderingPage: "Rendering scanned page {page} of {total} for local OCR…",
    processingFile: "Reading {file}: {unit} {page} of {total} processed · {count} item(s) saved so far.",
    importSummary: "{count} new item(s) imported{duplicates}{failures}.",
    duplicateSummary: "; {count} duplicate(s) skipped",
    failedFiles: "; {count} file(s) need attention",
    paperPagesLoaded: "{count} saved newspaper page(s) loaded from this browser.",
    clearStorageFull: "Browser storage is full. Download your brief and clear some saved stories.",
    saveFailure: "Imported stories could not all be saved. Download your brief before leaving.",
    importToast: "{summary} {error}",
    dateMissing: "Date not included in export",
    revisionFocus: "Revision focus: identify the issue, relevant institution or policy, and its impact on Karnataka.",
    widerRevisionFocus: "Revision focus: identify the issue, relevant institution or policy, and its wider public impact.",
    briefTitle: "Daily Current Affairs",
    locallyExtractedNote: "Locally extracted newspaper, presentation, or Telegram text with keyword-based exam tags. Scanned newspaper articles are grouped heuristically; these are not AI-generated summaries or verified facts.",
    sourceLabel: "Source:",
    topicsLabel: "Topics:",
    examFocusLabel: "Exam focus:",
    upscFocus: "UPSC-relevant",
    generalNews: "General news",
    karnatakaLink: "Karnataka KPSC (Karnataka link)",
    kpscGeneralFocus: "Karnataka KPSC (general)",
    polityTopic: "Polity & governance",
    economyTopic: "Economy",
    environmentTopic: "Environment",
    scienceTopic: "Science & technology",
    internationalRelationsTopic: "International relations",
    societyTopic: "Society & health",
    securityTopic: "Security",
    schemesTopic: "Schemes & public policy",
  },
  kn: {
    studyDesk: "ಅಧ್ಯಯನ ಕೇಂದ್ರ",
    studyDeskViews: "ಅಧ್ಯಯನ ವಿಭಾಗಗಳು",
    examPreparation: "UPSC + ಕರ್ನಾಟಕ KPSC",
    onlineUpdates: "ಆನ್‌ಲೈನ್ ಸುದ್ದಿ",
    pdfImports: "PDF ಆಮದು",
    localSourced: "ಸ್ಥಳೀಯ ಮತ್ತು ಮೂಲಸಹಿತ",
    privacyDescription: "ಆಮದು ಮಾಡಿದ ಕಡತಗಳು ಈ ಬ್ರೌಸರ್‌ನಲ್ಲೇ ಇರುತ್ತವೆ. ಆನ್‌ಲೈನ್ ಸುದ್ದಿಗಳು ಮೂಲ ಪ್ರಕಾಶಕರಿಗೆ ಕೊಂಡಿಯಾಗಿವೆ.",
    basavaStudyDesk: "ಬಸವರ ಅಧ್ಯಯನ ಕೇಂದ್ರ",
    currentAffairs: "ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು",
    languageLabel: "ಭಾಷೆ",
    onThisDevice: "ಈ ಸಾಧನದಲ್ಲಿ",
    heroLineOne: "ಇಂದಿನ ಸುದ್ದಿ.",
    heroLineTwo: "ನಾಳೆಯ ಯಶಸ್ಸಿಗೆ.",
    heroDescription: "UPSC ಮತ್ತು ಕರ್ನಾಟಕ KPSC ತಯಾರಿಗಾಗಿ ರಾಷ್ಟ್ರೀಯ ಹಾಗೂ ಜಾಗತಿಕ ಸುದ್ದಿಗಳು, ಕರ್ನಾಟಕದ ಅಪ್‌ಡೇಟ್‌ಗಳು ಮತ್ತು ಸರ್ಕಾರಿ ಉದ್ಯೋಗ ಮಾಹಿತಿಯನ್ನು ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ ಪಡೆಯಿರಿ.",
    freshHeadlines: "ಪ್ರತಿ ಪುಟದಲ್ಲಿ 10 ಸುದ್ದಿಗಳು · ಸಾರ್ವಜನಿಕ RSS ಫೀಡ್‌ಗಳು",
    dailyBriefing: "ಇಂದಿನ ಸುದ್ದಿ ಸಂಗ್ರಹ",
    refresh: "↻ ಮರುಲೋಡ್",
    onlineCategory: "ಆನ್‌ಲೈನ್ ಸುದ್ದಿ ವಿಭಾಗ",
    national: "ರಾಷ್ಟ್ರೀಯ",
    international: "ಅಂತರರಾಷ್ಟ್ರೀಯ",
    karnatakaCurrentAffairs: "ಕರ್ನಾಟಕ ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು",
    governmentJobs: "ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳು",
    onlineDisclaimer: "ರಾಷ್ಟ್ರೀಯ, ಅಂತರರಾಷ್ಟ್ರೀಯ ಮತ್ತು ಕರ್ನಾಟಕದ ಸುದ್ದಿಗಳು Bing News RSS‌ನಿಂದ ಬರುತ್ತವೆ. ಉದ್ಯೋಗ ಸುದ್ದಿಗಳು ಅಧಿಕೃತ ನೇಮಕಾತಿ ಪ್ರಕಟಣೆಗಳಲ್ಲ. ದಿನಾಂಕ, ಅರ್ಹತೆ ಮತ್ತು ಅರ್ಜಿ ವಿವರಗಳನ್ನು ಅಧಿಕೃತ ತಾಣಗಳಲ್ಲಿ ಪರಿಶೀಲಿಸಿ. ಸುದ್ದಿಯ ಸಾರಾಂಶ ಮೂಲ ಫೀಡ್‌ನಿಂದ ಬಂದಿದೆ; ಸಂದರ್ಭ ಪರಿಶೀಲಿಸಲು ಪ್ರಕಾಶಕರ ಕೊಂಡಿಯನ್ನು ತೆರೆಯಿರಿ.",
    previousPage: "ಹಿಂದಿನ",
    nextPage: "ಮುಂದೆ",
    pageNumber: "ಪುಟ {page}",
    pageCount: "{total}ರಲ್ಲಿ {page}ನೇ ಪುಟ",
    headlinePages: "ಸುದ್ದಿ ಪುಟಗಳು",
    chatTitle: "ChatGPT ಅನ್ನು ಕೇಳಿ",
    chatDescription: "ಪ್ರಶ್ನೆಯನ್ನು ಬರೆಯಿರಿ ಮತ್ತು ChatGPT ನಲ್ಲಿ ಮುಂದುವರಿಸಿ. ಈ ಅಧ್ಯಯನ ಪುಟ ಇದೇ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆದಿರುತ್ತದೆ.",
    chatPlaceholder: "ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು ಅಥವಾ ಅಧ್ಯಯನದ ಬಗ್ಗೆ ಕೇಳಿ…",
    chatSend: "ChatGPT ನಲ್ಲಿ ಮುಂದುವರಿಸಿ",
    chatPrivacy: "ಮುಂದುವರಿಸಿದಾಗ ನಿಮ್ಮ ಪ್ರಶ್ನೆ ChatGPT ಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ. ಉತ್ತರ ChatGPT ನ ಸ್ವಂತ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಬರುತ್ತದೆ.",
    upscRecruitment: "UPSC ನೇಮಕಾತಿ",
    karnatakaPsc: "ಕರ್ನಾಟಕ ಲೋಕಸೇವಾ ಆಯೋಗ",
    sscNotices: "SSC ಪ್ರಕಟಣೆಗಳು",
    careerService: "ರಾಷ್ಟ್ರೀಯ ವೃತ್ತಿ ಸೇವೆ",
    importFiles: "ಕಡತಗಳನ್ನು ಆಮದು ಮಾಡಿ",
    importDescription: "ಐಚ್ಛಿಕವಾಗಿ ಪತ್ರಿಕೆಗಳ PDF, PowerPoint ಪ್ರಸ್ತುತಿಗಳು ಅಥವಾ Telegram HTML/JSON ಕಡತಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    chooseFiles: "ಕಡತಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    fileHelp: "PDF / PPTX / HTML / JSON / ಪಠ್ಯ · ಕಡತಗಳು ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲೇ ಇರುತ್ತವೆ · ಅಪ್‌ಲೋಡ್ ಆಗುವುದಿಲ್ಲ",
    clearSaved: "ಉಳಿಸಿದ ಸುದ್ದಿಗಳನ್ನು ಅಳಿಸಿ",
    pdfPages: "PDF ಪುಟಗಳು",
    allPages: "ಎಲ್ಲಾ ಪುಟಗಳು",
    pageRangeHelp: "ಐಚ್ಛಿಕ: 1-5,8 ಎಂಬಂತೆ ಪುಟಗಳನ್ನು ನಮೂದಿಸಿ. ಖಾಲಿ ಬಿಟ್ಟರೆ ಎಲ್ಲಾ ಪುಟಗಳನ್ನು ಆಮದು ಮಾಡುತ್ತದೆ. ಮರುಆಮದು ಮಾಡಿದಾಗ ಆಯ್ಕೆ ಮಾಡಿದ ಪುಟಗಳಷ್ಟೇ ಬದಲಾಗುತ್ತವೆ.",
    importHelpTitle: "ಪತ್ರಿಕೆ ಮತ್ತು Telegram ಕಡತಗಳನ್ನು ಆಮದು ಮಾಡುವ ವಿಧಾನ",
    importStepOne: "ಕಡತಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ ಒತ್ತಿ. Downloads ತೆರೆಯಿರಿ, PDF, PPTX ಅಥವಾ ಬೆಂಬಲಿತ ಕಡತಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ. ಬೇಕಿದ್ದರೆ 1-5,8 ಎಂಬ PDF ಪುಟ ವ್ಯಾಪ್ತಿಯನ್ನು ನಮೂದಿಸಿ; ಎಲ್ಲಾ ಪುಟಗಳಿಗೆ ಖಾಲಿ ಬಿಡಿ.",
    importStepTwo: "PDF‌ನಲ್ಲಿರುವ ಆಯ್ಕೆ ಮಾಡಬಹುದಾದ ಪಠ್ಯವನ್ನು ಪುಟದಿಂದ ಪುಟಕ್ಕೆ ಓದಲಾಗುತ್ತದೆ. PPTX ಪಠ್ಯವನ್ನು ಸಾಧನದಲ್ಲೇ ಓದಲಾಗುತ್ತದೆ. ಸ್ಲೈಡ್ ಚಿತ್ರಗಳನ್ನು OCR ಮೂಲಕ ಓದುವುದಿಲ್ಲ; ಹಳೆಯ .ppt ಕಡತವನ್ನು ಮೊದಲು .pptx ಆಗಿ ಉಳಿಸಿ.",
    importStepThree: "ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ PDF ಪುಟಗಳನ್ನು OCR ಗಾಗಿ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ತಾತ್ಕಾಲಿಕವಾಗಿ ಚಿತ್ರಿಸಲಾಗುತ್ತದೆ. ಕಡಿಮೆ ವಿಶ್ವಾಸದ ಪಠ್ಯ, ಸಾಮಾನ್ಯ ಶೀರ್ಷಿಕೆ/ಅಡಿಪಠ್ಯ ಮತ್ತು ಸ್ಪಷ್ಟ ಜಾಹೀರಾತುಗಳನ್ನು ಫಿಲ್ಟರ್ ಮಾಡಲಾಗುತ್ತದೆ. ಉಳಿದ ಪಠ್ಯವನ್ನು ಅಂದಾಜಿನ ಆಧಾರದಲ್ಲಿ ಸುದ್ದಿಗಳಾಗಿ ವಿಂಗಡಿಸಲಾಗುತ್ತದೆ. ಪಠ್ಯ ಮಾತ್ರ ಉಳಿಯುತ್ತದೆ; ಪುಟದ ಚಿತ್ರಗಳನ್ನು ಉಳಿಸುವುದಿಲ್ಲ ಅಥವಾ ಅಪ್‌ಲೋಡ್ ಮಾಡುವುದಿಲ್ಲ. ಮರುಆಮದು ಮಾಡಿದಾಗ ಆಯ್ದ ಪುಟಗಳಷ್ಟೇ ಬದಲಾಗುತ್ತವೆ. ಕೆಲವು ಜಾಹೀರಾತು ಅಥವಾ ಸ್ಕ್ಯಾನ್ ದೋಷಗಳು ಉಳಿಯಬಹುದು.",
    importStepFour: "OCR ಎಂಜಿನ್ ಮತ್ತು ಭಾಷಾ ಮಾದರಿಗಳು ಮೊದಲ ಬಳಕೆಯಲ್ಲಿ ಸಾರ್ವಜನಿಕ CDN‌ನಿಂದ ಇಳಿಯುತ್ತವೆ; ಪತ್ರಿಕೆಯ PDF ನಿಮ್ಮ ಸಾಧನದಲ್ಲೇ ಇರುತ್ತದೆ. ಮೊದಲ OCR ಸ್ವಲ್ಪ ಸಮಯ ತೆಗೆದುಕೊಳ್ಳಬಹುದು.",
    importStepFive: "Telegram ಪೋಸ್ಟ್‌ಗಳಿಗಾಗಿ Telegram Desktop‌ನಲ್ಲಿ Settings → Advanced → Export Telegram data ತೆರೆಯಿರಿ, JSON ಅಥವಾ HTML ಆಗಿ ರಫ್ತು ಮಾಡಿ, ನಂತರ ಇಲ್ಲಿ ಆಮದುಮಾಡಿ.",
    importPrivacy: "ಈ ಪುಟವು Downloads ಕಡತಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಹುಡುಕುವುದಿಲ್ಲ. ಆಮದು ಮಾಡಲು ಬಯಸುವ ಕಡತಗಳನ್ನು ಮಾತ್ರ ಆಯ್ಕೆಮಾಡಿ. ಕಡತಗಳು ಬ್ರೌಸರ್‌ನಲ್ಲೇ ಸಂಸ್ಕರಿಸಲ್ಪಡುತ್ತವೆ; ಅಪ್‌ಲೋಡ್ ಆಗುವುದಿಲ್ಲ. ಆನ್‌ಲೈನ್ ಸುದ್ದಿಗೆ ಸಾರ್ವಜನಿಕ Bing News RSS ಮತ್ತು FreeJobAlert RSS ಫೀಡ್‌ಗಳು ಬಳಕೆಯಾಗುತ್ತವೆ. ಆನ್‌ಲೈನ್ ಸುದ್ದಿಗಾಗಿ start-local.ps1 ಚಾಲನೆ ಮಾಡಿ http://127.0.0.1:8765/ ತೆರೆಯಿರಿ. PDF.js, OCR ಮತ್ತು PPTX ಓದುಗ ಸಾರ್ವಜನಿಕ CDN‌ನಿಂದ ಲೋಡ್ ಆಗುತ್ತವೆ.",
    yourImportedNews: "ನೀವು ಆಮದು ಮಾಡಿದ ಸುದ್ದಿಗಳು",
    downloadBrief: "↓ ಸಂಗ್ರಹವನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    itemsSaved: "ಉಳಿಸಿದ ಸುದ್ದಿಗಳು",
    upscMatches: "UPSC ವಿಷಯ ಹೊಂದಾಣಿಕೆಗಳು",
    karnatakaMentions: "ಕರ್ನಾಟಕ ಉಲ್ಲೇಖಗಳು",
    searchNews: "ಆಮದು ಮಾಡಿದ ಸುದ್ದಿಗಳಲ್ಲಿ ಹುಡುಕಿ...",
    filterByExam: "ಪರೀಕ್ಷೆಯ ಪ್ರಕಾರ ವಿಂಗಡಿಸಿ",
    allNews: "ಎಲ್ಲಾ ಸುದ್ದಿಗಳು",
    upsc: "UPSC",
    karnatakaKpsc: "ಕರ್ನಾಟಕ KPSC",
    emptyTitle: "ಪತ್ರಿಕೆ ಅಥವಾ ಪ್ರಸ್ತುತಿಯಿಂದ ನಿಮ್ಮ ದಿನದ ಸಂಗ್ರಹ ಪ್ರಾರಂಭಿಸಿ",
    emptyDescription: "ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಕನ್ನಡ ಪತ್ರಿಕೆಯ PDF, ಅಥವಾ PPTX ಪ್ರಸ್ತುತಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ. ಸ್ಕ್ಯಾನ್ ಪಠ್ಯವನ್ನು ಅಂದಾಜಿನ ಆಧಾರದಲ್ಲಿ ಸುದ್ದಿಗಳಾಗಿ ವಿಂಗಡಿಸಲಾಗುತ್ತದೆ. ವಿಷಯ ಟ್ಯಾಗ್‌ಗಳು ಕೀವರ್ಡ್ ಸಲಹೆಗಳು ಮಾತ್ರ.",
    importDisclaimer: "ಪರೀಕ್ಷೆ/ವಿಷಯ ಗುರುತುಗಳು ಕೀವರ್ಡ್ ಹೊಂದಾಣಿಕೆ ಮತ್ತು ಕರ್ನಾಟಕ ಉಲ್ಲೇಖಗಳ ಆಧಾರಿತ; ಅವು ಅಧಿಕೃತ ಪರೀಕ್ಷಾ ವರ್ಗೀಕರಣವಲ್ಲ. OCR ಸುದ್ದಿಗಳ ವಿಂಗಡಣೆ ಅಂದಾಜಿನದ್ದು; ಮೂಲ ಪತ್ರಿಕೆಯಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.",
    dashboardLabel: "ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳ ಫಲಕ",
    footerPrivacy: "ಬಸವ ಕೇಡಮನೆ ಅಧ್ಯಯನ ಕೇಂದ್ರ · ಕಡತಗಳು ಈ ಸಾಧನದಲ್ಲೇ ಇರುತ್ತವೆ",
    prepareWith: "ಸಿದ್ಧರಾಗಿ",
    purpose: "ಗುರಿಯೊಂದಿಗೆ",
    onlineJobsEmpty: "ಇತ್ತೀಚಿನ ನೇಮಕಾತಿ ಸುದ್ದಿಗಳು ಸಿಗಲಿಲ್ಲ. ಲಭ್ಯ ಪ್ರಕಟಣೆಗಳಿಗಾಗಿ ಮೇಲಿನ ಅಧಿಕೃತ ನೇಮಕಾತಿ ತಾಣಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
    onlineEmpty: "ಈ ವಿಭಾಗಕ್ಕೆ ಸುದ್ದಿ ಸಿಗಲಿಲ್ಲ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮರುಲೋಡ್ ಮಾಡಿ.",
    readingFile: "{file} ಕಡತವನ್ನು ಸ್ಥಳೀಯವಾಗಿ ಓದಲಾಗುತ್ತಿದೆ…",
    scannedPages: "{file} ಕಡೆ ಸ್ಕ್ಯಾನ್ ಅಥವಾ ಫಾಂಟ್-ಎನ್ಕೋಡ್ ಮಾಡಿದ ಪುಟಗಳು ಕಂಡುಬಂದಿವೆ. {language} OCR ಅನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…",
    loadingOcrModel: "{file} ಗಾಗಿ {language} OCR ಮಾದರಿಯನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…",
    ocrProgress: "OCR ಪ್ರಗತಿ: {file}, ಪುಟ {page}/{total} — {status}{progress}",
    renderingPage: "ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ ಪುಟ {page}/{total} ಅನ್ನು ಸ್ಥಳೀಯ OCR ಗಾಗಿ ರೆಂಡರ್ ಮಾಡಲಾಗುತ್ತಿದೆ…",
    processingFile: "{file} ಕಡತವನ್ನು ಓದಲಾಗುತ್ತಿದೆ: {unit} {page}/{total} ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗಿದೆ · ಈಗಾಗಲೇ {count} ವಿಷಯಗಳನ್ನು ಉಳಿಸಲಾಗಿದೆ.",
    importToast: "{summary} {error}",
    savedStoriesCleared: "ಉಳಿಸಿದ ಸುದ್ದಿಗಳು ಅಳಿಸಲಾದವು.",
    clearConfirm: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಉಳಿಸಲಾದ ಎಲ್ಲಾ ಆಮದು ಮಾಡಿದ ಸುದ್ದಿಗಳನ್ನು ಅಳಿಸಬೇಕೇ? ಇದನ್ನು ರದ್ದುಮಾಡಲಾಗುವುದಿಲ್ಲ.",
    clearStorageFull: "ಬ್ರೌಸರ್ ಸಂಗ್ರಹ ತುಂಬಿದೆ. ನಿಮ್ಮ ಸಂಗ್ರಹವನ್ನು ಡೌನ್ಲೋಡ್ ಮಾಡಿ ಮತ್ತು ಕೆಲವು ಉಳಿಸಿದ ಸುದ್ದಿಗಳನ್ನು ಅಳಿಸಿ.",
    saveFailure: "ಆಮದು ಮಾಡಿದ ಸುದ್ದಿಗಳ全部 ಉಳಿಯುವುದಿಲ್ಲ. ನಿಮ್ಮ ಸಂಗ್ರಹವನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ ನಂತರ ನಿರ್ಗಮಿಸಿ.",
    fullExtractedText: "ಪೂರ್ಣವಾಗಿ ಓದಿದ ಪಠ್ಯ ನೋಡಿ",
    kannadaLanguage: "ಕನ್ನಡ",
    upscRelevant: "UPSC ಸಂಬಂಧಿತ",
    kpscKarnatakaLink: "KPSC · ಕರ್ನಾಟಕ ಸಂಬಂಧಿತ",
    kpscGeneral: "KPSC · ಸಾಮಾನ್ಯ",
    noStoriesMatch: "ಈ ಫಿಲ್ಟರ್‌ಗಳಿಗೆ ಸುದ್ದಿ ಹೊಂದಿಕೆಯಾಗಿಲ್ಲ",
    tryDifferentFilters: "ಬೇರೆ ಹುಡುಕಾಟ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಪರೀಕ್ಷಾ ಫಿಲ್ಟರ್ ಬದಲಿಸಿ.",
    emptyBriefTitle: "ಪತ್ರಿಕೆ ಅಥವಾ ಪ್ರಸ್ತುತಿಯಿಂದ ನಿಮ್ಮ ದಿನದ ಸಂಗ್ರಹ ಪ್ರಾರಂಭಿಸಿ",
    chooseNewspaper: "ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಕನ್ನಡ ಪತ್ರಿಕೆಯ PDF, ಅಥವಾ PPTX ಪ್ರಸ್ತುತಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ. ಸ್ಕ್ಯಾನ್ ಪಠ್ಯವನ್ನು ಅಂದಾಜಿನ ಆಧಾರದಲ್ಲಿ ಸುದ್ದಿಗಳಾಗಿ ವಿಂಗಡಿಸಲಾಗುತ್ತದೆ. ವಿಷಯ ಟ್ಯಾಗ್‌ಗಳು ಕೀವರ್ಡ್ ಸಲಹೆಗಳು ಮಾತ್ರ.",
    searchUpdates: "ಸಾರ್ವಜನಿಕ RSS ಫೀಡ್‌ಗಳಲ್ಲಿ ಇತ್ತೀಚಿನ {section} ಸುದ್ದಿಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ…",
    updatedItems: "{date} ರಂದು ನವೀಕರಿಸಲಾಗಿದೆ · {count} ಸುದ್ದಿ · {provider}",
    updatedHeadlines: "{date} ರಂದು ನವೀಕರಿಸಲಾಗಿದೆ · {count} ಶೀರ್ಷಿಕೆ",
    onlineLoadError: "ಆನ್‌ಲೈನ್ ಸುದ್ದಿ ಲೋಡ್ ಆಗಲಿಲ್ಲ: {error} start-local.ps1 ಚಾಲನೆ ಮಾಡಿ ಮರುಲೋಡ್ ಮಾಡಿ.",
    clearConfirm: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಉಳಿಸಿದ ಎಲ್ಲಾ ಸುದ್ದಿಗಳನ್ನು ಅಳಿಸಬೇಕೆ? ಇದನ್ನು ಹಿಂದಕ್ಕೆ ಪಡೆಯಲಾಗುವುದಿಲ್ಲ.",
    cleared: "ಉಳಿಸಿದ ಸುದ್ದಿಗಳನ್ನು ಅಳಿಸಲಾಗಿದೆ.",
    noImportedYet: "ಇನ್ನೂ ಪತ್ರಿಕೆ ಕಡತಗಳನ್ನು ಆಮದು ಮಾಡಿಲ್ಲ.",
    readFile: "{file} ಅನ್ನು ಸಾಧನದಲ್ಲೇ ಓದಲಾಗುತ್ತಿದೆ…",
    scannedPages: "{file} ನಲ್ಲಿ ಸ್ಕ್ಯಾನ್ ಅಥವಾ ಎನ್‌ಕೋಡ್ ಮಾಡಿದ ಪುಟಗಳು ಕಂಡುಬಂದಿವೆ. {language} OCR ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
    loadingOcr: "{file} ಗಾಗಿ {language} OCR ಮಾದರಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
    ocrProgress: "OCR ಪ್ರಗತಿ: {file}, ಪುಟ {page}/{total} — {status}{progress}",
    renderingPage: "ಸ್ಕ್ಯಾನ್ ಪುಟ {page}/{total} ಅನ್ನು ಸ್ಥಳೀಯ OCR ಗಾಗಿ ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ…",
    processingFile: "{file} ಓದುತ್ತಿದೆ: {total}ರಲ್ಲಿ {page} {unit} ಮುಗಿದಿದೆ · ಇದುವರೆಗೆ {count} ಸುದ್ದಿ ಉಳಿಸಲಾಗಿದೆ.",
    importSummary: "{count} ಹೊಸ ಸುದ್ದಿ ಆಮದು ಮಾಡಲಾಗಿದೆ{duplicates}{failures}.",
    duplicateSummary: "; {count} ನಕಲು ಸುದ್ದಿ ಬಿಡಲಾಗಿದೆ",
    failedFiles: "; {count} ಕಡತ ಪರಿಶೀಲನೆ ಅಗತ್ಯ",
    paperPagesLoaded: "{count} ಉಳಿಸಿದ ಪತ್ರಿಕೆ ಪುಟಗಳನ್ನು ಈ ಬ್ರೌಸರ್‌ನಿಂದ ಲೋಡ್ ಮಾಡಲಾಗಿದೆ.",
    clearStorageFull: "ಬ್ರೌಸರ್ ಸಂಗ್ರಹ ತುಂಬಿದೆ. ಸಂಗ್ರಹವನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ, ಕೆಲವು ಉಳಿಸಿದ ಸುದ್ದಿಗಳನ್ನು ಅಳಿಸಿ.",
    saveFailure: "ಎಲ್ಲಾ ಆಮದು ಮಾಡಿದ ಸುದ್ದಿಗಳನ್ನು ಉಳಿಸಲಾಗಲಿಲ್ಲ. ಹೊರಡುವ ಮೊದಲು ಸಂಗ್ರಹವನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ.",
    importToast: "{summary} {error}",
    dateMissing: "ರಫ್ತು ಕಡತದಲ್ಲಿ ದಿನಾಂಕ ಇಲ್ಲ",
    revisionFocus: "ಪುನರವಲೋಕನ: ಸಮಸ್ಯೆ, ಸಂಬಂಧಿತ ಸಂಸ್ಥೆ ಅಥವಾ ನೀತಿ ಮತ್ತು ಕರ್ನಾಟಕದ ಮೇಲಿನ ಪರಿಣಾಮವನ್ನು ಗುರುತಿಸಿ.",
    widerRevisionFocus: "ಪುನರವಲೋಕನ: ಸಮಸ್ಯೆ, ಸಂಬಂಧಿತ ಸಂಸ್ಥೆ ಅಥವಾ ನೀತಿ ಮತ್ತು ಸಾರ್ವಜನಿಕರ ಮೇಲಿನ ಪರಿಣಾಮವನ್ನು ಗುರುತಿಸಿ.",
    briefTitle: "ದೈನಂದಿನ ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳು",
    locallyExtractedNote: "ಸ್ಥಳೀಯವಾಗಿ ಓದಿದ ಪತ್ರಿಕೆ, ಪ್ರಸ್ತುತಿ ಅಥವಾ Telegram ಪಠ್ಯ; ಪರೀಕ್ಷಾ ಟ್ಯಾಗ್‌ಗಳು ಕೀವರ್ಡ್ ಆಧಾರಿತ. ಇವು AI ಸಾರಾಂಶಗಳು ಅಥವಾ ಪರಿಶೀಲಿತ ಸಂಗತಿಗಳಲ್ಲ.",
    sourceLabel: "ಮೂಲ:",
    topicsLabel: "ವಿಷಯಗಳು:",
    examFocusLabel: "ಪರೀಕ್ಷಾ ಗಮನ:",
    upscFocus: "UPSC ಸಂಬಂಧಿತ",
    generalNews: "ಸಾಮಾನ್ಯ ಸುದ್ದಿ",
    karnatakaLink: "ಕರ್ನಾಟಕ KPSC (ಕರ್ನಾಟಕ ಸಂಬಂಧಿತ)",
    kpscGeneralFocus: "ಕರ್ನಾಟಕ KPSC (ಸಾಮಾನ್ಯ)",
    polityTopic: "ರಾಜಕೀಯ ಮತ್ತು ಆಡಳಿತ",
    economyTopic: "ಆರ್ಥಿಕತೆ",
    environmentTopic: "ಪರಿಸರ",
    scienceTopic: "ವಿಜ್ಞಾನ ಮತ್ತು ತಂತ್ರಜ್ಞಾನ",
    internationalRelationsTopic: "ಅಂತರರಾಷ್ಟ್ರೀಯ ಸಂಬಂಧಗಳು",
    societyTopic: "ಸಮಾಜ ಮತ್ತು ಆರೋಗ್ಯ",
    securityTopic: "ಭದ್ರತೆ",
    schemesTopic: "ಯೋಜನೆಗಳು ಮತ್ತು ಸಾರ್ವಜನಿಕ ನೀತಿ",
  },
};
let currentLanguage = localStorage.getItem(languageStorageKey) === "kn" ? "kn" : "en";

const sectionTranslationKey = {
  national: "national",
  international: "international",
  karnataka: "karnatakaCurrentAffairs",
  jobs: "governmentJobs",
};

function t(key, values = {}) {
  const template = translations[currentLanguage][key] || translations.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

function sectionLabel(section) {
  return t(sectionTranslationKey[section] || section);
}

function topicTranslationKey(topic) {
  return ({
    "Polity & governance": "polityTopic",
    Economy: "economyTopic",
    Environment: "environmentTopic",
    "Science & technology": "scienceTopic",
    "International relations": "internationalRelationsTopic",
    "Society & health": "societyTopic",
    Security: "securityTopic",
    "Schemes & public policy": "schemesTopic",
    "General affairs": "generalNews",
  })[topic];
}

function applyLanguage(language) {
  currentLanguage = language === "kn" ? "kn" : "en";
  localStorage.setItem(languageStorageKey, currentLanguage);
  document.documentElement.lang = currentLanguage === "kn" ? "kn" : "en";
  document.querySelector("#language-select").value = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const translated = t(element.dataset.i18n);
    if (element.id === "refresh-online") {
      element.textContent = translated;
    } else {
      element.textContent = translated;
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
  });
  document.querySelector("#language-select").setAttribute("aria-label", t("languageLabel"));
  const onlineStatus = document.querySelector("#online-status");
  if (onlineCache.has(activeOnlineSection)) {
    const cached = onlineCache.get(activeOnlineSection);
    onlineStatus.textContent = t("updatedHeadlines", {
      date: formatOnlineDate(cached.fetchedAt),
      count: cached.items.length,
    });
    renderOnlineItems(cached.items);
  } else {
    onlineStatus.textContent = t("searchUpdates", { section: sectionLabel(activeOnlineSection) });
  }
  if (!onlineRequestInProgress) {
    document.querySelector("#import-status").textContent = stories.length
      ? t("paperPagesLoaded", { count: stories.length })
      : t("noImportedYet");
  }
  render();
}

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
    showToast(t("clearStorageFull"));
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
          importStatus.textContent = t("scannedPages", {
            file: file.name,
            language: ocrLanguage === "kan" ? "Kannada" : "English",
          });
          const tesseract = await loadTesseract();
          let lastLoggerUpdate = 0;
          const logger = (event) => {
            const now = Date.now();
            if (event.status && (now - lastLoggerUpdate > 800 || event.status === "recognizing text")) {
              const progress = Number.isFinite(event.progress) ? ` ${Math.round(event.progress * 100)}%` : "";
              importStatus.textContent = t("ocrProgress", {
                file: file.name,
                page: pageNumber,
                total: pageCount,
                status: event.status,
                progress,
              });
              lastLoggerUpdate = now;
            }
          };
          try {
            importStatus.textContent = t("loadingOcrModel", {
              file: file.name,
              language: ocrLanguage === "kan" ? "Kannada" : "English",
            });
            const worker = await tesseract.createWorker(ocrLanguage, 1, { langPath: ocrModel.langPath, gzip: false, logger });
            ocrWorkers.push({ language: ocrLanguage, worker });
          } catch (error) {
            throw new Error(`${ocrLanguage === "kan" ? "Kannada" : "English"} OCR model could not be loaded: ${error.message}`);
          }
        }

        importStatus.textContent = t("renderingPage", {
          page: pageNumber,
          total: pageCount,
        });
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
  if (!date) return t("dateMissing");
  return new Intl.DateTimeFormat(currentLanguage === "kn" ? "kn-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
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
    summary.textContent = t("fullExtractedText");
    const fullTextBody = document.createElement("p");
    fullTextBody.textContent = displayText;
    fullText.append(summary, fullTextBody);
  }

  const tags = document.createElement("div");
  tags.className = "story-tags";
  story.topics.forEach((topic) => {
    const tag = document.createElement("span");
    tag.className = "topic-tag";
    tag.textContent = topicTranslationKey(topic) ? t(topicTranslationKey(topic)) : topic;
    tags.append(tag);
  });
  if (story.language === "Kannada") {
    const languageTag = document.createElement("span");
    languageTag.className = "language-tag";
    languageTag.textContent = t("kannadaLanguage");
    tags.append(languageTag);
  }
  if (story.upsc) {
    const upsc = document.createElement("span");
    upsc.className = "exam-tag upsc-tag";
    upsc.textContent = t("upscRelevant");
    tags.append(upsc);
  }
  const kpsc = document.createElement("span");
  kpsc.className = story.karnataka ? "exam-tag kpsc-tag" : "exam-tag general-tag";
  kpsc.textContent = story.karnataka ? t("kpscKarnatakaLink") : t("kpscGeneral");
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
    emptyState.querySelector("h3").textContent = t("noStoriesMatch");
    emptyState.querySelector("p").textContent = t("tryDifferentFilters");
  } else {
    emptyState.querySelector("h3").textContent = t("emptyBriefTitle");
    emptyState.querySelector("p").textContent = t("chooseNewspaper");
  }
  document.querySelector("#story-count").textContent = String(stories.length);
  document.querySelector("#upsc-count").textContent = String(stories.filter((story) => story.upsc).length);
  document.querySelector("#kpsc-count").textContent = String(stories.filter((story) => story.karnataka).length);
  document.querySelector("#brief-date").textContent = new Intl.DateTimeFormat(currentLanguage === "kn" ? "kn-IN" : "en-IN", { dateStyle: "full" }).format(new Date());
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
    : new Intl.DateTimeFormat(currentLanguage === "kn" ? "kn-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function renderOnlineItems(items) {
  const list = document.querySelector("#online-list");
  const allItems = Array.isArray(items) ? items.slice(0, maximumFetchedOnlineItems) : [];
  const pageCount = Math.ceil(allItems.length / maximumOnlineItems);
  activeOnlinePage = Math.min(Math.max(activeOnlinePage, 1), Math.max(pageCount, 1));
  const firstItemIndex = (activeOnlinePage - 1) * maximumOnlineItems;
  const safeItems = allItems.slice(firstItemIndex, firstItemIndex + maximumOnlineItems);
  list.replaceChildren();
  renderOnlinePagination(allItems.length);
  if (!safeItems.length) {
    const empty = document.createElement("p");
    empty.className = "online-empty";
    empty.textContent = activeOnlineSection === "jobs" ? t("onlineJobsEmpty") : t("onlineEmpty");
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

function renderOnlinePagination(totalItems) {
  const pagination = document.querySelector("#online-pagination");
  const pageCount = Math.ceil(totalItems / maximumOnlineItems);
  pagination.replaceChildren();
  pagination.hidden = pageCount <= 1;
  if (pagination.hidden) return;

  pagination.setAttribute("aria-label", t("headlinePages"));
  const addButton = (label, page, disabled = false, current = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-button";
    button.textContent = label;
    button.disabled = disabled;
    if (current) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => {
      activeOnlinePage = page;
      renderOnlineItems(onlineCache.get(activeOnlineSection)?.items || []);
      document.querySelector("#online-list").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    pagination.append(button);
  };

  addButton(t("previousPage"), activeOnlinePage - 1, activeOnlinePage === 1);
  for (let page = 1; page <= pageCount; page += 1) {
    addButton(t("pageNumber", { page }), page, false, page === activeOnlinePage);
  }
  addButton(t("nextPage"), activeOnlinePage + 1, activeOnlinePage === pageCount);
  const pageStatus = document.createElement("span");
  pageStatus.className = "page-count";
  pageStatus.textContent = t("pageCount", { page: activeOnlinePage, total: pageCount });
  pagination.append(pageStatus);
}

async function loadOnlineUpdates(section = activeOnlineSection, force = false) {
  if (onlineRequestInProgress) return;
  activeOnlineSection = section;
  activeOnlinePage = 1;
  const status = document.querySelector("#online-status");
  const refreshButton = document.querySelector("#refresh-online");
  const officialLinks = document.querySelector("#official-job-links");
  const tabs = [...document.querySelectorAll("[data-online-section]")];
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.onlineSection === section));
  officialLinks.hidden = section !== "jobs";

  const cached = onlineCache.get(section);
  if (!force && cached && Date.now() - cached.savedAt < 5 * 60 * 1000) {
    renderOnlineItems(cached.items);
    status.textContent = t("updatedHeadlines", {
      date: formatOnlineDate(cached.fetchedAt),
      count: cached.items.length,
    });
    return;
  }

  onlineRequestInProgress = true;
  refreshButton.disabled = true;
  status.textContent = t("searchUpdates", { section: sectionLabel(section) });
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
    const items = Array.isArray(data?.items) ? data.items.slice(0, maximumFetchedOnlineItems) : [];
    onlineCache.set(section, { items, fetchedAt: data.fetchedAt, savedAt: Date.now() });
    renderOnlineItems(items);
    status.textContent = t("updatedItems", {
      date: formatOnlineDate(data.fetchedAt),
      count: items.length,
      provider: data.provider || "public RSS",
    });
  } catch (error) {
    status.textContent = t("onlineLoadError", { error: error.message });
    document.querySelector("#online-list").replaceChildren();
  } finally {
    onlineRequestInProgress = false;
    refreshButton.disabled = false;
  }

}

document.querySelector("#language-select").addEventListener("change", (event) => {
  applyLanguage(event.currentTarget.value);
});

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
      importStatus.textContent = t("readingFile", { file: file.name });
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
        importStatus.textContent = t("processingFile", {
          file: file.name,
          unit,
          page: pageNumber,
          total: pageCount,
          count: stories.length,
        });
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
  showToast(
    errors.length
      ? t("importToast", { summary, error: errors[0] })
      : saved
        ? summary
        : t("saveFailure")
  );
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
  if (!window.confirm(t("clearConfirm"))) return;
  stories = [];
  persistStories();
  render();
  importStatus.textContent = t("savedStoriesCleared");
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

applyLanguage(currentLanguage);
if (stories.length) importStatus.textContent = t("paperPagesLoaded", { count: stories.length });
loadOnlineUpdates("national");
