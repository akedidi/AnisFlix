import * as fs from 'fs';
import * as path from 'path';

// Base URL for channel logos
const LOGO_BASE_URL = 'https://jaruba.github.io/channel-logos/export/transparent-color';

// Mapping of channel names to their keys in the logo_paths.json
const CHANNEL_LOGO_MAPPING: Record<string, string> = {
    // France - Généraliste
    'TF1': 'tf1',
    'France 2': 'france 2',
    'France 3': 'france 3',
    'France 4': 'france 4',
    'France 5': 'france 5',
    'M6': 'm6',
    'Arte': 'arte',
    'Canal+': 'canal+',
    'TMC': 'tmc',
    'W9': 'w9',

    // France - Info
    'BFM TV': 'bfmtv',
    'France Info': 'franceinfo',
    'LCI': 'lci',
    'CNEWS': 'cnews',
    'BFM Business': 'bfm business',
    'BFM Paris': 'bfm paris',
    'BFM Lyon': 'bfm lyon',
    'RT France': 'rt france',

    // Sport
    "L'Équipe TV": 'lequipe tv',

    // Jeunesse
    'Gulli': 'gulli',
    'Cartoon Network': 'cartoon network',
    'Boomerang': 'boomerang',

    // Arabe
    'ElJazira': 'al jazeera',
    'ElJazira English': 'al jazeera english',
    'RT Arabe': 'rt',
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
    const tvChannelsPath = path.join(process.cwd(), 'api', 'tv-channels.ts');
    let content = fs.readFileSync(tvChannelsPath, 'utf-8');

    let updatedCount = 0;
    let notFoundCount = 0;
    const notFound: string[] = [];

    // For each channel in our mapping, try to update its logo
    for (const [channelName, logoKey] of Object.entries(CHANNEL_LOGO_MAPPING)) {
        const logoPath = logosPaths[logoKey.toLowerCase()];

        if (logoPath) {
            const fullLogoUrl = `${LOGO_BASE_URL}${logoPath}`;

            // Find the channel in the content and update its logo
            // This is a simple regex replacement - you may need to adjust based on actual content structure
            const channelRegex = new RegExp(
                `(name:\\s*"${channelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}",\\s*logo:\\s*)"[^"]*"`,
                'g'
            );

            if (channelRegex.test(content)) {
                content = content.replace(channelRegex, `$1"${fullLogoUrl}"`);
                updatedCount++;
                console.log(`✓ Updated ${channelName} -> ${fullLogoUrl}`);
            } else {
                console.log(`⚠ Could not find channel structure for: ${channelName}`);
            }
        } else {
            notFoundCount++;
            notFound.push(channelName);
            console.log(`✗ Logo not found for: ${channelName} (key: "${logoKey}")`);
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
