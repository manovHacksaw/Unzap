import { PrivyClient } from "@privy-io/server-auth";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;

if (!appId || !appSecret) {
  console.warn("[privy] NEXT_PUBLIC_PRIVY_APP_ID or PRIVY_APP_SECRET is not set — auth endpoints will fail.");
}

export const privy = new PrivyClient(
  appId ?? "placeholder",
  appSecret ?? "placeholder"
);
