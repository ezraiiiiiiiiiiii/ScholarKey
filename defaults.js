const DEFAULT_SETTINGS = {
  wikipedia: {
    lang: "en",
    showBadge: true
  },
  sources: [
    {
      id: "annas-search",
      emoji: "📖",
      name: "Anna's Archive",
      url: "https://annas-archive.gl/search?q={DOI}",
      enabled: true
    },
    {
      id: "scihub-scidb",
      emoji: "🧬",
      name: "Sci-Hub + SciDB",
      url: JSON.stringify([
        "https://sci-hub.ru/{DOI}",
        "https://annas-archive.gl/scidb/{DOI}"
      ]),
      type: "multi",
      enabled: true
    }
  ],
  behaviour: {
    scanBareText: true
  }
};

if (typeof module !== "undefined" && module.exports) module.exports = { DEFAULT_SETTINGS };
if (typeof self !== "undefined") self.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
