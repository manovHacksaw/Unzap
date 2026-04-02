# ⚡ Unzap — Starkzap Developer Studio

**AI generates code. Unzap teaches you how it works.**

Unzap is a premium interactive developer studio and learning platform for the **Starknet** ecosystem. It bridges the gap between static documentation and black-box execution by providing a "Learning by Doing" environment powered by the **Starkzap SDK**.

![Unzap Studio](https://raw.githubusercontent.com/manovHacksaw/unzap/main/public/og-image.png)

## 🚀 The Mission

Starknet development is powerful but often complex (Cairo, AA, Paymasters, Sequencers). Unzap removes the mystery by:
1. **Visualizing Execution**: Showing real-time pipelines of every transaction.
2. **Interactive Labs**: Letting developers run SDK methods live on Sepolia.
3. **Structured Curriculum**: A module-based "Developer Academy" to master Native Account Abstraction.

---

## ✨ Key Features

### 🎓 StarkNet Developer Academy
A structured, module-based learning path that guides you from environment setup to advanced multi-calls.
- **Environment Setup**: Guided prerequisites for Node.js, Starknet.js, and Scarb.
- **Core Foundation**: Master Wallet Onboarding and Signer strategies.
- **Sponsored Payments**: Learn how to use the Unzap Paymaster for gasless transactions.

### ⛓️ Visual Execution Pipeline
Stop guessing what happens inside the SDK. Our real-time visualizer tracks your transaction flow:
`Signer (App) → Paymaster (AVNU) → Sequencer (Starknet L2) → Confirmed`

### 🧪 Contract Lab (IDE)
A full-featured Starknet IDE built directly into the studio.
- Compile and Deploy Cairo contracts.
- Manage local/remote files.
- Interact with deployed contracts via auto-generated UIs.

### ⛽ Native Account Abstraction (AA)
Built-in support for **Starkzap's** powerful AA features:
- **Sponsored Transactions**: Onboard users with zero "Dust ETH" requirement.
- **Atomic Multi-calls**: Execute complex logic (Approve + Swap + Deposit) in a single atomic step.

---

## 🛠️ Technical Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Blockchain**: [Starknet.js](https://www.starknetjs.com/) & [Starkzap SDK](https://github.com/manovHacksaw/starkzap)
- **Authentication**: [Privy](https://www.privy.io/) (Embedded/Social Wallets)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **UI Components**: [21st.dev](https://21st.dev/) & [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Prisma](https://www.prisma.io/)

---

## 🚦 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Bun**: (Recommended) or NPM/PNPM

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/manovHacksaw/unzap.git
   cd unzap
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file with the following:
   ```env
   NEXT_PUBLIC_PRIVY_APP_ID=your_id
   NEXT_PUBLIC_AVNU_API_KEY=your_key
   # Add other required keys
   ```

4. **Run the development server**
   ```bash
   bun dev
   ```

Open [http://localhost:3000/studio](http://localhost:3000/studio) to enter the Dev Studio.

---

## 📖 Learn More

- [Official Starknet Docs](https://docs.starknet.io/)
- [Starkzap SDK Documentation](https://github.com/manovHacksaw/starkzap)
- [Starknet.js Guide](https://www.starknetjs.com/)

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Developed with ❤️ for the Starknet Ecosystem.
