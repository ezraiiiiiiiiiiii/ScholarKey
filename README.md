# ScholarKey

A customizable Firefox extension that adds quick access links to academic papers via their DOI (Digital Object Identifier).

[**Install here**](https://addons.mozilla.org/en-GB/firefox/addon/scholarkey/)!

## Features

- **Default Sources**: Anna's Archive (search & SciDB), Sci-Hub
- **Custom Sources**: Add unlimited custom academic databases
- **Full Customization**: 
  - Choose any emoji for each source
  - Enable/disable sources
  - Reorder sources
  - Edit source names and URLs
- **Dynamic Updates**: Changes apply immediately to all open tabs

## Usage

1. **Browsing**: Visit any webpage with DOI links (e.g., academic journals, Google Scholar). The extension automatically adds emoji links next to each DOI.

2. **Configuration**: Click the extension icon in the toolbar to open settings.

3. **Adding Custom Sources**:
   - Click "+ Add Custom Source"
   - Enter an emoji (e.g., 🔬, 📚, 🎓)
   - Enter a source name
   - Enter the URL template with `EXAMPLE_DOI` as the placeholder
   - Example: `https://myuniversity.edu/search?doi=EXAMPLE_DOI`

4. **Managing Sources**:
   - Check/uncheck to enable/disable
   - Use ▲▼ buttons to reorder
   - Click ✕ to delete custom sources
   - Edit any field inline

## URL Template Format

Use `EXAMPLE_DOI` as the placeholder in your URL template. The extension will replace it with the actual DOI.

### Examples:

- **Google Scholar**: `https://scholar.google.com/scholar?q=EXAMPLE_DOI`
- **PubMed**: `https://pubmed.ncbi.nlm.nih.gov/?term=EXAMPLE_DOI`
- **Semantic Scholar**: `https://www.semanticscholar.org/search?q=EXAMPLE_DOI`
- **Library Search**: `https://library.example.edu/search?query=EXAMPLE_DOI`

## Default Sources

1. **📖 Anna's Archive Search** - `https://annas-archive.org/search?q=EXAMPLE_DOI`
2. **🧬 Anna's Archive SciDB** - `https://annas-archive.org/scidb/EXAMPLE_DOI`
3. **🐦 Sci-Hub** - `https://sci-hub.ru/EXAMPLE_DOI`

## License

MIT
