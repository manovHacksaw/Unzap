# Unzap Contract Lab - Full Documentation

Welcome to the complete guide for Unzap Contract Lab. This document covers everything from your first steps to advanced system architecture.

## Table of Contents
1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Core Concepts](#3-core-concepts)
4. [Usage Guide](#4-usage-guide)
5. [Example Workflow](#5-example-workflow)
6. [Advanced Usage](#6-advanced-usage)
7. [Architecture](#7-architecture)
8. [FAQ & Troubleshooting](#8-faq--troubleshooting)

---

## 1. Introduction

### What is Unzap Contract Lab?
Unzap Contract Lab is a **zero-setup, browser-based development studio** designed specifically for Starknet. It provides a unified environment where developers can write, compile, deploy, and interact with Cairo smart contracts without installing any local tools.

Built on top of the **Starkzap SDK**, Unzap removes the traditional friction of Starknet development, making it feel as seamless as building for the modern web.

### The Problem It Solves
Starknet development is powerful but often has a high barrier to entry:
- **Environment Setup**: Installing Rust, Cairo, Scarb, and various CLI tools can be time-consuming and error-prone.
- **Complexity**: The flow of `Cairo -> Sierra -> CASM -> Declare -> Deploy` is complex for beginners.
- **Gas Friction**: Requiring ETH or STRK for every testnet deployment slows down prototyping.
- **Fragmented UI**: After deployment, developers often have to manually connect their contracts to a UI or use generic explorers.

### Key Features
- **Integrated IDE**: A professional, CodeMirror-based editor with Cairo syntax highlighting and real-time diagnostics.
- **Zero-Install Compiler**: A dedicated "sidecar" compiler service that handles compilation in the cloud.
- **Gasless Deployment**: Sponsored declarations and deployments via the Starkzap SDK and AVNU Paymaster.
- **Universal Interaction UI**: Automatically generated frontend for any deployed contract based on its ABI.
- **Wallet Abstraction**: Support for social login (Google/Discord) and embedded wallets via Privy, alongside ArgentX and Braavos.

### Target Users
- **Web3 Developers**: Quickly prototype and test Cairo contracts without context-switching.
- **Beginners**: Learn Starknet concepts by doing, with guided flows and visual feedback.
- **Hackathon Builders**: Deploy end-to-end dApps in minutes instead of hours.

---

## 2. Getting Started

Welcome to Unzap! This guide will help you get up and running with your first Starknet contract in minutes.

### Prerequisites
To use Unzap Contract Lab, you only need:
1. **A Modern Browser**: Chrome, Brave, or Firefox are recommended.
2. **A Starknet Wallet** (Optional but recommended):
   - **ArgentX** or **Braavos** extension.
   - Alternatively, you can use **Privy social login** (Google, Discord, etc.) to generate an embedded wallet instantly.

### Accessing the Platform

#### Local Setup
1.  **Clone the repository**: `git clone https://github.com/manovHacksaw/Unzap.git`
2.  **Install dependencies**: `bun install`
3.  **Setup Environment Variables**: Create a `.env.local` file (see README.md for details).
4.  **Run the studio**: `bun dev`
5.  **Open**: `http://localhost:3000/studio/contract-lab`

### Quickstart: Deploy your first contract in < 10 minutes

1.  **Select a Template**: Click the "Templates" dropdown and select **"Hello Unzap"**.
2.  **Compile**: Press `Ctrl + S`. Check the terminal for build logs.
3.  **Deploy**: Once compiled, click **"Deploy Contract"** in the sidebar. Use the sponsored flow for a gasless experience.
4.  **Interact**: Use the auto-generated **Interaction UI** to call your contract's functions instantly.

---

## 3. Core Concepts

### 1. Templates
Templates are pre-written Cairo contracts like **ERC20**, **Counter**, and **Voting**. They allow you to skip the boilerplate and focus on learning logic.

### 2. Cairo Contracts
Unzap supports **Cairo 1.0**, featuring strong typing, **Sierra** intermediate representation, and **CASM** machine code.

### 3. Gasless Deployment (Starkzap SDK)
- **Paymaster**: Uses **AVNU Paymaster** to sponsor transaction fees.
- **UDC**: Contracts are deployed via the Universal Deployer Contract for deterministic addresses.
- **Sponsored Declaration**: Studio-sponsored bytecode uploads for common templates.

### 4. Contract → Frontend Pipeline
1.  **ABI Parsing**: Automatic reading of JSON ABI.
2.  **UI Generation**: Mapping Cairo types to React components.
3.  **Interaction Panel**: Live "Read/Write" tabs for testing.

---

## 4. Usage Guide

### 4.1 Create Contract
Use the **Template Selector** and the **CodeMirror 6** editor. Enjoy real-time diagnostics and auto-saving to local storage.

### 4.2 Compile
When you click **"Build & Compile"**, your code is sent to a **Dockerized Rust Sidecar** that runs `starknet-compile` and returns Sierra/CASM artifacts.

### 4.3 Deploy
- **Declaration**: Unzap skips this if the class is already on-chain.
- **Constructor**: Input initial parameters directly in the UI.
- **Sponsorship**: Select "Sponsored" to let Unzap handle the fees via AVNU.

### 4.4 Frontend Generation
The "Interact" panel provides **ABI Awareness**, **Input Validation**, and **Real-time Logs** for every function call.

---

## 5. Example Workflow

### End-to-End: The Counter dApp
1.  **Select Template**: Choose "Counter".
2.  **Build**: `Ctrl + S`. See `[SUCCESS] Artifacts generated` in terminal.
3.  **Deploy**: Connect wallet and click "Deploy (Gasless)".
4.  **Interact**:
    - "Read" `get_count` -> returns `0`.
    - "Write" `increment`.
    - "Read" `get_count` -> returns `1`.
5.  **History**: View transaction details in the sidebar.

---

## 6. Advanced Usage

### Custom Contract Modifications
- **External Libraries**: Import modules like OpenZeppelin.
- **Events**: Add `#[event]` and track them in the Execution Terminal.

### Extending the Generated Frontend
1.  **Copy ABI** from the Build Artifacts tab.
2.  **Install SDK**: `npm install @starkzap/sdk`.
3.  **Connect**: Use the SDK to interact with your deployed contract address in a custom Next.js app.

### Debugging Failed Deployments
- Check **Class Declaration** status.
- Review **Constructor Logic**.
- Monitor **Gas Limits** if using a local wallet.

---

## 7. Architecture

### High-Level System Design
Unzap separates concerns between the **Next.js Frontend**, the **Dockerized Compiler Sidecar**, and the **Starknet Blockchain**.

### Core Components
1.  **The IDE**: Manages state in `localStorage`, uses `Starknet.js` and `Starkzap SDK`.
2.  **The Sidecar**: Cloud-based Cairo compilation for consistent environments.
3.  **Starknet Layer**: Uses UDC for deployment and AVNU for gasless sponsorship.
4.  **Privy**: Abstracted wallet layer supporting social logins and embedded accounts.

---

## 8. FAQ & Troubleshooting

### Common Errors
- **"Compiler Service Unreachable"**: Check `NEXT_PUBLIC_COMPILER_URL` or Docker status.
- **"Class already declared"**: Safe to ignore; Unzap will proceed to deployment.
- **"Transaction Rejected"**: Check the Execution Terminal for the revert reason.
- **"Wallet not found"**: Ensure ArgentX/Braavos is installed or log in via Privy.

### FAQ
- **Is it free?** Yes, sponsored testnet deployments are free.
- **Mainnet support?** Coming soon; currently focused on Sepolia.
- **Where is code stored?** Only in your browser's `localStorage`.

---

**Still having issues?** Open an issue on our [GitHub Repository](https://github.com/manovHacksaw/Unzap/issues).
