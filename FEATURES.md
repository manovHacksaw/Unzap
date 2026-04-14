# Unzap Features

Unzap Contract Lab is more than just a code editor; it is a full-lifecycle development environment for Starknet, built to lower the barrier to entry for new Cairo developers.

---

## 1. Professional Browser-Based IDE

The **Contract Lab** core is a high-performance editor that brings the desktop IDE experience to the web.

- **Powered by CodeMirror 6**: Leveraging the latest in web-editor technology for smooth scrolling, code folding, and large file support.
- **Cairo Syntax Highlighting**: Custom-tailored highlighting for Cairo 1.0, including support for decorators (`#[storage]`, `#[external]`), nested modules, and modern Rust-style syntax.
- **Intelligent Diagnostics**: Real-time linting and error reporting. If your Cairo code has a syntax error, Unzap catches it and highlights the line with a descriptive message in the **Problems** tab.
- **Productivity Shortcuts**:
  - `Ctrl + S`: Build and Compile instantly.
  - `Ctrl + /`: Toggle line comments.
  - `Tab`: Smart indentation.

## 2. Integrated "Sidecar" Compiler

One of Unzap's biggest technical achievements is its zero-setup compilation flow.

- **No Local Tools Required**: You don't need `scarb` or `starknet-compile` on your machine.
- **Backend Compiler Service**: Unzap communicates with a high-performance Rust-based sidecar service that handles the heavy lifting of turning Cairo source code into **Sierra** (JSON) and **CASM** artifacts.
- **Instant Feedback**: The compiler results are streamed directly back to the IDE terminal, providing a seamless loop from writing code to seeing build success.

## 3. Gasless Declaration & Deployment (Starkzap SDK)

Unzap is built on the philosophy that developers shouldn't have to worry about gas fees just to test a contract.

- **Starkzap Integration**: Uses the **Starkzap SDK** to handle complex signing and fee-abstraction workflows.
- **Sponsored Declare**: For common templates and "Hello World" contracts, Unzap uses a studio-sponsored declare flow. This means you can declare a contract on Sepolia without a single STRK in your wallet.
- **Gasless UDC Deploy**: Deployment is handled via the Universal Deployer Contract (UDC) using **sponsored transactions**.
- **AVNU Paymaster**: All gasless transactions are powered by the AVNU Paymaster, ensuring high reliability and fast inclusion on Starknet.

## 4. Universal Interaction UI

Once a contract is deployed, Unzap automatically generates a custom UI to interact with it.

- **Dynamic ABI Parsing**: Unzap reads the contract's ABI and generates input fields for every function.
- **Read/Write Separation**: Clearly distinguished sections for "View" (queries) and "External" (transactions) functions.
- **Gasless Interactions**: Every "Write" call can be executed gaslessly through the Starkzap sponsored flow, making it perfect for rapid prototyping.

## 5. Intelligent Wallet Abstraction

Unzap bridges the gap between Web2 developers and Web3 complexity.

- **Privy Auth**: Log in with Google, Twitter, or Discord. Unzap generates an embedded Starknet account for you instantly.
- **Embedded Accounts**: Your account is managed by **Privy**, so you don't even need a browser extension to get started.
- **Extension Support**: For "power users," Unzap fully supports **ArgentX** and **Braavos** extensions.

## 6. Persistence & History

Never lose your work. Unzap treats your browser as a secure workspace.

- **Draft Persistence**: Your source code is automatically saved to local storage. Even if you refresh the page or close your browser, your code is right where you left it.
- **Deployment History**: A detailed log of all your previous declarations and deployments. Click any historical entry to restore the interaction interface instantly.
- **Transaction Logs**: A real-time terminal showing every on-chain event with direct links to Starknet Explorers (Voyager/Starkscan).
