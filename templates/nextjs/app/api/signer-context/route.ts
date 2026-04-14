import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const STORE_PATH = join(process.cwd(), '.wallet-store.json');

function loadStore(): Record<string, string> {
  if (!existsSync(STORE_PATH)) return {};
  try { return JSON.parse(readFileSync(STORE_PATH, 'utf-8')); }
  catch { return {}; }
}

function saveStore(store: Record<string, string>) {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
}

async function privyFetch(path: string, options: RequestInit = {}) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  const appSecret = process.env.PRIVY_APP_SECRET!;
  const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
  return fetch(`https://api.privy.io${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basicAuth}`,
      'privy-app-id': appId,
      ...(options.headers ?? {}),
    },
  });
}

export async function POST(req: Request) {
  const token = req.headers.get('Authorization')?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

  try {
    const payload = decodeJwtPayload(token);
    const userDid = payload.sub as string;
    if (!userDid) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const store = loadStore();
    let walletId = store[userDid];

    if (!walletId) {
      const createRes = await privyFetch('/v1/wallets', {
        method: 'POST',
        body: JSON.stringify({ chain_type: 'starknet' }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        return NextResponse.json({ error: (err as any).message ?? 'Failed to create wallet' }, { status: 500 });
      }
      const created = await createRes.json();
      walletId = created.id;
      store[userDid] = walletId;
      saveStore(store);
    }

    const walletRes = await privyFetch(`/v1/wallets/${walletId}`);
    if (!walletRes.ok) return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });

    const wallet = await walletRes.json();
    const origin = new URL(req.url).origin;

    return NextResponse.json({
      walletId: wallet.id,
      publicKey: wallet.public_key,
      serverUrl: `${origin}/api/wallet/sign`,
    });
  } catch {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
