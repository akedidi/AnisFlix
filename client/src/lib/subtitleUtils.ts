export function srtToVtt(srtContent: string): string {
    // Replace commas with dots in timestamps (SRT uses 00:00:00,000, VTT uses 00:00:00.000)
    let vtt = "WEBVTT\n\n" + srtContent
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

    return vtt;
}

export async function fetchAndConvertSubtitle(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch subtitle');
        const srtText = await response.text();
        const vttText = srtToVtt(srtText);
        const blob = new Blob([vttText], { type: 'text/vtt' });
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Error converting subtitle:', error);
        return null;
    }
}
