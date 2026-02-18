# SteadyLetters iOS Autonomous Coding Session

You are working on **SteadyLetters iOS**, an Expo Router mobile app for creating and sending physical handwritten-style letters via Thanks.io API integration. This is the iOS companion to the SteadyLetters web app.

## Project Location
`/Users/isaiahdupree/Documents/Software/KindLetters/ios`

## PRD References
- **Main PRD**: `/Users/isaiahdupree/Documents/Software/KindLetters/PRD_STEADYLETTERS.md`
- **Live API Testing**: `/Users/isaiahdupree/Documents/Software/KindLetters/PRD_LIVE_API_TESTING.md`

## Feature List (IMPORTANT - update this exact file)
`/Users/isaiahdupree/Documents/Software/KindLetters/ios/feature_list.json`

**CRITICAL**: When you complete a feature, update THIS file by setting `"status": "complete"` for that feature. Do NOT create or update any other feature list files.

## Tech Stack
- **Framework:** Expo SDK 52, React Native 0.76, Expo Router ~4.0
- **Language:** TypeScript 5.3
- **Auth:** Supabase Auth with expo-secure-store adapter
- **AI:** OpenAI GPT-4o (letter generation), Whisper (voice transcription)
- **Mail API:** Thanks.io (postcards, letters, greeting cards)
- **Payments:** RevenueCat (wrapping Stripe)
- **Analytics:** PostHog React Native
- **Icons:** lucide-react-native
- **State:** React Context (Auth, Theme), Zustand for complex state

## Key Files
| Purpose | File |
|---------|------|
| Root Layout | `app/_layout.tsx` |
| Tab Nav | `app/(tabs)/_layout.tsx` |
| Create Letter | `app/(tabs)/index.tsx` |
| Send Flow | `app/send.tsx` |
| Voice Recorder | `app/voice-recorder.tsx` |
| Recipients | `app/(tabs)/recipients.tsx` |
| Orders | `app/(tabs)/orders.tsx` |
| Settings | `app/(tabs)/settings.tsx` |
| Auth | `app/(auth)/sign-in.tsx` |
| Supabase Client | `services/supabase.ts` |
| Thanks.io Client | `services/thanks-io.ts` |
| OpenAI Client | `services/openai.ts` |
| API CRUD | `services/api.ts` |
| Auth Provider | `providers/AuthProvider.tsx` |
| Theme Provider | `providers/ThemeProvider.tsx` |
| Colors | `constants/colors.ts` |
| Config | `constants/config.ts` |

## Commands
```bash
npm start          # Start Expo dev server
npm run ios        # Start on iOS simulator
npm test           # Run unit tests
npm run test:live  # Run LIVE integration tests (sends real letters, costs money)
```

## Important Rules
1. **No mock data** - All API calls must use real services (Supabase, Thanks.io, OpenAI)
2. **Mobile first** - All UI must be touch-friendly with proper safe areas
3. **Use existing services** - Services are already ported in `services/` directory
4. **Test with real APIs** - Live tests in `tests/live/` send actual letters

## Current Focus
Build out remaining features, polish UI, ensure all integrations work end-to-end, and pass all feature list items. Key areas:
- RevenueCat billing integration
- PostHog analytics
- Push notifications for order status
- Polish and error handling across all screens

## TDD Workflow
1. Read the feature requirements from `feature_list.json`
2. Implement the feature
3. Verify it works
4. Update `feature_list.json` with `"status": "complete"`
5. Move to next feature
