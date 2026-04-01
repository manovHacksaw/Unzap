---
name: Unzap Project Overview
description: Core project context — what Unzap is, tech stack, current state, and bounty goal
type: project
---

Unzap is an interactive Starknet + Starkzap developer studio. Users write Cairo, compile, declare, deploy, and interact — all live on Sepolia testnet.

**Why:** Submission for Starkzap $3000 Builder Track bounty. Must showcase deep Starkzap SDK usage.

**Stack:** Next.js App Router + TypeScript, Tailwind, Framer Motion, Starkzap v2, starknet.js v9, Privy v3 for auth.

**SDK keys:** `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `NEXT_PUBLIC_AVNU_API_KEY`, `NEXT_PUBLIC_COMPILER_URL` (scarb server at :3001).

**How to apply:** Always maximize Starkzap SDK usage (`sdk.onboard`, `sdk.connectWallet`, `wallet.execute`, `wallet.transfer`, etc.) before falling back to raw starknet.js.
