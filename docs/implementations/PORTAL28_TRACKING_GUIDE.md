# Portal28 - Event Tracking Implementation Guide

**Priority:** P3
**Status:** Ready for Implementation
**Target App:** `/Users/isaiahdupree/Documents/Software/Portal28`

---

## Overview

Portal28 is an online course platform. Tracking focuses on course creation, student enrollment, lesson completion, and certificates.

---

## Core Value Events

| Event | Trigger | Properties | North Star |
|-------|---------|------------|-----------|
| `course_created` | New course created | `courseId`, `category`, `lessonCount` | |
| `lesson_added` | Lesson added | `courseId`, `lessonId`, `duration`, `type` | ✅ First Value |
| `course_published` | Course goes live | `courseId`, `lessonCount`, `price`, `category` | ✅ Aha Moment |
| `enrollment_completed` | Student enrolled | `courseId`, `userId`, `paymentMethod`, `amount` | ✅ Monetized |
| `lesson_completed` | Lesson finished | `courseId`, `lessonId`, `completionTime`, `quizScore` | |
| `certificate_issued` | Certificate generated | `courseId`, `userId`, `completionDate` | |

---

## Quick Implementation

### 1. Install SDK

```bash
cd /Users/isaiahdupree/Documents/Software/Portal28
mkdir -p src/lib/tracking
cp /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/shared/userEventTracker.ts src/lib/tracking/
```

### 2. Initialize

```typescript
// app/layout.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

if (typeof window !== 'undefined') {
  tracker.init({
    projectId: 'portal28',
    apiEndpoint: process.env.NEXT_PUBLIC_TRACKING_API || 'http://localhost:3001/api/tracking/events',
    debug: process.env.NODE_ENV === 'development',
  });
}
```

### 3. Key Tracking Points

**Course Created:**
```typescript
// app/courses/create/action.ts
tracker.track('course_created', {
  courseId: course.id,
  category: course.category, // 'web-dev', 'design', 'marketing', etc.
  title: course.title,
  targetAudience: course.targetAudience,
});
```

**Lesson Added:** (First Value)
```typescript
// app/courses/[id]/lessons/create/action.ts
tracker.track('lesson_added', {
  courseId: course.id,
  lessonId: lesson.id,
  duration: lesson.duration, // seconds
  type: lesson.type, // 'video', 'text', 'quiz', 'assignment'
  orderNumber: lesson.orderNumber,
});
```

**Course Published:** (Aha Moment)
```typescript
// app/courses/[id]/publish/action.ts
tracker.track('course_published', {
  courseId: course.id,
  lessonCount: course.lessons.length,
  price: course.price,
  currency: course.currency || 'USD',
  category: course.category,
  totalDuration: course.totalDuration, // seconds
});
```

**Enrollment Completed:** (Monetized)
```typescript
// app/api/enroll/route.ts or webhook
tracker.trackConversion('enrollment', enrollment.amount, {
  orderId: enrollment.id,
  courseId: course.id,
  userId: student.id,
  paymentMethod: enrollment.paymentMethod,
  currency: enrollment.currency,
});

// Also track as event
tracker.track('enrollment_completed', {
  courseId: course.id,
  userId: student.id,
  courseName: course.title,
  instructor: course.instructorId,
});
```

**Lesson Completed:**
```typescript
// app/courses/[id]/lessons/[lessonId]/complete/action.ts
tracker.track('lesson_completed', {
  courseId: course.id,
  lessonId: lesson.id,
  completionTime: Date.now() - lesson.startedAt, // ms
  quizScore: quiz?.score,
  isFirstLesson: lesson.orderNumber === 1,
  progressPercent: (completedLessons / totalLessons) * 100,
});
```

**Certificate Issued:**
```typescript
// app/api/certificates/generate/route.ts
tracker.track('certificate_issued', {
  courseId: course.id,
  userId: student.id,
  completionDate: new Date().toISOString(),
  courseTitle: course.title,
  daysToComplete: Math.floor((Date.now() - enrollment.createdAt) / 86400000),
});
```

---

## Funnel Definitions

**Instructor Funnel:**
```typescript
tracking.defineFunnel({
  id: 'portal28-instructor',
  name: 'Portal28 Instructor Creation Funnel',
  steps: [
    { name: 'Activated', eventName: 'activation_complete' },
    { name: 'Course Created', eventName: 'course_created' },
    { name: 'Lesson Added', eventName: 'lesson_added' },
    { name: 'Course Published', eventName: 'course_published' },
    { name: 'First Enrollment', eventName: 'enrollment_completed' },
  ],
  windowDays: 30,
});
```

**Student Funnel:**
```typescript
tracking.defineFunnel({
  id: 'portal28-student',
  name: 'Portal28 Student Learning Funnel',
  steps: [
    { name: 'Landing', eventName: '$pageview' },
    { name: 'Signup', eventName: 'signup_start' },
    { name: 'Enrolled', eventName: 'enrollment_completed' },
    { name: 'First Lesson', eventName: 'lesson_completed' },
    { name: 'Certificate', eventName: 'certificate_issued' },
  ],
  windowDays: 60,
});
```

---

## Success Criteria

- ✅ All 6 core value events tracked
- ✅ Instructor funnel tracked (course → lessons → publish → enrollments)
- ✅ Student funnel tracked (enroll → lessons → certificate)
- ✅ Monetization tracked (enrollments)
- ✅ User identification on login
