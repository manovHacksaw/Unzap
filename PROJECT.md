# Unzap — Starkzap Dev Studio

## Problem

Starknet is powerful but developer onboarding is painful:

- Too many complex steps: Cairo → Sierra → Declare → Deploy → Interact
- Starkzap SDK simplifies things (gasless payments, clean TS API) but still feels like a black box
- Docs are static; AI code generators only spit out code — nothing lets developers **see and understand** what actually happens under the hood when using Starkzap

## Solution

Unzap is an interactive developer studio that teaches Starknet + Starkzap by letting developers **learn by doing** with real execution.

**Core Philosophy:** `Explain → Execute → Visualize → Copy → Understand`

## Unique Selling Point

While AI tools generate code, Unzap guides users step-by-step, lets them execute everything live on Starknet (Sepolia), and shows a real-time visualizer of every internal step — removing the black box feeling of Starkzap.

## Key Features

### 1. Guided Mode
- User types: "I want to build a voting app with gasless voting"
- System breaks it down:
  - Shows simple Cairo contract + explanation
  - Explains declare/deploy process
  - Generates Starkzap integration code
  - Lets user execute actions live

### 2. Live Starkzap Playground *(MVP Priority #1)*
- Actions: Connect Wallet, Pay (gasless), Sign Message, Send Transaction
- Clean input form + big "Execute" button
- Real-time Execution Visualizer with animated steps:
  1. Wallet connected
  2. Transaction created
  3. Paymaster applied (gasless)
  4. Signed by account
  5. Sent to Starknet
  6. Confirmed
- Shows raw JSON response + copyable clean code snippet

### 3. Execution Visualizer *(Biggest Differentiator)*
- Animated step-by-step breakdown for every Starkzap action
- Makes abstract concepts (paymaster, account abstraction, gasless) feel tangible
- Dark background with glowing neon accents on connector lines

### 4. Contract Lab
- Input contract address + ABI (or select preloaded templates)
- Auto-generates UI to call functions
- Executes calls through Starkzap SDK

### 5. AI Assistant *(Support role only)*
- Explains concepts
- Helps write small snippets
- Guides next steps
- **Not** used for full app generation

## Technical Architecture

| Layer | Choice |
|---|---|
| Framework | Next.js App Router + TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui, Aceternity UI, 21st.dev |
| SDK | Starkzap (`new StarkZap({ network: "sepolia" })`) |
| Animation | Framer Motion (especially visualizer steps) |
| Wallet Auth | Privy |
| Network | Starknet Sepolia testnet |

**Design:** Pure black / dark navy background · Sharp amber / monochrome accents · No heavy gradients · Premium dev-tool aesthetic

## Mental Model

```
Cairo      →  Logic
Starknet   →  Execution
Starkzap   →  Abstraction
Unzap      →  Learning + Transparency Layer
```

## Current Status

- Landing page: complete (dark minimalist, particle sphere background)
- Playground: implemented (wallet connect, pay/sign/send, execution visualizer)
- Guided Mode: placeholder
- Visualizer: placeholder
- Contract Lab: placeholder
- AI Chat: placeholder

## MVP Goals (Target: 1 Week)

- [x] Landing page
- [ ] Live Playground + Execution Visualizer (priority #1)
- [ ] Basic Guided Mode
- [ ] Deploy on Vercel
- [ ] Submit to Starkzap $3000 Bounty (Builder Track)

## Positioning

> "AI tools generate code.
> Unzap teaches Starknet + Starkzap by letting developers execute and understand each step live."
