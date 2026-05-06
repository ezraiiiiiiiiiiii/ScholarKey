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

  // Per-session UI state: which source rows are expanded.
  // Not persisted — every popup open starts with everything collapsed
  // (except newly created or unconfigured sources).
  const expandedIds = new Set();

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

      // Walk every source and rewrite the host portion of any URL whose
      // current value contains "annas-archive" or "sci-hub". Multi-source
      // arrays get the same treatment per-entry. Nothing about source IDs
      // is hardcoded — the match is purely on URL content.
      let touched = 0;
      const replaceHost = (u) => {
        if (annasUrl && /annas-archive/i.test(u)) {
          touched++;
          return u.replace(/^https?:\/\/[^\/]+/, annasUrl);
        }
        if (scihubUrl && /sci-hub/i.test(u)) {
          touched++;
          return u.replace(/^https?:\/\/[^\/]+/, scihubUrl);
        }
        return u;
      };
      for (let i = 0; i < state.sources.length; i++) {
        const src = state.sources[i];
        if (src.type === "multi") {
          let arr;
          try { arr = JSON.parse(src.url || "[]"); } catch (_) { arr = []; }
          if (Array.isArray(arr) && arr.length) {
            const rewritten = arr.map(replaceHost);
            state.sources[i].url = JSON.stringify(rewritten);
          }
        } else if (src.url) {
          state.sources[i].url = replaceHost(src.url);
        }
      }

      save();
      renderSources();
      const parts = [];
      if (annasUrl)  parts.push("Anna's → " + annasUrl);
      if (scihubUrl) parts.push("Sci-Hub → " + scihubUrl);
      const head = parts.length ? parts.join(", ") : "No URLs found";
      els.refreshStatus.textContent =
        touched ? `${head} (${touched} URL${touched === 1 ? "" : "s"} updated)` : head;
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

  function isConfigured(src) {
    // A source is "configured" when it has both a non-empty name and URL.
    // Configured sources collapse to icon + title; unconfigured ones stay
    // expanded so the user can finish filling them in.
    const hasName = (src.name || "").trim().length > 0;
    const hasUrl  = src.type === "multi"
      ? (() => { try { return JSON.parse(src.url || "[]").some(u => u && u.trim()); } catch (_) { return false; } })()
      : (src.url || "").trim().length > 0;
    return hasName && hasUrl;
  }

  function shouldExpand(src) {
    return expandedIds.has(src.id) || !isConfigured(src);
  }

  function render() {
    els.wikiLang.value    = state.wikipedia.lang;
    els.showBadge.checked = state.wikipedia.showBadge !== false;
    els.scanBare.checked = state.behaviour.scanBareText;
    renderSources();
  }

  function firstUrl(src) {
    // First non-empty URL on a source, treating multi sources as arrays.
    const isMulti = src.type === "multi";
    if (isMulti) {
      try {
        const arr = JSON.parse(src.url || "[]");
        return (arr.find(u => u && u.trim()) || "").trim();
      } catch (_) { return ""; }
    }
    return (src.url || "").trim();
  }

  function eduDomainFromUrl(url) {
    // Mirror content.js exactly. We pass the registrable .edu domain (e.g.
    // "mit.edu" from "libproxy.mit.edu/...") to the favicon service —
    // Google returns a generic globe for arbitrary subdomains but the
    // correct icon for the root domain. Keeping the popup logic identical
    // to content.js ensures the popup row and the on-page badge agree on
    // which favicon to show.
    const m = url && url.match(/([a-z0-9-]+\.edu)/i);
    return m ? m[1].toLowerCase() : null;
  }

  function faviconUrl(domain) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
  }

  function buildIconHtml(src) {
    // Institution proxy URLs containing a .edu domain get the institution
    // favicon; everything else gets the user-set emoji. This mirrors
    // content.js's source-button rendering so the popup and the badges
    // always show the same icon for the same source.
    const emoji  = escapeHtml(src.emoji || "🔗");
    const domain = eduDomainFromUrl(firstUrl(src));
    if (!domain) return `<span class="src__icon-glyph">${emoji}</span>`;
    return `<img class="src__favicon" src="${faviconUrl(domain)}" alt=""
              title="${escapeHtml(domain)}" width="16" height="16"
              data-fallback="${emoji}">`;
  }

  // Wires the favicon-error fallback for every <img.src__favicon> inside
  // a freshly-rendered subtree. Manifest V3 CSP forbids inline onerror,
  // so we attach the handler after innerHTML is set.
  function wireFaviconFallbacks(root) {
    root.querySelectorAll("img.src__favicon").forEach(img => {
      img.addEventListener("error", () => {
        const span = document.createElement("span");
        span.className = "src__icon-glyph";
        span.textContent = img.dataset.fallback || "🔗";
        img.replaceWith(span);
      }, { once: true });
    });
  }

  function renderSources() {
    els.sources.innerHTML = "";
    state.sources.forEach((src, idx) => {
      const isMulti  = src.type === "multi";
      const expanded = shouldExpand(src);

      let displayUrl = src.url;
      if (isMulti) {
        try { displayUrl = JSON.parse(src.url).join("\n"); } catch (_) {}
      }

      const li = document.createElement("li");
      li.className = "src" + (src.enabled ? "" : " src--off") + (expanded ? " src--open" : "");
      li.draggable = false;

      // ── Collapsed header row (always rendered) ──────────────────────────
      const row = document.createElement("div");
      row.className = "src__row";
      row.innerHTML = `
        <span class="src__handle" title="Drag to reorder">⋮⋮</span>
        <input type="checkbox" class="src__on" ${src.enabled ? "checked" : ""}
               aria-label="Enable ${escapeHtml(src.name)}">
        <span class="src__icon">${buildIconHtml(src)}</span>
        <span class="src__title${isMulti ? " src__title--multi" : ""}">${escapeHtml(src.name || "Untitled source")}</span>
        <span class="src__chevron" aria-hidden="true">›</span>
      `;
      li.appendChild(row);

      // Toggle expansion when the row is clicked, except on the checkbox
      // and drag handle which have their own behaviour.
      row.addEventListener("click", (e) => {
        if (e.target.closest(".src__on") || e.target.closest(".src__handle")) return;
        if (expandedIds.has(src.id)) expandedIds.delete(src.id);
        else                          expandedIds.add(src.id);
        renderSources();
      });

      // ── Expanded edit panel ─────────────────────────────────────────────
      if (expanded) {
        const edit = document.createElement("div");
        edit.className = "src__edit";

        const urlLabel = isMulti ? "URLs" : "URL";

        edit.innerHTML = `
          <div class="src__field src__field--inline">
            <div class="src__field-col src__field-col--icon">
              <span class="src__field-label">Emoji</span>
              <input type="text" class="src__icon-input" value="${escapeHtml(src.emoji || "")}" maxlength="4" aria-label="Emoji">
            </div>
            <div class="src__field-col src__field-col--name">
              <span class="src__field-label">Name</span>
              <input type="text" class="src__name" value="${escapeHtml(src.name)}" aria-label="Name" placeholder="e.g. MIT Libraries">
            </div>
          </div>
          <div class="src__field">
            <span class="src__field-label">${urlLabel} <span class="src__field-hint">— use <code>{DOI}</code> or <code>{DOI_URL}</code></span></span>
            ${isMulti
              ? `<textarea class="src__url" spellcheck="false" placeholder="One URL per line">${escapeHtml(displayUrl)}</textarea>`
              : `<input type="text" class="src__url" spellcheck="false" value="${escapeHtml(displayUrl)}" placeholder="https://example.com/?q={DOI}">`}
          </div>
          <div class="src__edit-actions">
            <button type="button" class="src__multi-toggle">${isMulti ? "Make single URL" : "Add another URL"}</button>
            <button type="button" class="src__del">Delete source</button>
          </div>
        `;
        li.appendChild(edit);
      }

      // ── Drag-and-drop wiring ────────────────────────────────────────────
      const handle = row.querySelector(".src__handle");
      handle.addEventListener("pointerdown", () => { li.draggable = true; });
      li.addEventListener("dragend",  () => { li.draggable = false; li.classList.remove("src--dragging"); });
      li.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", String(idx));
        li.classList.add("src--dragging");
      });
      li.addEventListener("dragover",  (e) => { e.preventDefault(); li.classList.add("src--over"); });
      li.addEventListener("dragleave", ()  => li.classList.remove("src--over"));
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        li.classList.remove("src--over");
        const from = Number(e.dataTransfer.getData("text/plain"));
        if (from === idx || isNaN(from)) return;
        const [moved] = state.sources.splice(from, 1);
        state.sources.splice(idx, 0, moved);
        save();
        renderSources();
      });

      // ── Checkbox ────────────────────────────────────────────────────────
      row.querySelector(".src__on").addEventListener("click", e => e.stopPropagation());
      row.querySelector(".src__on").addEventListener("change", (e) => {
        state.sources[idx].enabled = e.target.checked;
        li.classList.toggle("src--off", !e.target.checked);
        save();
      });

      // ── Edit-panel field handlers ───────────────────────────────────────
      if (expanded) {
        const emojiEl = li.querySelector("input.src__icon-input");
        emojiEl.addEventListener("input", (e) => {
          state.sources[idx].emoji = e.target.value;
          // If a favicon is currently shown, the emoji is invisible — just
          // update its data-fallback so a future favicon failure picks up
          // the new value. Otherwise re-render the glyph in place.
          const iconSpan = row.querySelector(".src__icon");
          if (iconSpan) {
            const img = iconSpan.querySelector("img.src__favicon");
            if (img) {
              img.dataset.fallback = e.target.value || "🔗";
            } else {
              iconSpan.innerHTML = buildIconHtml(state.sources[idx]);
              wireFaviconFallbacks(iconSpan);
            }
          }
          save();
        });
        const nameEl = li.querySelector("input.src__name");
        nameEl.addEventListener("input", (e) => {
          state.sources[idx].name = e.target.value;
          // Live-update the title in the collapsed row
          const titleSpan = row.querySelector(".src__title");
          if (titleSpan) titleSpan.textContent = e.target.value || "Untitled source";
          save();
        });
        const urlEl = li.querySelector(".src__url");
        urlEl.addEventListener("input", (e) => {
          if (isMulti) {
            const lines = e.target.value.split("\n").map(s => s.trim()).filter(Boolean);
            state.sources[idx].url = JSON.stringify(lines);
          } else {
            state.sources[idx].url = e.target.value;
          }
          save();
        });
        // Toggle between single-URL and multi-URL modes. We preserve URLs
        // across the conversion: single → multi wraps the current URL in an
        // array; multi → single takes the first URL from the array.
        li.querySelector(".src__multi-toggle").addEventListener("click", () => {
          const cur = state.sources[idx];
          if (cur.type === "multi") {
            let arr = [];
            try { arr = JSON.parse(cur.url || "[]"); } catch (_) {}
            cur.url  = (arr[0] || "").trim();
            delete cur.type;
          } else {
            const existing = (cur.url || "").trim();
            cur.url  = JSON.stringify(existing ? [existing] : []);
            cur.type = "multi";
          }
          // Keep the panel open after the flip so the user sees the change.
          expandedIds.add(cur.id);
          save();
          renderSources();
        });
        li.querySelector(".src__del").addEventListener("click", () => {
          expandedIds.delete(src.id);
          state.sources.splice(idx, 1);
          save();
          renderSources();
        });
      }

      els.sources.appendChild(li);
    });
    wireFaviconFallbacks(els.sources);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
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
    instHint.textContent = allProxies.length + " institutions. Type to search by name.";
    return allProxies;
  }

  function proxyToSourceUrl(rawUrl) {
    return rawUrl.replace(/\$@|\$URL|\$url|\$\{url\}/g, "{DOI_URL}");
  }

  function renderInstResults(query) {
    const q = query.trim().toLowerCase();
    if (!q) { instResults.innerHTML = ""; return; }
    const matches = allProxies
      .filter(p => p.name.toLowerCase().includes(q))
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
        const newSrc = {
          id: "inst-" + Date.now().toString(36),
          emoji: nextEmoji(),
          name: proxy.name,
          url: proxyToSourceUrl(proxy.url),
          enabled: true
        };
        state.sources.push(newSrc);
        // Newly-added institutions are configured (have name + URL),
        // so they collapse straight away — no need to expand.
        save();
        renderSources();
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

  els.wikiLang.addEventListener("change",  () => { state.wikipedia.lang     = els.wikiLang.value;     save(); });
  els.showBadge.addEventListener("change", () => { state.wikipedia.showBadge = els.showBadge.checked; save(); });
  els.scanBare.addEventListener("change",  () => { state.behaviour.scanBareText = els.scanBare.checked; save(); });

  els.refreshUrls.addEventListener("click", refreshUrls);
  els.addInstitution.addEventListener("click", openModal);

  const EMOJI_SEQUENCE = ["🏛️","🗝️","📚","📗","🗃️","📜","📘","📰","📕","🗄️","📙","📑"];
  function nextEmoji() {
    const used = new Set(state.sources.map(s => s.emoji));
    return EMOJI_SEQUENCE.find(e => !used.has(e)) || "🔗";
  }

  els.addSource.addEventListener("click", () => {
    const newSrc = {
      id: "custom-" + Date.now().toString(36),
      emoji: nextEmoji(),
      name: "",
      url: "",
      enabled: true
    };
    state.sources.push(newSrc);
    // Open the edit panel for the new source so the user can fill it in.
    expandedIds.add(newSrc.id);
    save();
    renderSources();
  });

  els.reset.addEventListener("click", () => {
    if (!confirm("Reset all settings to defaults?")) return;
    expandedIds.clear();
    state = structuredClone(self.DEFAULT_SETTINGS);
    save();
    render();
  });

  // ── Host-permission banner ────────────────────────────────────────────────────
  //
  // In Firefox MV3, host_permissions like <all_urls> are *optional* by default
  // even when declared in the manifest — Firefox prompts the user per site
  // ("Permission needed", a blue dot under the toolbar icon) and grants only
  // ad-hoc, non-persistent access. The result: badges fail to appear on most
  // pages until the user clicks the toolbar icon and approves the current site,
  // and that approval doesn't survive a reload.
  //
  // The fix is to ask Firefox for a persistent grant via permissions.request().
  // The call must happen from a user gesture handler, so we surface a banner
  // with a button. Once granted, no further per-site clicks are needed.

  const browserApi = (typeof browser !== "undefined" ? browser : chrome);
  const permsApi   = browserApi?.permissions;
  const permBanner = document.getElementById("perm-banner");
  const permGrant  = document.getElementById("perm-grant");
  const REQUIRED_ORIGINS = { origins: ["<all_urls>"] };

  function refreshPermBanner() {
    if (!permsApi || !permsApi.contains) {
      // No permissions API (e.g. very old browser) — assume we're fine.
      permBanner.hidden = true;
      return;
    }
    permsApi.contains(REQUIRED_ORIGINS).then(granted => {
      permBanner.hidden = !!granted;
    }).catch(() => { permBanner.hidden = true; });
  }

  if (permGrant) {
    permGrant.addEventListener("click", () => {
      if (!permsApi || !permsApi.request) return;
      permsApi.request(REQUIRED_ORIGINS).then(granted => {
        if (granted) {
          permBanner.hidden = true;
          flash("Access granted — reload tabs to see badges", els.status);
        } else {
          flash("Permission declined", els.status);
        }
      }).catch(err => {
        flash("Error: " + err.message, els.status);
      });
    });
  }

  // Keep the banner in sync if the user grants/revokes permission elsewhere
  // (e.g. via Firefox's unified extensions panel).
  if (permsApi?.onAdded)   permsApi.onAdded.addListener(refreshPermBanner);
  if (permsApi?.onRemoved) permsApi.onRemoved.addListener(refreshPermBanner);

  // ── Boot ──────────────────────────────────────────────────────────────────────

  // Render defaults immediately so Firefox sees a fully-sized popup on the
  // first click. Storage may not be loaded yet — that's fine, defaults are
  // shown instantly and the UI is re-rendered once the stored state arrives.
  render();
  load().then(render);
  refreshPermBanner();
})();
