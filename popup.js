let sources = [];

async function loadSources() {
  const result = await browser.storage.local.get('doiSources');
  if (result.doiSources) {
    sources = result.doiSources;
  }
  renderSources();
}

async function saveSources() {
  await browser.storage.local.set({ doiSources: sources });
}

function renderSources() {
  const container = document.getElementById('sources-container');
  container.innerHTML = '';
  
  sources.sort((a, b) => a.order - b.order);
  
  if (sources.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-text">No sources configured yet. Add your first one!</div>
      </div>
    `;
    return;
  }
  
  sources.forEach((source, index) => {
    const item = document.createElement('div');
    item.className = 'source-item';
    
    // Header section with toggle and emoji
    const header = document.createElement('div');
    header.className = 'source-header';
    
    // Toggle switch
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle-switch';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = source.enabled;
    checkbox.addEventListener('change', () => {
      source.enabled = checkbox.checked;
      saveSources();
    });
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    toggleLabel.appendChild(checkbox);
    toggleLabel.appendChild(slider);
    
    // Emoji input
    const emojiInput = document.createElement('input');
    emojiInput.type = 'text';
    emojiInput.className = 'emoji-input';
    emojiInput.value = source.emoji;
    emojiInput.maxLength = 2;
    emojiInput.addEventListener('input', () => {
      source.emoji = emojiInput.value;
      saveSources();
    });
    
    // Info section
    const infoDiv = document.createElement('div');
    infoDiv.className = 'source-info';
    
    // Name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'name-input';
    nameInput.value = source.name;
    nameInput.placeholder = 'Source name';
    nameInput.addEventListener('input', () => {
      source.name = nameInput.value;
      saveSources();
    });
    
    // URL input
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'url-input';
    urlInput.value = source.urlTemplate;
    urlInput.placeholder = 'https://example.com/search?q=EXAMPLE_DOI';
    urlInput.addEventListener('input', () => {
      source.urlTemplate = urlInput.value;
      saveSources();
    });
    
    infoDiv.appendChild(nameInput);
    infoDiv.appendChild(urlInput);
    
    // Controls section
    const controls = document.createElement('div');
    controls.className = 'source-controls';
    
    const upBtn = document.createElement('button');
    upBtn.className = 'control-btn';
    upBtn.innerHTML = '▲';
    upBtn.title = 'Move up';
    upBtn.disabled = index === 0;
    upBtn.addEventListener('click', () => moveSource(index, -1));
    
    const downBtn = document.createElement('button');
    downBtn.className = 'control-btn';
    downBtn.innerHTML = '▼';
    downBtn.title = 'Move down';
    downBtn.disabled = index === sources.length - 1;
    downBtn.addEventListener('click', () => moveSource(index, 1));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'control-btn delete';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', () => deleteSource(index));
    
    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(deleteBtn);
    
    header.appendChild(toggleLabel);
    header.appendChild(emojiInput);
    header.appendChild(infoDiv);
    header.appendChild(controls);
    
    item.appendChild(header);
    container.appendChild(item);
  });
}

function moveSource(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= sources.length) return;
  
  // Swap orders
  const temp = sources[index].order;
  sources[index].order = sources[newIndex].order;
  sources[newIndex].order = temp;
  
  // Swap positions in array
  [sources[index], sources[newIndex]] = [sources[newIndex], sources[index]];
  
  saveSources();
  renderSources();
}

function deleteSource(index) {
  if (confirm('Delete this source?')) {
    sources.splice(index, 1);
    // Reorder remaining sources
    sources.forEach((source, i) => {
      source.order = i;
    });
    saveSources();
    renderSources();
  }
}

function addSource() {
  const newSource = {
    id: 'custom_' + Date.now(),
    name: 'New Source',
    emoji: '🔗',
    urlTemplate: 'https://example.com/search?q=EXAMPLE_DOI',
    enabled: true,
    order: sources.length
  };
  sources.push(newSource);
  saveSources();
  renderSources();
}

document.getElementById('add-source').addEventListener('click', addSource);

loadSources();