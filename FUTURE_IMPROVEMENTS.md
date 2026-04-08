# Future Improvements & Roadmap

Unzap Contract Lab is just the beginning. Our goal is to make it the definitive, zero-setup IDE for the entire Starknet ecosystem. Below are the key milestones and features planned for the next development phase.

---

## 🧬 Phase 1: Technical Foundation

- **[ ] Browser-native WASM Compilation**: Shifting the sidecar compiler logic into a WebAssembly module. This will allow for 100% offline-first development and even faster build times by removing the need for a network round-trip.
- **[ ] Multi-file Cairo Project Support**: Moving beyond single-contract files to full `Scarb`-like project folder support. This will include a more robust file explorer and the ability to import modules.
- **[ ] Unit Test Integration**: Allowing developers to write and run Cairo tests (`#[test]`) directly in the browser terminal.

## ⚡ Phase 2: Enhanced DX (Developer Experience)

- **[ ] AI-Powered Code Remediation**: Integrating with modern LLMs to provide real-time fixes for Cairo errors. "One-click" resolution for common issues like storage initialization or module imports.
- **[ ] Gasless Mainnet Support**: Expanding the **Starkzap SDK** integration to support sponsored transactions on Mainnet (requires seeding the studio's paymaster).
- **[ ] Direct Contract Verification**: A "One-click Verify" button that automatically packages your source code and sends it to Starkscan or Voyager for on-chain verification.

## 🌐 Phase 3: Ecosystem & Collaboration

- **[ ] Shared Workspace URLs**: Generation of unique, shareable links to a specific contract draft and its deployment history. Perfect for collaborating with other developers or showing off a prototype.
- **[ ] GitHub Integration**: The ability to sync your Unzap project directly with a GitHub repository, enabling a "Web-to-Repo" development flow.
- **[ ] Template Marketplace**: A community-driven library of Cairo templates that can be instantly loaded, modified, and deployed gaslessly.

## 🛡️ Stability & Tooling

- **[ ] Trace Visualizer**: A visual breakdown of the Starknet execution trace for a transaction, helping developers understand where gas is being consumed and where logic is failing.
- **[ ] Event Monitoring**: A dedicated "Events" tab in the interaction panel that listens to and decodes emitted events from the contract in real-time.

---

### Current Known Limitations (to be addressed)
- **Mainnet Paymaster**: Currently, gasless deployments are focused on **Sepolia**. Mainnet deployment requires the developer to use their own funded wallet or the Studio to top up regional paymasters.
- **Advanced Imports**: Complex projects that rely on many external dependencies/crates currently require the remote compiler to have those crates pre-installed.
