# VelloPad - Event Tracking Implementation Guide

**Priority:** P2
**Status:** Ready for Implementation
**Target App:** `/Users/isaiahdupree/Documents/Software/VelloPad`

---

## Overview

VelloPad is a book writing platform. Tracking focuses on book creation, writing progress, PDF generation, and print orders.

---

## Core Value Events

| Event | Trigger | Properties | North Star |
|-------|---------|------------|-----------|
| `book_created` | New book started | `bookId`, `genre`, `targetWordCount` | |
| `chapter_written` | Chapter completed | `bookId`, `chapterNumber`, `wordCount`, `duration` | ✅ First Value |
| `word_count_milestone` | Hit milestone | `bookId`, `milestone` (1000/5000/10000/25000) | ✅ Aha Moment |
| `pdf_generated` | Print-ready PDF | `bookId`, `pageCount`, `fileSize`, `format` | |
| `cover_designed` | Cover created | `bookId`, `templateId`, `customDesign` | |
| `order_placed` | Physical copy ordered | `bookId`, `quantity`, `amount`, `shippingCountry` | ✅ Monetized |

---

## Quick Implementation

### 1. Install SDK

```bash
cd /Users/isaiahdupree/Documents/Software/VelloPad
mkdir -p src/lib/tracking
cp /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/shared/userEventTracker.ts src/lib/tracking/
```

### 2. Initialize

```typescript
// app/layout.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

if (typeof window !== 'undefined') {
  tracker.init({
    projectId: 'vellopad',
    apiEndpoint: process.env.NEXT_PUBLIC_TRACKING_API || 'http://localhost:3001/api/tracking/events',
    debug: process.env.NODE_ENV === 'development',
  });
}
```

### 3. Key Tracking Points

**Book Created:**
```typescript
// app/books/create/action.ts
tracker.track('book_created', {
  bookId: book.id,
  genre: book.genre,
  targetWordCount: book.targetWordCount || 50000,
  title: book.title,
});
```

**Chapter Written:** (First Value)
```typescript
// app/books/[id]/chapters/[chapterId]/save/action.ts
tracker.track('chapter_written', {
  bookId: book.id,
  chapterNumber: chapter.number,
  wordCount: chapter.wordCount,
  duration: Date.now() - chapter.startedAt, // ms
});
```

**Word Count Milestone:** (Aha Moment)
```typescript
// app/books/[id]/editor/page.tsx
const milestones = [1000, 5000, 10000, 25000, 50000];

function checkMilestone(currentWordCount, previousWordCount) {
  for (const milestone of milestones) {
    if (currentWordCount >= milestone && previousWordCount < milestone) {
      tracker.track('word_count_milestone', {
        bookId: book.id,
        milestone,
        currentWordCount,
        daysToMilestone: Math.floor((Date.now() - book.createdAt) / 86400000),
      });
    }
  }
}
```

**PDF Generated:**
```typescript
// app/api/books/[id]/export/pdf/route.ts
tracker.track('pdf_generated', {
  bookId: book.id,
  pageCount: pdf.pageCount,
  fileSize: pdf.fileSize,
  format: 'print-ready', // or 'draft'
  wordCount: book.totalWordCount,
});
```

**Cover Designed:**
```typescript
// app/books/[id]/cover/save/action.ts
tracker.track('cover_designed', {
  bookId: book.id,
  templateId: cover.templateId,
  customDesign: cover.isCustom,
  designTool: cover.tool, // 'builtin', 'uploaded', 'ai-generated'
});
```

**Order Placed:** (Monetized)
```typescript
// app/api/webhooks/printful/route.ts
tracker.trackConversion('order', order.amount, {
  orderId: order.id,
  bookId: order.bookId,
  quantity: order.quantity,
  shippingCountry: order.shippingAddress.country,
  productType: order.productType, // 'paperback', 'hardcover'
});
```

---

## Funnel Definition

```typescript
tracking.defineFunnel({
  id: 'vellopad-writing',
  name: 'VelloPad Writing Funnel',
  steps: [
    { name: 'Activated', eventName: 'activation_complete' },
    { name: 'Book Created', eventName: 'book_created' },
    { name: 'First Chapter', eventName: 'chapter_written' },
    { name: '1K Words', eventName: 'word_count_milestone' },
    { name: 'PDF Generated', eventName: 'pdf_generated' },
    { name: 'Order Placed', eventName: 'order_placed' },
  ],
  windowDays: 30,
});
```

---

## Success Criteria

- ✅ All 6 core value events tracked
- ✅ Writing progress tracked (chapters + milestones)
- ✅ Monetization tracked (orders)
- ✅ User identification on login
