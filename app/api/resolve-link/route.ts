import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeout);

    const locationHeader = response.headers.get('location') || response.headers.get('Location');

    if (locationHeader) {
      return NextResponse.json({ 
        url: locationHeader,
        finalUrl: locationHeader
      });
    }

    return NextResponse.json({ 
      error: 'No redirect location found' 
    }, { status: 404 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ 
      error: err.message || 'Failed to resolve URL' 
    }, { status: 500 });
  }
}
