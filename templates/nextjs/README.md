# {{PASCAL_NAME}} — Unzap Generated dApp

```bash
npm install
cp .env.example .env.local   # fill in your keys, then:
npm run dev
```

## Integrations

All integrations are pre-wired. Set the env var and restart the dev server.

| Feature | Env var | What it does |
|---------|---------|-------------|
| Extension wallets | — | Argent X / Braavos work with zero config |
| Privy social login | `NEXT_PUBLIC_PRIVY_APP_ID` + `PRIVY_APP_SECRET` | Email / Google / Twitter login |
| Gasless transactions | `NEXT_PUBLIC_AVNU_API_KEY` | Privy write hooks use AVNU paymaster via StarkZap |
| Custom RPC | `NEXT_PUBLIC_RPC_URL` | Override the default Starknet RPC endpoint |

**Privy:** Once the app ID and secret are set, the social login button opens the
Privy modal. After auth, StarkZap creates/restores a Starknet embedded wallet.
Write hooks on the Privy path call `szWallet.execute(calls, { feeMode: 'sponsored' })`
so the user pays no gas. See `providers/privy-wrapper.tsx`.
