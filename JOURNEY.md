# My 5-Day Journey with Starknet & Cairo

Building **Unzap Contract Lab** for the Starkzap Developer Bounty was a high-stakes, 5-day sprint. What made it interesting wasn't just the code, but the fact that I started with **exactly zero knowledge of Starknet or Cairo.**

---

## 📅 Day 1: The "Wall" of Local Setup

I started the weekend with enthusiasm, only to hit the first major hurdle of Starknet development: **Local environment setup.**

As a Windows user, installing `scarb` and the Cairo compilers was not the frictionless experience I expected. Between WSL2 configurations and version mismatches, I spent almost 4 hours just trying to compile a "Hello World" contract.

**The Pivot:** I realized that if *I* was struggling as a professional developer, then new builders would give up before they even wrote their first primitive.
> **Mission:** Build a browser-based IDE so that no one ever has to go through the local setup wall again.

## 📅 Day 2: Building the Compiler Sidecar

I spent Day 2 building a **Dockerized Rust sidecar** to handle the Cairo compilation. This was the breakthrough. Once I could send a Cairo string to a server and get a Sierra JSON back, the "IDE" part of the project started to feel real.

By the end of the day, I had a basic React app with CodeMirror 6 that could successfully build contracts and show errors in a terminal.

## 📅 Day 3: Exploring the "Black Box" of Fees

On Day 3, I tackled the deployment phase. This is where I encountered the complexity of **Starknet Declaration vs. Deployment.**

Fees on Starknet are manageable once you have an account, but getting your first Sepolia ETH or STRK is a pain for beginners. I integrated the **Starkzap SDK** and immediately hit another "Aha!" moment.
> **The Realization:** Gasless transactions aren't just a "nice to have"; they are a fundamental onboarding tool.

With the help of the Starkzap `sponsored` fee mode and AVNU's Paymaster, I managed to deploy my first contract without holding any tokens. The magic of "sponsored UDC calls" was the secret sauce that brought Unzap to life.

## 📅 Day 4: UI, UX, and Micro-interactions

A developer tool is only as good as its UX. I spent Day 4 polishing the Studio:
- Implementing **Persistence**: Making sure that refreshing the page didn't wipe hours of work.
- Building the **Interactivity Panel**: Auto-generating the UI from the ABI.
- Adding **Diagnostics**: Creating the "problem squiggles" that make an IDE feel professional.

## 📅 Day 5: The Final Sprint & Polish

The final 24 hours were about stability and beauty.
- Added **Privy** for social login (making the wallet experience seamless).
- Refined the **Dark Theme** to match the high-contrast aesthetic of modern developer tools.
- Tested on-chain flows for edge cases (like re-deploying the same class hash).

---

## 💡 Lessons Learned

1.  **Starknet is easier than it looks, but harder than it should be.** The abstractions like Account Abstraction and Paymasters are amazing, but they are often buried under complex documentation.
2.  **SDKs Save Lives.** The **Starkzap SDK** was instrumental in reducing the complexity of signing and broadcasting. Without it, I would have spent the entire 5 days just fighting with transaction signing logic.
3.  **The Browser is Powerful.** Building a full Cairo IDE and interaction surface entirely in a web-based environment proves that we can bring "one-click development" to the Starknet ecosystem.

**Final Verdict:** 5 days ago I didn't know what a "Class Hash" was. Today, I've shipped a studio that lets anyone deploy their first Cairo contract in seconds.
