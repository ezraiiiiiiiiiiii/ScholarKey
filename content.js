/**
 * ScholarKey — content.js
 *
 * For every DOI on the page injects:
 *   1. Wikipedia citation count badge (globe icon + count) with hover popup
 *   2. Access-source emoji links (Anna's Archive, Sci-Hub+SciDB, institutions…)
 */

(function () {
  "use strict";

  // ── Inlined defaults ──────────────────────────────────────────────────────────

  const DEFAULT_SETTINGS = {
    wikipedia: { enabled: true, lang: "en" },
    sources: [
      {
        id: "annas-search", emoji: "📖", name: "Anna's Archive",
        url: "https://annas-archive.gl/search?q={DOI}", enabled: true
      },
      {
        id: "scihub-scidb", emoji: "🧬", name: "Sci-Hub + SciDB",
        url: JSON.stringify(["https://sci-hub.ru/{DOI}", "https://annas-archive.gl/scidb/{DOI}"]),
        type: "multi", enabled: true
      }
    ],
    behaviour: { scanBareText: true }
  };

  let settings = DEFAULT_SETTINGS;

  // ── Wikipedia globe icon (inlined base64 PNG) ─────────────────────────────────

  const WIKI_ICON = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBzdHlsZT0ic2hhcGUtcmVuZGVyaW5nOmdlb21ldHJpY1ByZWNpc2lvbjsgZmlsbC1ydWxlOmV2ZW5vZGQiPg0KPHBhdGggZD0iTSAxMjAuODUsMjkuMjEgQyAxMjAuODUsMjkuNjIgMTIwLjcyLDI5Ljk5IDEyMC40NywzMC4zMyBDIDEyMC4yMSwzMC42NiAxMTkuOTQsMzAuODMgMTE5LjYzLDMwLjgzIEMgMTE3LjE0LDMxLjA3IDExNS4wOSwzMS44NyAxMTMuNTEsMzMuMjQgQyAxMTEuOTIsMzQuNiAxMTAuMjksMzcuMjEgMTA4LjYsNDEuMDUgTCA4Mi44LDk5LjE5IEMgODIuNjMsOTkuNzMgODIuMTYsMTAwIDgxLjM4LDEwMCBDIDgwLjc3LDEwMCA4MC4zLDk5LjczIDc5Ljk2LDk5LjE5IEwgNjUuNDksNjguOTMgTCA0OC44NSw5OS4xOSBDIDQ4LjUxLDk5LjczIDQ4LjA0LDEwMCA0Ny40MywxMDAgQyA0Ni42OSwxMDAgNDYuMiw5OS43MyA0NS45Niw5OS4xOSBMIDIwLjYxLDQxLjA1IEMgMTkuMDMsMzcuNDQgMTcuMzYsMzQuOTIgMTUuNiwzMy40OSBDIDEzLjg1LDMyLjA2IDExLjQsMzEuMTcgOC4yNywzMC44MyBDIDgsMzAuODMgNy43NCwzMC42OSA3LjUxLDMwLjQgQyA3LjI3LDMwLjEyIDcuMTUsMjkuNzkgNy4xNSwyOS40MiBDIDcuMTUsMjguNDcgNy40MiwyOCA3Ljk2LDI4IEMgMTAuMjIsMjggMTIuNTgsMjguMSAxNS4wNSwyOC4zIEMgMTcuMzQsMjguNTEgMTkuNSwyOC42MSAyMS41MiwyOC42MSBDIDIzLjU4LDI4LjYxIDI2LjAxLDI4LjUxIDI4LjgxLDI4LjMgQyAzMS43NCwyOC4xIDM0LjM0LDI4IDM2LjYsMjggQyAzNy4xNCwyOCAzNy40MSwyOC40NyAzNy40MSwyOS40MiBDIDM3LjQxLDMwLjM2IDM3LjI0LDMwLjgzIDM2LjkxLDMwLjgzIEMgMzQuNjUsMzEgMzIuODcsMzEuNTggMzEuNTcsMzIuNTUgQyAzMC4yNywzMy41MyAyOS42MiwzNC44MSAyOS42MiwzNi40IEMgMjkuNjIsMzcuMjEgMjkuODksMzguMjIgMzAuNDMsMzkuNDMgTCA1MS4zOCw4Ni43NCBMIDYzLjI3LDY0LjI4IEwgNTIuMTksNDEuMDUgQyA1MC4yLDM2LjkxIDQ4LjU2LDM0LjIzIDQ3LjI4LDMzLjAzIEMgNDYsMzEuODQgNDQuMDYsMzEuMSA0MS40NiwzMC44MyBDIDQxLjIyLDMwLjgzIDQxLDMwLjY5IDQwLjc4LDMwLjQgQyA0MC41NiwzMC4xMiA0MC40NSwyOS43OSA0MC40NSwyOS40MiBDIDQwLjQ1LDI4LjQ3IDQwLjY4LDI4IDQxLjE2LDI4IEMgNDMuNDIsMjggNDUuNDksMjguMSA0Ny4zOCwyOC4zIEMgNDkuMiwyOC41MSA1MS4xNCwyOC42MSA1My4yLDI4LjYxIEMgNTUuMjIsMjguNjEgNTcuMzYsMjguNTEgNTkuNjIsMjguMyBDIDYxLjk1LDI4LjEgNjQuMjQsMjggNjYuNSwyOCBDIDY3LjA0LDI4IDY3LjMxLDI4LjQ3IDY3LjMxLDI5LjQyIEMgNjcuMzEsMzAuMzYgNjcuMTUsMzAuODMgNjYuODEsMzAuODMgQyA2Mi4yOSwzMS4xNCA2MC4wMywzMi40MiA2MC4wMywzNC42OCBDIDYwLjAzLDM1LjY5IDYwLjU1LDM3LjI2IDYxLjYsMzkuMzggTCA2OC45Myw1NC4yNiBMIDc2LjIyLDQwLjY1IEMgNzcuMjMsMzguNzMgNzcuNzQsMzcuMTEgNzcuNzQsMzUuNzkgQyA3Ny43NCwzMi42OSA3NS40OCwzMS4wNCA3MC45NiwzMC44MyBDIDcwLjU1LDMwLjgzIDcwLjM1LDMwLjM2IDcwLjM1LDI5LjQyIEMgNzAuMzUsMjkuMDggNzAuNDUsMjguNzYgNzAuNjUsMjguNDYgQyA3MC44NiwyOC4xNSA3MS4wNiwyOCA3MS4yNiwyOCBDIDcyLjg4LDI4IDc0Ljg3LDI4LjEgNzcuMjMsMjguMyBDIDc5LjQ5LDI4LjUxIDgxLjM1LDI4LjYxIDgyLjgsMjguNjEgQyA4My44NCwyOC42MSA4NS4zOCwyOC41MiA4Ny40LDI4LjM1IEMgODkuOTYsMjguMTIgOTIuMTEsMjggOTMuODMsMjggQyA5NC4yMywyOCA5NC40MywyOC40IDk0LjQzLDI5LjIxIEMgOTQuNDMsMzAuMjkgOTQuMDYsMzAuODMgOTMuMzIsMzAuODMgQyA5MC42OSwzMS4xIDg4LjU3LDMxLjgzIDg2Ljk3LDMzLjAxIEMgODUuMzcsMzQuMTkgODMuMzcsMzYuODcgODAuOTgsNDEuMDUgTCA3MS4yNiw1OS4wMiBMIDg0LjQyLDg1LjgzIEwgMTAzLjg1LDQwLjY1IEMgMTA0LjUyLDM5IDEwNC44NiwzNy40OCAxMDQuODYsMzYuMSBDIDEwNC44NiwzMi43OSAxMDIuNiwzMS4wNCA5OC4wOCwzMC44MyBDIDk3LjY3LDMwLjgzIDk3LjQ3LDMwLjM2IDk3LjQ3LDI5LjQyIEMgOTcuNDcsMjguNDcgOTcuNzcsMjggOTguMzgsMjggQyAxMDAuMDMsMjggMTAxLjk5LDI4LjEgMTA0LjI1LDI4LjMgQyAxMDYuMzQsMjguNTEgMTA4LjEsMjguNjEgMTA5LjUxLDI4LjYxIEMgMTExLDI4LjYxIDExMi43MiwyOC41MSAxMTQuNjcsMjguMyBDIDExNi43LDI4LjEgMTE4LjUyLDI4IDEyMC4xNCwyOCBDIDEyMC42MSwyOCAxMjAuODUsMjguNCAxMjAuODUsMjkuMjEgeiIvPg0KPC9zdmc+";

  // ── Regex ─────────────────────────────────────────────────────────────────────

  const DOI_HREF_RE = /^https?:\/\/(?:dx\.)?doi\.org\/(.+)/i;
  // Matches a DOI only when it appears after an explicit /doi/ path segment.
  // This is strict by design — broad path matching causes false positives on
  // publisher cart/session URLs that contain "10." in prices or tokens.
  // De Gruyter: /document/doi/10.1515/foo  Brill: /content/journals/10.1163/foo
  const DOI_AFTER_SEGMENT_RE = /\/doi\/(10\.\d{4,}\/[^\s<>"'?#&]+)/i;
  const DOI_TEXT_TEST = /\b10\.\d{4,}\/[^\s<>"']+/;
  const doiTextRe     = () => /\b(10\.\d{4,}\/[^\s<>"']+)/g;

  // ── State ─────────────────────────────────────────────────────────────────────

  const wikiCache     = new Map();
  let   processed     = new WeakSet();
  const decoratedDois = new Set();
  let   activePopup   = null;
  let   hideTimer     = null;

  const ON_WIKIPEDIA = /\.wikipedia\.org$/.test(location.hostname);

  // ── Wikipedia API concurrency limiter ─────────────────────────────────────────

  const WIKI_CONCURRENCY = 5;
  let wikiInFlight = 0;
  const wikiQueue  = [];

  function wikiEnqueue(fn) {
    return new Promise(function(resolve, reject) {
      wikiQueue.push(function() { return fn().then(resolve, reject); });
      wikiDrain();
    });
  }
  function wikiDrain() {
    while (wikiInFlight < WIKI_CONCURRENCY && wikiQueue.length) {
      wikiInFlight++;
      wikiQueue.shift()().finally(function() { wikiInFlight--; wikiDrain(); });
    }
  }

  // ── URL builders ──────────────────────────────────────────────────────────────

  const wikiLang  = () => settings.wikipedia.lang || "en";
  const showBadge = () => settings.wikipedia.showBadge !== false;

  function doiQueryString(doi) {
    return 'insource:"' + doi.replace(/#/g, "%23").replace(/&/g, "%26") + '"';
  }
  function wikiSearchUrl(doi) {
    return "https://" + wikiLang() + ".wikipedia.org/w/index.php" +
      "?search=" + doiQueryString(doi) +
      "&title=Special%3ASearch&profile=advanced&fulltext=1&ns0=1";
  }
  function wikiSearchApiUrl(doi) {
    return "https://" + wikiLang() + ".wikipedia.org/w/api.php" +
      "?action=query&list=search&srnamespace=0&srlimit=5&utf8=&format=json&origin=*" +
      "&srsearch=" + doiQueryString(doi);
  }
  function wikiPageDetailsUrl(pageids) {
    return "https://" + wikiLang() + ".wikipedia.org/w/api.php" +
      "?action=query&pageids=" + pageids.join("|") +
      "&prop=extracts|pageimages&exintro=1&explaintext=1&exchars=280" +
      "&piprop=thumbnail&pithumbsize=80&format=json&origin=*";
  }
  function applyTemplate(tpl, doi) {
    var doiUrl = "https://doi.org/" + encodeURIComponent(doi);
    return tpl
      .replace(/\{DOI_URL\}/g, doiUrl)
      .replace(/\{DOI\}/g, doi)
      .replace(/EXAMPLE_DOI/g, doi);
  }

  const normaliseDoi = (raw) => raw.replace(/[.,;)\]}"']+$/, "");

  // ── Wikipedia API ─────────────────────────────────────────────────────────────

  async function fetchWikiCitations(doi) {
    if (ON_WIKIPEDIA) return null;
    const key = wikiLang() + "::" + doi;
    if (wikiCache.has(key)) return wikiCache.get(key);
    return wikiEnqueue(async function() {
      if (wikiCache.has(key)) return wikiCache.get(key);
      try {
        const res  = await fetch(wikiSearchApiUrl(doi));
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        const hits  = json?.query?.search ?? [];
        const count = json?.query?.searchinfo?.totalhits ?? 0;
        let pageDetails = {};
        if (hits.length > 0) {
          try {
            const r2 = await fetch(wikiPageDetailsUrl(hits.map(h => h.pageid)));
            const j2 = await r2.json();
            pageDetails = j2?.query?.pages ?? {};
          } catch (_) {}
        }
        const result = { count, hits, pageDetails };
        wikiCache.set(key, result);
        return result;
      } catch (e) {
        console.warn("[ScholarKey]", doi, e);
        return null;
      }
    });
  }

  // ── Badge row ─────────────────────────────────────────────────────────────────

  function buildRow(doi) {
    const row = document.createElement("span");
    row.className   = "sk-row";
    row.dataset.doi = doi;

    // Wikipedia badge — conditional on settings
    if (showBadge()) {
    const wiki = document.createElement("a");
    wiki.className = "sk-wiki";
    wiki.href      = wikiSearchUrl(doi);
    wiki.target    = "_blank";
    wiki.rel       = "noopener noreferrer";
    wiki.innerHTML =
      '<img class="sk-wiki__icon" src="' + WIKI_ICON + '" alt="" width="12" height="12">' +
      '<span class="sk-wiki__count">\u2026</span>';

    if (ON_WIKIPEDIA) {
      wiki.setAttribute("aria-label", "Search Wikipedia for articles citing this DOI");
      wiki.querySelector(".sk-wiki__count").textContent = "?";
    } else {
      wiki.classList.add("sk-wiki--loading");
      wiki.setAttribute("aria-label", "Loading Wikipedia citations\u2026");
      fetchWikiCitations(doi).then(function(data) {
        if (data) {
          renderWikiBadge(wiki, doi, data);
        } else {
          wiki.classList.remove("sk-wiki--loading");
          wiki.setAttribute("aria-label", "Search Wikipedia for articles citing this DOI");
          wiki.querySelector(".sk-wiki__count").textContent = "?";
        }
      });
    }
    row.appendChild(wiki);
    } // end showBadge

    // Access source links
    settings.sources.forEach(function(src) {
      if (!src.enabled) return;
      row.appendChild(makeSourceBtn(src, doi));
    });

    return row;
  }

  function eduDomainFromUrl(url) {
    var m = url && url.match(/([a-z0-9-]+\.edu)/i);
    return m ? m[1].toLowerCase() : null;
  }

  function makeSourceBtn(src, doi) {
    var btn = document.createElement("a");
    btn.className   = "sk-src";
    btn.title       = src.name;
    btn.setAttribute("aria-label", "Open " + doi + " on " + src.name);

    // For .edu proxy sources use the institution favicon; otherwise use emoji
    var firstUrl = src.type === "multi"
      ? (function() { try { return JSON.parse(src.url)[0]; } catch(_) { return src.url; } })()
      : src.url;
    var edu = eduDomainFromUrl(firstUrl);
    if (edu) {
      var img = document.createElement("img");
      img.src    = "https://www.google.com/s2/favicons?domain=" + edu + "&sz=32";
      img.alt    = "";
      img.width  = 14;
      img.height = 14;
      img.className = "sk-src__favicon";
      btn.appendChild(img);
    } else {
      btn.textContent = src.emoji || "\uD83D\uDD17";
    }
    btn.target      = "_blank";
    btn.rel         = "noopener noreferrer";
    if (src.type === "multi") {
      var urls;
      try { urls = JSON.parse(src.url); } catch(_) { urls = [src.url]; }
      var resolved = urls.map(function(u) { return applyTemplate(u, doi); });
      btn.href = resolved[0];
      btn.addEventListener("click", (function(rest) {
        return function() {
          rest.forEach(function(u) { window.open(u, "_blank", "noopener,noreferrer"); });
        };
      })(resolved.slice(1)));
    } else {
      btn.href = applyTemplate(src.url, doi);
    }
    return btn;
  }

  function renderWikiBadge(badge, doi, data) {
    badge.classList.remove("sk-wiki--loading");
    badge.setAttribute("aria-label",
      data.count + " Wikipedia article" + (data.count !== 1 ? "s" : "") + " cite this DOI");
    if (data.count === 0) badge.classList.add("sk-wiki--zero");
    badge.querySelector(".sk-wiki__count").textContent =
      data.count > 999 ? "999+" : String(data.count);
    badge.addEventListener("mouseenter", function() {
      clearTimeout(hideTimer);
      showWikiPopup(badge, doi, data);
    });
    badge.addEventListener("mouseleave", function() {
      hideTimer = setTimeout(closePopup, 200);
    });
  }

  // ── Popup ─────────────────────────────────────────────────────────────────────

  function closePopup() {
    if (activePopup) { activePopup.remove(); activePopup = null; }
  }

  function showWikiPopup(anchor, doi, data) {
    closePopup();
    const popup = document.createElement("div");
    popup.className = "sk-popup";

    const header  = document.createElement("div");
    header.className = "sk-popup__header";
    const titleEl = document.createElement("span");
    titleEl.className   = "sk-popup__title";
    titleEl.textContent = wikiLang().toUpperCase() + " Wikipedia citations";
    const totalEl = document.createElement("span");
    totalEl.className   = "sk-popup__total";
    totalEl.textContent = data.count === 0
      ? "None found"
      : data.count + " article" + (data.count !== 1 ? "s" : "");
    header.append(titleEl, totalEl);
    popup.appendChild(header);

    const doiLine = document.createElement("div");
    doiLine.className   = "sk-popup__doi";
    doiLine.textContent = doi;
    popup.appendChild(doiLine);

    if (data.hits.length > 0) {
      const list = document.createElement("ul");
      list.className = "sk-popup__list";

      data.hits.forEach(function(hit) {
        var pageData = data.pageDetails[String(hit.pageid)] || {};
        var thumb    = pageData.thumbnail;
        var extract  = (pageData.extract || "").trim();

        const li = document.createElement("li");
        li.className = "sk-popup__item";

        if (thumb && thumb.source) {
          const img = document.createElement("img");
          img.className = "sk-popup__thumb";
          img.src = thumb.source;
          img.width = thumb.width || 56;
          img.height = thumb.height || 56;
          img.alt = "";
          img.loading = "lazy";
          li.appendChild(img);
        }

        const text = document.createElement("div");
        text.className = "sk-popup__text";

        const a = document.createElement("a");
        a.href    = "https://" + wikiLang() + ".wikipedia.org/wiki/" +
          encodeURIComponent(hit.title.replace(/ /g, "_"));
        a.target  = "_blank";
        a.rel     = "noopener noreferrer";
        a.className   = "sk-popup__article-title";
        a.textContent = hit.title;
        text.appendChild(a);

        if (extract) {
          var trimmed = extract.length > 220
            ? extract.slice(0, 220).replace(/\s\S+$/, "") + "\u2026"
            : extract;
          const snip = document.createElement("p");
          snip.className   = "sk-popup__snippet";
          snip.textContent = trimmed;
          text.appendChild(snip);
        }

        li.appendChild(text);
        list.appendChild(li);
      });

      popup.appendChild(list);

      if (data.count > data.hits.length) {
        const more = document.createElement("a");
        more.className   = "sk-popup__more";
        more.href        = wikiSearchUrl(doi);
        more.target      = "_blank";
        more.rel         = "noopener noreferrer";
        more.textContent = "View all " + data.count + " on Wikipedia \u2192";
        popup.appendChild(more);
      }
    } else {
      const empty = document.createElement("p");
      empty.className   = "sk-popup__empty";
      empty.textContent = "No Wikipedia articles cite this DOI.";
      popup.appendChild(empty);
    }

    popup.addEventListener("mouseenter", function() { clearTimeout(hideTimer); });
    popup.addEventListener("mouseleave", function() { hideTimer = setTimeout(closePopup, 200); });
    document.body.appendChild(popup);
    activePopup = popup;

    const rect = anchor.getBoundingClientRect();
    const popW = 340;
    const popH = popup.offsetHeight || 260;
    var left = rect.left + window.scrollX;
    var top  = rect.bottom + window.scrollY + 6;
    if (rect.bottom + 6 + popH > window.innerHeight) top = rect.top + window.scrollY - popH - 6;
    if (left + popW > window.innerWidth + window.scrollX) left = window.innerWidth + window.scrollX - popW - 8;
    if (left < window.scrollX + 4) left = window.scrollX + 4;
    popup.style.cssText = "left:" + left + "px;top:" + top + "px;width:" + popW + "px";
  }

  // ── Injection ─────────────────────────────────────────────────────────────────

  function injectRow(doi, refNode) {
    if (processed.has(refNode)) return;
    const canonical = normaliseDoi(doi);
    if (decoratedDois.has(canonical)) return;
    processed.add(refNode);
    decoratedDois.add(canonical);
    const row = buildRow(canonical);
    if (refNode.parentNode) {
      observer.disconnect();
      refNode.parentNode.insertBefore(row, refNode.nextSibling);
      rowAnchorMap.set(row, refNode);
      observer.observe(document.body, OBSERVER_OPTS);
    }
  }

  // ── Scanning ──────────────────────────────────────────────────────────────────

  function extractDoiFromAnchor(a) {
    const href = a.getAttribute("href") || "";
    // 1. Standard doi.org or dx.doi.org link
    const m1 = href.match(DOI_HREF_RE);
    if (m1) {
      try { return decodeURIComponent(m1[1]); } catch(_) { return m1[1]; }
    }
    // 2. data-doi / data-doi-id attributes (Brill, JMIR, some Springer pages)
    const dataDoi = a.getAttribute("data-doi") || a.getAttribute("data-doi-id") ||
                    a.getAttribute("data-article-doi");
    if (dataDoi && /^10\.\d{4,}\//.test(dataDoi.trim())) return dataDoi.trim();
    // 3. DOI after an explicit /doi/ path segment (De Gruyter, Brill).
    //    Deliberately narrow — only fires when the URL contains /doi/10.x,
    //    which avoids false positives on cart/session/price strings.
    const m3 = href.match(DOI_AFTER_SEGMENT_RE);
    if (m3) {
      try { return decodeURIComponent(m3[1]); } catch(_) { return m3[1]; }
    }
    return null;
  }

  function scanAnchors(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("a[href], a[data-doi], a[data-doi-id], a[data-article-doi]").forEach(function(a) {
      if (processed.has(a) && a.isConnected) return;
      // Never scan links that live inside our own injected rows or popups
      if (a.closest && a.closest(".sk-row, .sk-popup")) return;
      const doi = extractDoiFromAnchor(a);
      if (doi) injectRow(doi, a);
    });
  }

  function scanTextNodesOnce(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        const tag = node.parentElement && node.parentElement.tagName
          ? node.parentElement.tagName.toUpperCase() : "";
        if (["SCRIPT","STYLE","NOSCRIPT","TEXTAREA","INPUT"].indexOf(tag) !== -1)
          return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest &&
            node.parentElement.closest(".sk-row,.sk-popup,.sk-src,.sk-wiki"))
          return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest &&
            node.parentElement.closest("a[href*='doi.org']"))
          return NodeFilter.FILTER_REJECT;
        return DOI_TEXT_TEST.test(node.nodeValue)
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });

    const nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);

    observer.disconnect();
    const pending = [];

    nodes.forEach(function(textNode) {
      if (processed.has(textNode) || !textNode.parentNode) return;
      processed.add(textNode);

      const val  = textNode.nodeValue;
      const re   = doiTextRe();
      const frag = document.createDocumentFragment();
      var match, lastIndex = 0;

      while ((match = re.exec(val)) !== null) {
        if (match.index > lastIndex)
          frag.appendChild(document.createTextNode(val.slice(lastIndex, match.index)));
        const span = document.createElement("span");
        span.className   = "sk-inline";
        span.textContent = match[0];
        frag.appendChild(span);
        pending.push([span, normaliseDoi(match[1])]);
        lastIndex = re.lastIndex;
      }

      if (lastIndex > 0) {
        if (lastIndex < val.length)
          frag.appendChild(document.createTextNode(val.slice(lastIndex)));
        textNode.parentNode.replaceChild(frag, textNode);
      }
    });

    observer.observe(document.body, OBSERVER_OPTS);

    pending.forEach(function(pair) {
      requestAnimationFrame(function() { injectRow(pair[1], pair[0]); });
    });
  }

  // ── MutationObserver — debounced, anchors only ────────────────────────────────

  const OBSERVER_OPTS = { childList: true, subtree: true };
  var mutationTimer   = null;
  const pendingRoots  = new Set();

  // Track which anchor element each injected row is tethered to,
  // so we can detect when a site has replaced/moved the anchor (Cambridge et al.)
  // and re-inject rather than leaving an orphaned or missing badge.
  const rowAnchorMap = new Map(); // row element → original anchor element

  const observer = new MutationObserver(function(mutations) {
    var hasRealMutation = false;
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Ignore nodes we injected ourselves
          if (node.classList && (
              node.classList.contains("sk-row") ||
              node.classList.contains("sk-popup")
          )) return;
          pendingRoots.add(node);
          hasRealMutation = true;
        }
      });
      // Detect removed nodes — if a site removes an anchor we decorated,
      // clear its DOI from decoratedDois so it gets re-injected when the
      // site re-adds equivalent content (Cambridge SPA navigation, etc.)
      m.removedNodes.forEach(function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.classList && node.classList.contains("sk-row")) return;
          // Check if any of our tracked anchors lived inside this removed subtree
          rowAnchorMap.forEach(function(anchor, row) {
            if (node === anchor || (node.contains && node.contains(anchor))) {
              var doi = row.dataset && row.dataset.doi;
              if (doi) decoratedDois.delete(doi);
              processed = new WeakSet(); // anchor refs are now stale
              rowAnchorMap.delete(row);
            }
          });
        }
      });
    });
    if (!hasRealMutation) return;
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(function() {
      const roots = Array.from(pendingRoots);
      pendingRoots.clear();
      roots.forEach(function(root) { scanAnchors(root); });
    }, 300);
  });

  // ── Re-render on settings change ──────────────────────────────────────────────

  function rerender() {
    document.querySelectorAll(".sk-row").forEach(function(el) { el.remove(); });
    decoratedDois.clear();
    processed = new WeakSet();
    closePopup();
    document.querySelectorAll("span.sk-inline").forEach(function(span) {
      const m = doiTextRe().exec(span.textContent);
      if (m) {
        const fresh = span.cloneNode(true);
        span.replaceWith(fresh);
        injectRow(normaliseDoi(m[1]), fresh);
      }
    });
    scanAnchors(document.body);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────

  function loadSettings(cb) {
    const store = (typeof browser !== "undefined" ? browser : chrome)?.storage?.local;
    if (!store) return cb(DEFAULT_SETTINGS);
    store.get(["scholarkey_settings"])
      .then(function(res) {
        const s = res && res.scholarkey_settings;
        cb(s ? Object.assign({}, DEFAULT_SETTINGS, s) : DEFAULT_SETTINGS);
      })
      .catch(function() { cb(DEFAULT_SETTINGS); });
  }

  function init() {
    loadSettings(function(s) {
      settings = s;
      scanAnchors(document.body);
      if (settings.behaviour && settings.behaviour.scanBareText) scanTextNodesOnce(document.body);
      observer.observe(document.body, OBSERVER_OPTS);
      // Progressive retries: catches sites that hydrate content late (JMIR ~3s, De Gruyter ~2s)
      [800, 2000, 4000].forEach(function(delay) {
        setTimeout(function() {
          scanAnchors(document.body);
          if (settings.behaviour && settings.behaviour.scanBareText) scanTextNodesOnce(document.body);
        }, delay);
      });
    });

    const storage = (typeof browser !== "undefined" ? browser : chrome)?.storage;
    if (storage && storage.onChanged) {
      storage.onChanged.addListener(function(changes, area) {
        if (area !== "local" || !changes.scholarkey_settings) return;
        settings = Object.assign({}, DEFAULT_SETTINGS, changes.scholarkey_settings.newValue);
        rerender();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
