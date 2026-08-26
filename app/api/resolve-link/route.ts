import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  let currentUrl = url.trim();
  if (!/^https?:\/\//i.test(currentUrl)) {
    currentUrl = 'https://' + currentUrl;
  }

  try {
    let redirectCount = 0;
    const maxRedirects = 10;
    let finalUrl = currentUrl;

    while (redirectCount < maxRedirects) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        clearTimeout(timeout);

        const loc = response.headers.get('location') || response.headers.get('Location');
        if (!loc) {
          finalUrl = currentUrl;
          break;
        }

        let absoluteLoc = currentUrl;
        try {
          absoluteLoc = new URL(loc, currentUrl).toString();
        } catch {
          if (/^https?:\/\//i.test(loc)) {
            absoluteLoc = loc;
          } else {
            finalUrl = currentUrl;
            break;
          }
        }
        currentUrl = absoluteLoc;
        finalUrl = absoluteLoc;
        redirectCount++;

        if (response.status < 300 || response.status >= 400) {
          break;
        }
      } catch (err) {
        clearTimeout(timeout);
        if (redirectCount > 0) {
          break;
        }
        throw err;
      }
    }

    return NextResponse.json({ 
      url: finalUrl,
      finalUrl: finalUrl
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ 
      error: err.message || 'Failed to resolve URL' 
    }, { status: 500 });
  }
}
