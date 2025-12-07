import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TVChannelLink {
    type: 'mpd' | 'hls_direct' | 'hls_segments';
    url: string;
}

interface TVChannel {
    id: string;
    name: string;
    logo?: string;
    links: TVChannelLink[];
}

interface TVCategory {
    id: string;
    name: string;
    channels: TVChannel[];
}

interface TVSection {
    id: string;
    name: string;
    categories: TVCategory[];
}

interface TVChannelsResponse {
    sections: TVSection[];
}

// Data extracted from TVChannels.tsx
const TV_CHANNELS_DATA: TVChannelsResponse = {
    sections: [
        {
            id: "france",
            name: "France",
            categories: [
                {
                    id: "generaliste",
                    name: "Généraliste",
                    channels: [
                        {
                            id: "tf1",
                            name: "TF1",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/TF1_logo_2013.svg/120px-TF1_logo_2013.svg.png",
                            links: [
                                { type: "mpd", url: "https://viamotionhsi.netplus.ch/live/eds/tf1hd/browser-dash/tf1hd.mpd" },
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/87.m3u8" }
                            ]
                        },
                        {
                            id: "tf1-serie",
                            name: "TF1 Serie",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/TF1_S%C3%A9ries_Films_logo_2018.svg/200px-TF1_S%C3%A9ries_Films_logo_2018.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/hd1/browser-HLS8/hd1.m3u8" }
                            ]
                        },
                        {
                            id: "france2",
                            name: "France 2",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/France_2_2018.svg/120px-France_2_2018.svg.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/137.m3u8" }
                            ]
                        },
                        {
                            id: "france3",
                            name: "France 3",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/France_3_2018.svg/120px-France_3_2018.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/france3hd/browser-HLS8/france3hd.m3u8" },
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/138.m3u8" }
                            ]
                        },
                        {
                            id: "france4",
                            name: "France 4",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/France_4_2018.svg/200px-France_4_2018.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://raw.githubusercontent.com/ipstreet312/freeiptv/master/ressources/ftv/py/fr4.m3u8" }
                            ]
                        },
                        {
                            id: "france5",
                            name: "France 5",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/France_5_2018.svg/200px-France_5_2018.svg.png",
                            links: [
                                { type: "hls_segments", url: "https://simulcast-p.ftven.fr/ZXhwPTE3NjA3ODM0NjF~YWNsPSUyZip~aG1hYz0wMTMyZjkyODNmZTQ5OGM4M2MwMDY4OGFkYjg1ODA5OGNkMmE0OWYwZjZkMTlhZGNlNjZlNzU5ZWMzMmYyYzAx/simulcast/France_5/hls_fr5/France_5-avc1_2500000=5.m3u8" }
                            ]
                        },
                        {
                            id: "m6",
                            name: "M6",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/M6_logo_2018.svg/120px-M6_logo_2018.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/m6hd/browser-HLS8/m6hd.m3u8" },
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/102.m3u8" }
                            ]
                        },
                        {
                            id: "arte",
                            name: "Arte",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Arte_Logo_2016.svg/120px-Arte_Logo_2016.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8" }
                            ]
                        },
                        {
                            id: "tfx",
                            name: "TFX",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/TFX_logo_2018.svg/200px-TFX_logo_2018.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/nt1/browser-HLS8/nt1.m3u8" },
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/77.m3u8" }
                            ]
                        },
                        {
                            id: "canal-plus",
                            name: "Canal+",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Canal%2B_logo_2018.svg/120px-Canal%2B_logo_2018.svg.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/106.m3u8" }
                            ]
                        },
                        {
                            id: "tmc",
                            name: "TMC",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/TMC_logo_2016.svg/200px-TMC_logo_2016.svg.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/78.m3u8" }
                            ]
                        },
                        {
                            id: "w9",
                            name: "W9",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/W9_logo_2018.svg/120px-W9_logo_2018.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/w9/browser-HLS8/w9.m3u8" },
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/79.m3u8" }
                            ]
                        },
                        {
                            id: "rmc-decouverte",
                            name: "RMC Découverte",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/RMC_D%C3%A9couverte_logo_2017.svg/200px-RMC_D%C3%A9couverte_logo_2017.svg.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/90.m3u8" }
                            ]
                        },
                        {
                            id: "gulli",
                            name: "Gulli",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Gulli_logo_2018.svg/120px-Gulli_logo_2018.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/gulli/browser-HLS8/gulli.m3u8" }
                            ]
                        }
                    ]
                },
                {
                    id: "info",
                    name: "Info",
                    channels: [
                        {
                            id: "bfmtv",
                            name: "BFM TV",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/BFM_TV_logo_2018.svg/120px-BFM_TV_logo_2018.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://live-cdn-stream-euw1.bfmtv.bct.nextradiotv.com/master.m3u8" }
                            ]
                        },
                        {
                            id: "bfm-business",
                            name: "BFM Business",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/BFM_Business_logo_2019.svg/200px-BFM_Business_logo_2019.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_BUSINESS/index.m3u8?start=LIVE&end=END" }
                            ]
                        },
                        {
                            id: "bfm-paris",
                            name: "BFM Paris",
                            links: [
                                { type: "hls_direct", url: "https://www.viously.com/video/hls/G86AvlqLgXj/index.m3u8" }
                            ]
                        },
                        {
                            id: "bfm-lyon",
                            name: "BFM Lyon",
                            links: [
                                { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_LYON/index.m3u8?start=LIVE&end=END" }
                            ]
                        },
                        {
                            id: "bfm-litoral",
                            name: "BFM Litoral",
                            links: [
                                { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFMGRANDLITTORAL/index.m3u8?start=LIVE&end=END" }
                            ]
                        },
                        {
                            id: "bfm-alsace",
                            name: "BFM Alsace",
                            links: [
                                { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_ALSACE/index.m3u8?start=LIVE&end=END" }
                            ]
                        },
                        {
                            id: "bfm-grand-lille",
                            name: "BFM Grand Lille",
                            links: [
                                { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFMGRANDLILLE/index.m3u8?start=LIVE&end=END" }
                            ]
                        },
                        {
                            id: "rt-france",
                            name: "RT France",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Russia-today-logo.svg/200px-Russia-today-logo.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://rt-fra.rttv.com/live/rtfrance/playlist.m3u8" }
                            ]
                        }
                    ]
                },
                {
                    id: "sport",
                    name: "Sport",
                    channels: [
                        {
                            id: "bein-sports-1",
                            name: "Bein Sports 1",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/BeIN_Sports_logo_%282017%29.png/200px-BeIN_Sports_logo_%282017%29.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/44.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-2",
                            name: "Bein Sports 2",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/49.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-3",
                            name: "Bein Sports 3",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/50.m3u8" }
                            ]
                        },
                        {
                            id: "canal-plus-foot",
                            name: "Canal+ Foot",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/88.m3u8" }
                            ]
                        },
                        {
                            id: "canal-plus-sport-360",
                            name: "Canal+ Sport 360",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/58.m3u8" }
                            ]
                        },
                        {
                            id: "rmc-sport-1",
                            name: "RMC Sport 1",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/33.m3u8" }
                            ]
                        },
                        {
                            id: "rmc-sport-2",
                            name: "RMC Sport 2",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/40.m3u8" }
                            ]
                        },
                        {
                            id: "rmc-sport-3",
                            name: "RMC Sport 3",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/42.m3u8" }
                            ]
                        },
                        {
                            id: "lequipe-tv",
                            name: "L'Équipe TV",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/L%27%C3%89quipe_logo.svg/200px-L%27%C3%89quipe_logo.svg.png",
                            links: [
                                { type: "hls_segments", url: "https://live2.eu-north-1b.cf.dmcdn.net/sec2(ermuWFoalFOnbKlK1xFl5N6-RFs8TR8ytC0BN_948kQeziLQ1-fkqkfWedz6vwq2pV6cqOmVPXuHrmkEOQaWFwzk0ey6_-rMEdaMlm0fB0xLwngtrfO1pgJlnMjnpi2h)/cloud/3/x2lefik/d/live-720.m3u8" }
                            ]
                        }
                    ]
                },
                {
                    id: "fiction-serie",
                    name: "Fiction & Série",
                    channels: [
                        {
                            id: "syfy",
                            name: "Syfy",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/91.m3u8" }
                            ]
                        }
                    ]
                },
                {
                    id: "jeunesse",
                    name: "Jeunesse",
                    channels: [
                        {
                            id: "game-one",
                            name: "Game One",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/104.m3u8" }
                            ]
                        },
                        {
                            id: "mangas",
                            name: "Mangas",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/97.m3u8" }
                            ]
                        },
                        {
                            id: "boomerang",
                            name: "Boomerang",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/180.m3u8" }
                            ]
                        },
                        {
                            id: "cartoon-network",
                            name: "Cartoon Network",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/76.m3u8" }
                            ]
                        }
                    ]
                },
                {
                    id: "decouverte",
                    name: "Découverte",
                    channels: [
                        {
                            id: "natgeo",
                            name: "National Geographic Channel",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/National_Geographic_Channel.svg/200px-National_Geographic_Channel.svg.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/81.m3u8" }
                            ]
                        },
                        {
                            id: "natgeo-wild",
                            name: "National Geographic Wild",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/82.m3u8" }
                            ]
                        }
                    ]
                },
                {
                    id: "cinema",
                    name: "Cinéma",
                    channels: [
                        {
                            id: "tcm-cinema",
                            name: "TCM Cinema",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/95.m3u8" }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "arabe",
            name: "Arabe",
            categories: [
                {
                    id: "sport",
                    name: "Sport",
                    channels: [
                        {
                            id: "elkass-1",
                            name: "ElKass 1",
                            links: [
                                { type: "hls_direct", url: "https://streamer3.qna.org.qa/148164621_live/148164621_296.sdp/playlist.m3u8" }
                            ]
                        },
                        {
                            id: "elkass-2",
                            name: "ElKass 2",
                            links: [
                                { type: "hls_direct", url: "https://streamer3.qna.org.qa/148164528_live/148164528_296.sdp/playlist.m3u8" }
                            ]
                        },
                        {
                            id: "elkass-3",
                            name: "ElKass 3",
                            links: [
                                { type: "hls_direct", url: "https://streamer2.qna.org.qa/148161470_live/148161470_296.sdp/playlist.m3u8" }
                            ]
                        },
                        {
                            id: "elkass-4",
                            name: "ElKass 4",
                            links: [
                                { type: "hls_direct", url: "https://streamer3.qna.org.qa/148164621_live/148164621_296.sdp/playlist.m3u8" }
                            ]
                        }
                    ]
                },
                {
                    id: "tunisie",
                    name: "Tunisie",
                    channels: [
                        {
                            id: "watania-1",
                            name: "Watania 1",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/tunisienationale/browser-HLS8/tunisienationale.m3u8" }
                            ]
                        },
                        {
                            id: "hiwar-tounsi",
                            name: "Hiwar Tounsi",
                            links: [
                                { type: "hls_direct", url: "https://live20.bozztv.com/akamaissh101/ssh101/venolie-hiwar/playlist.m3u8" }
                            ]
                        }
                    ]
                },
                {
                    id: "info",
                    name: "Info",
                    channels: [
                        {
                            id: "eljazira",
                            name: "ElJazira",
                            logo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/71/Aljazeera.svg/200px-Aljazeera.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://live-hls-web-aja.getaj.net/AJA/04.m3u8" }
                            ]
                        },
                        {
                            id: "eljazira-english",
                            name: "ElJazira English",
                            links: [
                                { type: "hls_direct", url: "https://live-hls-web-aje.getaj.net/AJE/04.m3u8" }
                            ]
                        },
                        {
                            id: "rt-arabe",
                            name: "RT Arabe",
                            links: [
                                { type: "hls_direct", url: "https://rt-arb.rttv.com/live/rtarab/playlist.m3u8" }
                            ]
                        },
                        {
                            id: "elarabiya",
                            name: "ElAarabiya",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Al_Arabiya.svg/200px-Al_Arabiya.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://shls-live-ak.akamaized.net/out/v1/f5f319206ed740f9a831f2097c2ead23/index_37.m3u8" }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Cache for 1 hour
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

        return res.status(200).json(TV_CHANNELS_DATA);
    } catch (error) {
        console.error('[API ERROR]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
