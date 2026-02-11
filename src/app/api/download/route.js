import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        const blob = await response.blob();
        const headers = new Headers();

        // Extract filename from URL or use default
        const urlObj = new URL(imageUrl);
        const filename = urlObj.pathname.split('/').pop() || 'render.png';

        headers.set('Content-Type', blob.type || 'image/png');
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);

        return new NextResponse(blob, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('[Download API] Error:', error);
        return NextResponse.json({ error: 'Failed to download image' }, { status: 500 });
    }
}
