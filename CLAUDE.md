# CLAUDE.md — furni-app

## Approach
- Read files before modifying. Never edit blind.
- Prefer editing existing files over creating new ones.
- Simplest working solution. No over-engineering.
- No abstractions for single-use operations.
- No speculative features or "you might also want..."
- If unsure: say so. Never guess file paths.

## Output
- Return code first; explanation after only if non-obvious.
- No inline prose. Comments only where logic is non-obvious.
- No boilerplate, docstrings, or type annotations on unchanged code.
- No error handling for impossible scenarios.
- No sycophantic openers or closing summaries.
- Three similar lines of code is better than a premature abstraction.

## Debugging
- Never speculate without reading relevant code first.
- State what was found, where, and the fix — in one pass.
- If cause is unclear: say so. Don't guess.

## Stack
- React + Vite (frontend)
- Firebase Firestore + FCM (backend)
- Cloudinary (image upload)
- Vercel (hosting)
- Firebase Functions (scheduled/trigger jobs)
- Language: Korean UI, Korean comments preferred
