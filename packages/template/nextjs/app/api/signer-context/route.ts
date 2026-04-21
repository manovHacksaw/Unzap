import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs';
import { join } from 'path';
import { PrivyClient } from '@privy-io/server-auth';

const STORE_PATH = join(process.cwd(), '.wallet-store.json');
const STORE_LOCK_PATH = join(process.cwd(), '.wallet-store.lock');

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

function loadStore(): Record<string, string> {
  if (!existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveStoreAtomic(store: Record<string, string>) {
  const tempPath = `${STORE_PATH}.${Date.now()}.tmp`;
  try {
    writeFileSync(tempPath, JSON.stringify(store, null, 2));
    renameSync(tempPath, STORE_PATH);
  } catch (e) {
    console.error('Failed to save store atomically:', e);
    throw new Error('Storage error');
  }
}

async function privyFetch(path: string, options: RequestInit = {}) {
  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    throw new Error('Privy credentials not configured');
  }
  const basicAuth = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64');
  return fetch(`https://api.privy.io${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basicAuth}`,
      'privy-app-id': PRIVY_APP_ID,
      ...(options.headers ?? {}),
    },
  });
}

export async function POST(req: Request) {
  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured: Missing Privy credentials' }, { status: 500 });
  }

  const token = req.headers.get('Authorization')?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

  try {
    const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    const verifiedClaims = await privy.verifyAuthToken(token);
    const userDid = verifiedClaims.userId;

    if (!userDid) return NextResponse.json({ error: 'Invalid token claims' }, { status: 401 });

    // Use a simple lock file for mutual exclusion during read-modify-write
    let lockAcquired = false;
    for (let i = 0; i < 10; i++) {
       try {
         if (!existsSync(STORE_LOCK_PATH)) {
           writeFileSync(STORE_LOCK_PATH, String(process.pid));
           lockAcquired = true;
           break;
         }
       } catch {}
       await new Promise(r => setTimeout(r, 50));
    }

    try {
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
        saveStoreAtomic(store);
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
    } finally {
      if (lockAcquired) {
         try { renameSync(STORE_LOCK_PATH, `${STORE_LOCK_PATH}.old`); } catch {} // Basic unlock
         if (existsSync(STORE_LOCK_PATH)) { /* cleanup if rename failed */ }
      }
    }
  } catch (err) {
    console.error('Signer context error:', err);
    return NextResponse.json({ error: 'Auth failed or storage error' }, { status: 500 });
  }
}
