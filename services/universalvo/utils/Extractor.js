import { extract_streamwish } from '../extractors/streamwish.js';
import { ErrorObject } from '../helpers/ErrorObject.js';
import { extract_streamtape } from '../extractors/streamtape.js';

const streamwish =
    /(?:\/\/|\.)((…|ajmidyad|atabkhha|atabknha|atabknhk|atabknhs|abkrzkr|abkrzkz|vidmoviesb|kharabnahs|hayaatieadhab|cilootv|tuktukcinema|doodporn|ankrzkz|volvovideo|strmwis|ankrznm|yadmalik|khadhnayad|eghjrutf|eghzrutw|playembed|egsyxurh|egtpgrvh|uqloads|javsw|cinemathek|trgsfjll|fsdcmo|anime4low|mohahhda|ma2d|dancima|swhoi|gsfqzmqu|jodwish|swdyu|katomen|iplayerhls|hlsflast|4yftwvrdz7|ghbrisk)\.(?:com|to|sbs|pro|xyz|store|top|site|online|me|shop|fun))(?:\/e\/|\/f\/|\/d\/)?([0-9a-zA-Z$:\/.]+)/;
const streamtape =
    /(?:\/\/|\.)((?:s(?:tr)?(?:eam|have)?|tapewith|watchadson)?(?:adblock(?:er|plus)?|antiad|noads)?(?:ta?p?e?|cloud)?(?:blocker|advertisement|adsenjoyer)?\.(?:com|cloud|net|pe|site|link|cc|online|fun|cash|to|xyz|org|wiki|club|tech))\/(?:e|v)\/([0-9a-zA-Z]+)/;

export async function extract(url, DOMAIN = '') {
    if (streamwish.test(url)) {
        let result = await extract_streamwish(url, DOMAIN);
        if (result instanceof ErrorObject) {
            return result;
        }
        // extract_streamwish returns a string URL, not an object
        return {
            file: result,
            type: 'hls',
            extractor: 'streamwish'
        };
    } else if (streamtape.test(url)) {
        let data = await extract_streamtape(url);
        if (data instanceof ErrorObject) {
            return data;
        }
        return {
            file: data.file || data.url,
            type: 'mp4',
            extractor: 'streamtape'
        };
    }

    // if (process.argv.includes('--debug')) {
    //     console.log(
    //         `[extractor] ${url} (${DOMAIN}) is not a supported server... maybe check this out!`
    //     );
    // }
    return new ErrorObject(
        'No extractor found',
        'Extractor',
        500,
        'No extractor found matching for this URL: ' + url,
        true,
        true
    );
}
