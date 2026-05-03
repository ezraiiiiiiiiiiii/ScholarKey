/**
 * popup.js — settings UI logic
 */
(function () {
  "use strict";

  const KEY = "scholarkey_settings";
  const api = (typeof browser !== "undefined" ? browser : chrome).storage.local;

  const els = {
    wikiLang:       document.getElementById("wiki-lang"),
    showBadge:      document.getElementById("show-badge"),
    scanBare:       document.getElementById("scan-bare"),
    sources:        document.getElementById("sources"),
    addSource:      document.getElementById("add-source"),
    addInstitution: document.getElementById("add-institution"),
    refreshUrls:    document.getElementById("refresh-urls"),
    refreshStatus:  document.getElementById("refresh-status"),
    reset:          document.getElementById("reset"),
    status:         document.getElementById("status"),
  };

  let state = structuredClone(self.DEFAULT_SETTINGS);
  let saveTimer = null;

  function load() {
    return api.get([KEY]).then((res) => {
      const stored = res?.[KEY];
      if (stored) {
        state = {
          ...self.DEFAULT_SETTINGS,
          ...stored,
          wikipedia: { ...self.DEFAULT_SETTINGS.wikipedia, ...(stored.wikipedia || {}) },
          behaviour: { ...self.DEFAULT_SETTINGS.behaviour, ...(stored.behaviour || {}) },
          sources: Array.isArray(stored.sources) && stored.sources.length
            ? stored.sources : self.DEFAULT_SETTINGS.sources
        };
      }
    });
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      api.set({ [KEY]: state }).then(() => flash("Saved", els.status));
    }, 150);
  }

  function flash(msg, el) {
    el.textContent = msg;
    el.classList.add("status--show");
    setTimeout(() => el.classList.remove("status--show"), 2000);
  }

  // ── URL refresh from Wikipedia wikitext ───────────────────────────────────────

  async function fetchFirstUrlFromWikitext(title) {
    const apiUrl = "https://en.wikipedia.org/w/api.php" +
      "?action=query&titles=" + encodeURIComponent(title) +
      "&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*";
    const res      = await fetch(apiUrl);
    const json     = await res.json();
    const pages    = json?.query?.pages ?? {};
    const wikitext = Object.values(pages)[0]?.revisions?.[0]?.slots?.main?.["*"] ?? "";
    const urlBlock = wikitext.match(/\|\s*url\s*=\s*([\s\S]*?)(?=\n\s*\||}})/i);
    if (!urlBlock) return null;
    const urlMatch = urlBlock[1].match(/https?:\/\/[^\s\]\[}{|<>"]+/);
    return urlMatch ? urlMatch[0].replace(/\/$/, "") : null;
  }

  async function refreshUrls() {
    els.refreshUrls.disabled = true;
    els.refreshStatus.textContent = "Fetching…";
    els.refreshStatus.classList.add("status--show");
    try {
      const [annasUrl, scihubUrl] = await Promise.all([
        fetchFirstUrlFromWikitext("Anna's Archive"),
        fetchFirstUrlFromWikitext("Sci-Hub")
      ]);
      for (let i = 0; i < state.sources.length; i++) {
        const src = state.sources[i];
        if (src.id === "annas-search" && annasUrl)
          state.sources[i].url = annasUrl + "/search?q={DOI}";
        if (src.id === "scihub-scidb") {
          state.sources[i].url  = JSON.stringify([
            (scihubUrl  || "https://sci-hub.ru")        + "/{DOI}",
            (annasUrl   || "https://annas-archive.gl")  + "/scidb/{DOI}"
          ]);
          state.sources[i].type = "multi";
        }
      }
      save();
      renderSources();
      const parts = [];
      if (annasUrl)  parts.push("Anna's → " + annasUrl);
      if (scihubUrl) parts.push("Sci-Hub → " + scihubUrl);
      els.refreshStatus.textContent = parts.length ? "Updated: " + parts.join(", ") : "No URLs found";
      els.refreshStatus.classList.add("status--show");
    } catch (e) {
      els.refreshStatus.textContent = "Error: " + e.message;
      els.refreshStatus.classList.add("status--show");
    } finally {
      els.refreshUrls.disabled = false;
      setTimeout(() => els.refreshStatus.classList.remove("status--show"), 5000);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  function eduDomain(url) {
    // Extract the x.edu domain from a proxy URL, e.g.
    // "https://libproxy.mit.edu/..." → "mit.edu"
    const m = url.match(/([a-z0-9-]+\.edu)/i);
    return m ? m[1].toLowerCase() : null;
  }

  function faviconUrl(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  }

  function render() {
    els.wikiLang.value    = state.wikipedia.lang;
    els.showBadge.checked = state.wikipedia.showBadge !== false;
    els.scanBare.checked = state.behaviour.scanBareText;
    renderSources();
  }

  function renderSources() {
    els.sources.innerHTML = "";
    state.sources.forEach((src, idx) => {
      const isMulti = src.type === "multi";
      let displayUrl = src.url;
      if (isMulti) {
        try { displayUrl = JSON.parse(src.url).join("\n"); } catch (_) {}
      }

      const li = document.createElement("li");
      li.className = "src" + (src.enabled ? "" : " src--off");
      li.draggable = false;

      li.innerHTML = `
        <span class="src__handle" title="Drag to reorder">⋮⋮</span>
        <input type="checkbox" class="src__on" ${src.enabled ? "checked" : ""}
               aria-label="Enable ${escapeHtml(src.name)}">
        ${(function() {
          const edu = eduDomain(isMulti ? (JSON.parse(src.url || "[]")[0] || "") : src.url);
          if (edu) {
            return `<img class="src__favicon" src="${faviconUrl(edu)}" alt="" title="${edu}" width="16" height="16">`;
          }
          return `<input type="text" class="src__emoji" value="${escapeHtml(src.emoji)}" maxlength="4" aria-label="Emoji">`;
        })()}
        <input type="text" class="src__name"  value="${escapeHtml(src.name)}"  aria-label="Name">
        <div class="src__url-cell">
          <${isMulti ? "textarea" : `input type="text"`} class="src__url" aria-label="URL template"
            placeholder="${isMulti ? "One URL per line. Use {DOI} or {DOI_URL}" : "Use {DOI} or {DOI_URL}"}"
            spellcheck="false"${isMulti ? "" : ` value="${escapeHtml(displayUrl)}"`}
          >${isMulti ? escapeHtml(displayUrl) : ""}</${isMulti ? "textarea" : "input"}>
          ${isMulti ? `<span class="src__multi-badge">multi</span>` : ""}
        </div>
        <button type="button" class="src__del" title="Delete">✕</button>
      `;

      const handle = li.querySelector(".src__handle");
      handle.addEventListener("pointerdown", () => { li.draggable = true; });
      li.addEventListener("dragend",  () => { li.draggable = false; li.classList.remove("src--dragging"); });
      li.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", String(idx)); li.classList.add("src--dragging"); });
      li.addEventListener("dragover",  (e) => { e.preventDefault(); li.classList.add("src--over"); });
      li.addEventListener("dragleave", ()  => li.classList.remove("src--over"));
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        li.classList.remove("src--over");
        const from = Number(e.dataTransfer.getData("text/plain"));
        if (from === idx || isNaN(from)) return;
        const [moved] = state.sources.splice(from, 1);
        state.sources.splice(idx, 0, moved);
        save(); renderSources();
      });

      li.querySelector(".src__on").addEventListener("change", (e) => {
        state.sources[idx].enabled = e.target.checked;
        li.classList.toggle("src--off", !e.target.checked);
        save();
      });
      const emojiEl = li.querySelector(".src__emoji");
      if (emojiEl) emojiEl.addEventListener("input", (e) => { state.sources[idx].emoji = e.target.value; save(); });
      li.querySelector(".src__name") .addEventListener("input", (e) => { state.sources[idx].name  = e.target.value; save(); });
      li.querySelector(".src__url")  .addEventListener("input", (e) => {
        if (isMulti) {
          const lines = e.target.value.split("\n").map(s => s.trim()).filter(Boolean);
          state.sources[idx].url = JSON.stringify(lines);
        } else {
          state.sources[idx].url = e.target.value;
        }
        save();
      });
      li.querySelector(".src__del").addEventListener("click", () => {
        state.sources.splice(idx, 1); save(); renderSources();
      });

      els.sources.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ── Institution proxy search ──────────────────────────────────────────────────

  const PROXIES_URL = "https://libproxy-db.org/proxies.json";
  let allProxies = null;

  const modal       = document.getElementById("institution-modal");
  const instSearch  = document.getElementById("inst-search");
  const instResults = document.getElementById("inst-results");
  const instHint    = document.getElementById("inst-hint");

  async function loadProxies() {
    if (allProxies) return allProxies;
    instHint.textContent = "Loading institution list…";
    const res  = await fetch(PROXIES_URL);
    allProxies = await res.json();
    instHint.textContent = allProxies.length + " institutions. Type to search.";
    return allProxies;
  }

  function proxyToSourceUrl(rawUrl) {
    return rawUrl.replace(/\$@|\$URL|\$url|\$\{url\}/g, "{DOI_URL}");
  }

  function renderInstResults(query) {
    const q = query.trim().toLowerCase();
    if (!q) { instResults.innerHTML = ""; return; }
    const matches = allProxies
      .filter(p => p.name.toLowerCase().includes(q) || (p.country || "").toLowerCase().includes(q))
      .slice(0, 40);
    instResults.innerHTML = "";
    if (!matches.length) {
      instResults.innerHTML = "<li class='inst-result inst-result--empty'>No matches</li>";
      return;
    }
    matches.forEach(proxy => {
      const li   = document.createElement("li");
      li.className = "inst-result";
      const name = document.createElement("span");
      name.className = "inst-result__name";
      name.textContent = proxy.name;
      const meta = document.createElement("span");
      meta.className = "inst-result__meta";
      meta.textContent = proxy.url || "";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "inst-result__add";
      btn.textContent = "Add";
      btn.addEventListener("click", () => {
        state.sources.push({
          id: "inst-" + Date.now().toString(36),
          emoji: nextEmoji(),
          name: proxy.name,
          url: proxyToSourceUrl(proxy.url),
          enabled: true
        });
        save(); renderSources();
        btn.textContent = "✓ Added";
        btn.disabled    = true;
      });
      li.append(name, meta, btn);
      instResults.appendChild(li);
    });
  }

  function openModal() {
    modal.hidden = false;
    instSearch.value = "";
    instResults.innerHTML = "";
    instSearch.focus();
    loadProxies()
      .then(() => { if (instSearch.value) renderInstResults(instSearch.value); })
      .catch(e => { instHint.textContent = "Failed to load: " + e.message; });
  }
  function closeModal() { modal.hidden = true; }

  document.getElementById("modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  instSearch.addEventListener("input", () => { if (allProxies) renderInstResults(instSearch.value); });

  // ── Event listeners ───────────────────────────────────────────────────────────

  els.wikiLang.addEventListener("change", () => { state.wikipedia.lang = els.wikiLang.value; save(); });
  els.showBadge.addEventListener("change", () => { state.wikipedia.showBadge = els.showBadge.checked; save(); });
  els.scanBare.addEventListener("change", () => { state.behaviour.scanBareText = els.scanBare.checked; save(); });

  els.refreshUrls.addEventListener("click", refreshUrls);
  els.addInstitution.addEventListener("click", openModal);

  const EMOJI_SEQUENCE = ["🏛️","🗝️","📚","📗","🗃️","📜","📘","📰","📕","🗄️","📙","📑"];
  function nextEmoji() {
    const used = new Set(state.sources.map(s => s.emoji));
    return EMOJI_SEQUENCE.find(e => !used.has(e)) || "🔗";
  }

  els.addSource.addEventListener("click", () => {
    state.sources.push({
      id: "custom-" + Date.now().toString(36),
      emoji: nextEmoji(), name: "New source",
      url: "https://example.com/?q={DOI}", enabled: true
    });
    save(); renderSources();
  });

  els.reset.addEventListener("click", () => {
    if (!confirm("Reset all settings to defaults?")) return;
    state = structuredClone(self.DEFAULT_SETTINGS);
    save(); render();
  });
  render();
  load().then(render);
})();
