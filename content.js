// Default configuration
const defaultSources = [
  {
    id: 'annas_search',
    name: "Anna's Archive Search",
    emoji: '📖',
    urlTemplate: 'https://annas-archive.org/search?q=EXAMPLE_DOI',
    enabled: true,
    order: 0
  },
  {
    id: 'annas_scidb',
    name: "Anna's Archive SciDB",
    emoji: '🧬',
    urlTemplate: 'https://annas-archive.org/scidb/EXAMPLE_DOI',
    enabled: true,
    order: 1
  },
  {
    id: 'scihub',
    name: "Sci-Hub",
    emoji: '🐦',
    urlTemplate: 'https://sci-hub.ru/EXAMPLE_DOI',
    enabled: true,
    order: 2
  }
];

// Regular expression to match DOI links
const doiPattern = /^(?:https?:\/\/)?(?:dx\.)?doi\.org\/(.+)/i;

let sources = [];

// Load configuration from storage
async function loadConfig() {
  try {
    const result = await browser.storage.local.get('doiSources');
    if (result.doiSources && result.doiSources.length > 0) {
      sources = result.doiSources;
    } else {
      sources = defaultSources;
      await browser.storage.local.set({ doiSources: defaultSources });
    }
  } catch (error) {
    console.error('Error loading config:', error);
    sources = defaultSources;
  }
}

function addEmojiLinks(link) {
  let href = link.href;

  if (!href.match(/^https?:\/\//i)) {
    href = 'https://' + href;
  }

  const match = href.match(doiPattern);
  if (!match) return;

  const decodedHref = decodeURIComponent(href);
  const doiOnly = decodedHref.replace(/^(?:https?:\/\/)?(?:dx\.)?doi\.org\//, '');

  // Check if we've already added emojis
  if (link.nextSibling && link.nextSibling.className === 'doi-access-links') {
    return;
  }

  // Create container for emoji links
  const container = document.createElement('span');
  container.className = 'doi-access-links';
  container.style.marginLeft = '4px';

  // Sort sources by order and filter enabled ones
  const enabledSources = sources
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  // Create links for each enabled source
  enabledSources.forEach(source => {
    const url = source.urlTemplate.replace('EXAMPLE_DOI', encodeURIComponent(doiOnly));
    
    const emojiLink = document.createElement('a');
    emojiLink.href = url;
    emojiLink.textContent = source.emoji;
    emojiLink.title = source.name;
    emojiLink.target = '_blank';
    emojiLink.style.textDecoration = 'none';
    emojiLink.style.marginRight = '2px';
    
    container.appendChild(emojiLink);
  });

  // Only insert if there are enabled sources
  if (enabledSources.length > 0) {
    link.parentNode.insertBefore(container, link.nextSibling);
  }
}

function processLinks() {
  const links = document.querySelectorAll('a[href*="doi.org"]');
  links.forEach(addEmojiLinks);
}

// Watch for dynamically added content
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === 1) {
        const newLinks = node.querySelectorAll ? node.querySelectorAll('a[href*="doi.org"]') : [];
        newLinks.forEach(addEmojiLinks);
      }
    });
  });
});

// Listen for configuration updates
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.doiSources) {
    sources = changes.doiSources.newValue;
    
    // Remove all existing emoji links
    document.querySelectorAll('.doi-access-links').forEach(el => el.remove());
    
    // Re-process all links with new configuration
    processLinks();
  }
});

// Initialize
loadConfig().then(() => {
  processLinks();
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});