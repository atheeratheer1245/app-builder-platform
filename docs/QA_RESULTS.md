# QA Results

## Verification date

2026-08-18

## Visual checks

| Area | Arabic RTL | English LTR | Result |
|---|---|---|---|
| Landing page, desktop | Verified with the custom app icon, navigation, hero, and template overview | Verified through `/?lang=en` with left-to-right composition and readable navigation | Passed |
| Landing page, mobile | Verified at 375 × 812 with language toggle, sign-in, and start buttons visible | Verified at 375 × 812 with left-to-right button order and readable hero content | Passed |
| Authentication page, desktop | Verified bilingual labels, email/password fields, and Google entry point | Verified at `/auth?lang=en` with LTR labels, fields, and actions | Passed |
| Authentication page, mobile | Verified stacked RTL form and readable action controls | Verified at `/auth?lang=en` at 375 × 812 with correctly aligned fields and actions | Passed |
| Protected workspace | Verified that unauthenticated access renders a localized sign-in gate instead of workspace data | The same guard uses the shared language layer | Passed |

## Build and test checks

| Check | Result |
|---|---|
| TypeScript | Passed via `pnpm check` |
| Unit tests | Passed: 16 tests across project catalog, ownership lookup, local authentication, Google OAuth state, Tap charge mapping, Tap credentials, and Tap webhook signing. One SMTP connectivity test is intentionally skipped until valid SMTP credentials are supplied. |
| Production build | Passed via `pnpm build` |

## Known external dependencies

Password-reset email delivery is intentionally blocked until valid SMTP credentials are configured. Cloud build generation for APK, AAB, and IPA remains intentionally deferred pending a chosen provider, Android signing material, and Apple Developer signing material.
