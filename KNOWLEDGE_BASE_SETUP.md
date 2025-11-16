# RHEA Knowledge Base Setup Guide

## Overview

RHEA's Knowledge Base allows you to import manuals, videos, documentation, and other content to enhance RHEA's understanding of REAPER, digital audio recording, music production, editing, mixing, and mastering.

## Features

- **Document Import**: PDFs, text files, markdown
- **YouTube Videos**: Import transcripts from YouTube tutorials
- **Web Pages**: Import content from documentation sites
- **Manual Text**: Paste text directly
- **Semantic Search**: Find relevant information using AI embeddings
- **Auto-Integration**: Knowledge automatically enhances AI responses

## Quick Start

1. Click **📚 Import Knowledge** button in RHEA panel
2. Choose an import method:
   - **Manual Text**: Paste content directly
   - **Upload Files**: Select .txt, .pdf, or .md files
   - **YouTube**: Enter YouTube URL (requires transcript)
   - **Web URL**: Import from documentation sites

## Import Methods

### 1. Manual Text Input

Best for:
- Copying sections from manuals
- Pasting tutorial content
- Adding custom notes

Steps:
1. Open Knowledge Base modal
2. Paste text into "Manual Text Input"
3. Click "Import Text"
4. Done! Content is now searchable

### 2. File Upload

Supported formats:
- **.txt** - Plain text files
- **.pdf** - PDF documents (requires PDF.js)
- **.md** - Markdown files

Steps:
1. Click "Choose Files"
2. Select one or more files
3. Click "Import Files"
4. Wait for processing

**Note**: PDF support requires PDF.js library. For full PDF support, consider using a backend service.

### 3. YouTube Videos

Best for:
- REAPER tutorials
- Music production guides
- Mixing/mastering videos

Steps:
1. Copy YouTube video URL
2. Paste into "YouTube Video" field
3. Click "Import YouTube"

**Important**: YouTube transcript extraction requires:
- Video must have captions/subtitles enabled
- Or use a backend service/extension to extract transcripts
- Or manually provide transcript

### 4. Web Pages

Best for:
- REAPER documentation
- Tutorial websites
- Forum posts

Steps:
1. Enter URL
2. Click "Import URL"
3. Content is extracted and imported

**Note**: CORS restrictions may prevent some sites. Use a backend service for full support.

## Recommended Content to Import

### REAPER-Specific
- REAPER User Guide
- REAPER Scripting Guide
- REAPER Forum FAQs
- Action list documentation

### Music Production
- Mixing guides
- Mastering tutorials
- Audio engineering basics
- Signal processing concepts

### Workflow
- Keyboard shortcuts
- Custom action guides
- Template documentation
- Plugin usage guides

## How It Works

1. **Chunking**: Text is split into manageable chunks (~1000 characters)
2. **Embedding**: Each chunk is converted to a vector embedding
3. **Storage**: Embeddings stored in browser localStorage
4. **Search**: When you ask RHEA, it searches for relevant chunks
5. **Context**: Relevant chunks are added to AI context
6. **Response**: AI uses knowledge base to provide accurate answers

## Embeddings

### OpenAI Embeddings (Recommended)
- Uses `text-embedding-3-small` model
- Requires OpenAI API key
- Best quality semantic search
- ~$0.02 per 1M tokens

### Local Embeddings (Fallback)
- Simple word frequency vectors
- No API key required
- Works offline
- Less accurate than OpenAI

## Storage

- Knowledge base stored in browser localStorage
- Limited by browser storage quota (~5-10MB typically)
- Export/import available for backup
- Clear option to free space

## Integration with AI Agent

The knowledge base automatically enhances RHEA's AI responses:

1. When you ask a question, RHEA searches knowledge base
2. Relevant chunks are added to AI context
3. AI uses this context to provide accurate, informed answers
4. Responses are based on your imported content

**Example**:
- You: "How do I create a send track?"
- RHEA searches knowledge base for "send track" information
- Finds relevant REAPER manual section
- Provides accurate answer based on imported documentation

## Tips

1. **Start Small**: Import a few key documents first
2. **Organize**: Use descriptive sources (e.g., "REAPER_Manual_Ch5")
3. **Update**: Re-import when documentation updates
4. **Export**: Regularly export for backup
5. **Clear**: Remove outdated content to save space

## Troubleshooting

### "Knowledge base not initialized"
- Ensure `knowledge-base.js` is loaded
- Check browser console for errors

### "Import failed"
- Check file format is supported
- For PDFs, ensure PDF.js is loaded
- For YouTube, ensure video has captions

### "Storage quota exceeded"
- Export and clear old content
- Use smaller documents
- Consider using a backend service

### "Embeddings not working"
- Check OpenAI API key is set (for OpenAI embeddings)
- Local embeddings work but are less accurate

## Advanced Usage

### Programmatic Import

```javascript
// In browser console
const kb = rhea.knowledgeUIManager.kb;
const importer = rhea.knowledgeUIManager.importer;

// Import text
await importer.importText('REAPER is a digital audio workstation...', {
    source: 'manual',
    type: 'documentation'
});

// Search
const results = await kb.search('how to create send track');
console.log(results);
```

### Export/Import

```javascript
// Export
const data = kb.export();
// Save to file or send to server

// Import
kb.import(data);
```

## Future Enhancements

- Backend service for PDF processing
- YouTube transcript extraction service
- Cloud storage for large knowledge bases
- Multi-language support
- Advanced chunking strategies
- Vector database integration

## Best Practices

1. **Quality over Quantity**: Import high-quality, relevant content
2. **Keep Updated**: Re-import when sources update
3. **Organize Sources**: Use clear source names
4. **Regular Backups**: Export knowledge base regularly
5. **Monitor Storage**: Watch localStorage usage

Enjoy your enhanced RHEA! 🚀

