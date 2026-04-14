import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const { walletId, hash } = await req.json();
  if (!walletId || !hash) {
    return NextResponse.json({ error: 'Missing walletId or hash' }, { status: 400 });
  }

  const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString('base64');

  try {
    const privyRes = await fetch(`https://api.privy.io/v1/wallets/${walletId}/raw_sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
        'privy-app-id': appId,
      },
      body: JSON.stringify({ params: { hash } }),
    });

    if (!privyRes.ok) {
      const data = await privyRes.json().catch(() => ({}));
      console.error('Privy sign error:', data);
      return NextResponse.json(
        { error: 'Signing failed' },
        { status: privyRes.status }
      );
    }

    const data = await privyRes.json();
    return NextResponse.json({ signature: (data as { data: { signature: string } }).data.signature });
  } catch (err) {
    console.error('Wallet sign exception:', err);
    return NextResponse.json({ error: 'Internal signing error' }, { status: 500 });
  }
}
