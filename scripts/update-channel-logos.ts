import * as fs from 'fs';
import * as path from 'path';

// Base URL for channel logos
const LOGO_BASE_URL = 'https://jaruba.github.io/channel-logos/export/transparent-color';

// Mapping of channel IDs to their keys in the logo_paths.json
const CHANNEL_LOGO_MAPPING: Record<string, string> = {
    // France - Généraliste
    'tf1': 'tf1',
    'france2': 'france 2',
    'france3': 'france 3',
    'france4': 'france 4',
    'france5': 'france 5',
    'm6': 'm6',
    'arte': 'arte',
    'canal': 'canal+',
    'tmc': 'tmc',
    'w9': 'w9',

    // France - Info
    'bfmtv': 'bfmtv',
    'franceinfo': 'franceinfo',
    'lci': 'lci',
    'cnews': 'cnews',
    'bfm-business': 'bfm business',
    'bfm-paris': 'bfm paris',
    'bfm-lyon': 'bfm lyon',
    'rt-france': 'rt france',

    // Sport
    'lequipe-tv': 'lequipe tv',

    // Jeunesse
    'gulli': 'gulli',
    'cartoon-network': 'cartoon network',
    'boomerang': 'boomerang',

    // Arabe
    'eljazira': 'al jazeera',
    'eljazira-english': 'al jazeera english',
    'rt-arabe': 'rt',
};

async function fetchLogosPaths(): Promise<Record<string, string>> {
    const response = await fetch('https://jaruba.github.io/channel-logos/logo_paths.json');
    if (!response.ok) {
        throw new Error(`Failed to fetch logos: ${response.statusText}`);
    }
    return await response.json();
}

async function updateChannelLogos() {
    console.log('Fetching channel logos data...');
    const logosPaths = await fetchLogosPaths();

    console.log(`Found ${Object.keys(logosPaths).length} logos`);

    // Read the current tv-channels.ts file
    const tvChannelsPath = path.join(process.cwd(), 'api', 'channels.ts');
    let content = fs.readFileSync(tvChannelsPath, 'utf-8');

    let updatedCount = 0;
    let notFoundCount = 0;
    const notFound: string[] = [];

    // For each channel in our mapping, try to update its logo
    for (const [channelId, logoKey] of Object.entries(CHANNEL_LOGO_MAPPING)) {
        const logoPath = logosPaths[logoKey.toLowerCase()];

        if (logoPath) {
            const fullLogoUrl = `${LOGO_BASE_URL}${logoPath}`;

            // Match by ID for exact matching - this prevents "tf1" from matching "tf1-serie"
            // Pattern: id: "channelId", ... logo: "..."
            const channelRegex = new RegExp(
                `(id:\\s*"${channelId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}",\\s*[^}]*?logo:\\s*)"[^"]*"`,
                's'
            );

            if (channelRegex.test(content)) {
                content = content.replace(channelRegex, `$1"${fullLogoUrl}"`);
                updatedCount++;
                console.log(`✓ Updated ${channelId} -> ${fullLogoUrl}`);
            } else {
                console.log(`⚠ Could not find channel structure for ID: ${channelId}`);
            }
        } else {
            notFoundCount++;
            notFound.push(channelId);
            console.log(`✗ Logo not found for: ${channelId} (key: "${logoKey}")`);
        }
    }

    // Write the updated content back to the file
    fs.writeFileSync(tvChannelsPath, content, 'utf-8');

    console.log('\n=== Summary ===');
    console.log(`Updated: ${updatedCount} channels`);
    console.log(`Not found: ${notFoundCount} channels`);

    if (notFound.length > 0) {
        console.log('\nChannels without logos:');
        notFound.forEach(name => console.log(`  - ${name}`));
    }
}

// Run the update
updateChannelLogos().catch(console.error);
