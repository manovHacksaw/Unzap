import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { walletId, hash } = await req.json();
  if (!walletId || !hash) {
    return NextResponse.json({ error: 'Missing walletId or hash' }, { status: 400 });
  }

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  const appSecret = process.env.PRIVY_APP_SECRET!;
  const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString('base64');

  const privyRes = await fetch(`https://api.privy.io/v1/wallets/${walletId}/raw_sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basicAuth}`,
      'privy-app-id': appId,
    },
    body: JSON.stringify({ params: { hash } }),
  });

  const data = await privyRes.json();
  if (!privyRes.ok) {
    return NextResponse.json(
      { error: (data as { error?: string }).error ?? 'Signing failed' },
      { status: privyRes.status }
    );
  }

  return NextResponse.json({ signature: (data as { data: { signature: string } }).data.signature });
}
