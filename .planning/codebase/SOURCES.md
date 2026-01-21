# Source Ingestion & Display Guide

**Created:** 2026-01-21

## Adding New Source Types

When adding a new document type to the knowledge base, follow this checklist to ensure end-to-end integration.

### 1. Pinecone Schema

**File:** `src/lib/pinecone/index.ts`

Update `SearchResult.metadata` interface with new fields:
```typescript
metadata: {
  docType: 'legislation' | 'lat_ruling' | 'nutarimas' | 'vdi_faq' | 'vdi_doc' | 'NEW_TYPE';
  // Add type-specific fields
  lawCode?: string;      // For legislation: 'DK', 'DSS', 'PSS', etc.
  category?: string;     // For categorized docs: 'safety', 'employment', etc.
  sourceUrl?: string;    // External link to original document
  title?: string;        // Document title
  // ...
}
```

Update `mapResult()` in `searchHybrid()` to include new fields.

### 2. Hybrid Search

**File:** `src/lib/pinecone/index.ts`

Add new document type to `searchHybrid()`:
- Add parameter: `newTypeK: number = 4`
- Add query with filter: `filter: { docType: 'NEW_TYPE' }`
- Apply score threshold if needed (typically 0.60-0.65)
- Merge into results

### 3. Context Labels for LLM

**File:** `src/app/api/chat/route.ts`

In `contextTexts` mapping, add label for new type:
```typescript
} else if (r.metadata.docType === 'NEW_TYPE') {
  return `[NEW_TYPE_LABEL: ${title}]\n${r.text}`;
}
```

**Important:** The label format affects how LLM cites sources. Use consistent format like:
- `[DARBO KODEKSAS, X straipsnis]` for DK
- `[DSS ĮSTATYMAS, X straipsnis]` for DSS
- `[VDI DOKUMENTAS: Title]` for VDI docs

### 4. Metadata to Frontend

**File:** `src/app/api/chat/route.ts`

In metadata object, include all fields needed for UI:
```typescript
return {
  // ... existing fields
  lawCode: (r.metadata as any).lawCode,      // For legislation distinction
  sourceUrl: (r.metadata as any).sourceUrl,  // For external links
  title: r.metadata.title,                    // For display
};
```

### 5. Source Interface

**File:** `src/components/chat/ChatInterface.tsx`

Update `Source` interface with new fields:
```typescript
interface Source {
  // ... existing fields
  lawCode?: string;
  sourceUrl?: string;
  // Add new type-specific fields
}
```

### 6. Source Label Formatting

**File:** `src/components/chat/ChatInterface.tsx`

Update `formatSource()` to handle new type:
```typescript
if (source.docType === 'NEW_TYPE') {
  return source.title ? `Label: ${source.title.slice(0, 30)}...` : 'Default Label';
}
```

### 7. Source URL Generation

**File:** `src/components/chat/ChatInterface.tsx`

Update `getSourceUrl()` for new type:
```typescript
if (source.docType === 'NEW_TYPE' && source.sourceUrl) {
  return source.sourceUrl;
}
// Or generate URL from metadata:
if (source.docType === 'legislation' && source.lawCode === 'NEW_LAW') {
  return `https://e-tar.lt/portal/lt/legalAct/${E_TAR_DOC_ID}/asr#part_${source.articleNumber}`;
}
```

### 8. Click Handler

**File:** `src/components/chat/ChatInterface.tsx`

Add click behavior in source button onClick:
```typescript
} else if (s.source.docType === 'NEW_TYPE' && s.source.sourceUrl) {
  window.open(s.source.sourceUrl, '_blank');
}
```

### 9. External Link Icon

**File:** `src/components/chat/ChatInterface.tsx`

Add to `isExternalLink` check if type opens external URL:
```typescript
const isExternalLink = ... || (s.source.docType === 'NEW_TYPE' && s.source.sourceUrl);
```

### 10. System Prompt

**File:** `src/lib/gemini/index.ts`

Update `SYSTEM_PROMPT` citation guidance:
```
- If NEW_TYPE - cite as "pagal [šaltinio pavadinimas]..."
```

---

## Common Issues & Fixes

### Citations Not Appearing in Footnotes

**Symptom:** LLM cites sources in text but they don't appear in "Šaltiniai" section.

**Cause:** Citation regex mismatch. LLM outputs `[N, label]` but regex expects `[N]`.

**Fix:** Use flexible regex in ChatInterface.tsx:
```typescript
// Matches both [1] and [1, ...]
/\[(\d+)[,\]]/g
```

### Source Type Not Showing Links

**Symptom:** Source appears in footnotes but clicking does nothing or shows wrong icon.

**Cause:** Missing `sourceUrl` in metadata pipeline or missing click handler.

**Check:**
1. Ingestion script stores `sourceUrl` in Pinecone metadata
2. `mapResult()` in pinecone/index.ts extracts `sourceUrl`
3. API route includes `sourceUrl` in metadata to frontend
4. `getSourceUrl()` returns URL for the type
5. Click handler opens URL for the type
6. `isExternalLink` includes the type

### Legislation Showing Wrong Law Label

**Symptom:** All legislation shows as "DK" even for DSS, PSS, etc.

**Cause:** Missing `lawCode` field in pipeline.

**Check:**
1. Ingestion script stores `lawCode` (e.g., 'DSS', 'PSS')
2. `mapResult()` extracts `lawCode`
3. API context labels check `lawCode`: `(r.metadata as any).lawCode === 'DSS'`
4. API metadata includes `lawCode`
5. `formatSource()` uses `lawCode` for label

---

## E-TAR Document IDs

For linking to legislation on e-tar.lt:

| Law | lawCode | E-TAR Document ID | Articles |
|-----|---------|-------------------|----------|
| Darbo kodeksas | DK | `f6d686707e7011e6b969d7ae07280e89` | 262 |
| DSS Įstatymas | DSS | `TAR.95C79D036AA4` | 50 |
| Priešgaisrinės saugos įstatymas | PSS | `TAR.9CBB77180BFE` | 22 |

URL format: `https://www.e-tar.lt/portal/lt/legalAct/{DOC_ID}/asr#part_{articleNumber}`

---

*Last updated: 2026-01-21*
