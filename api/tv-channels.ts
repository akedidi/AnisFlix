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
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/fqsd09CrijoGu6qfoNIdgUQmVGO.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/tf1hd/browser-HLS8/tf1hd.m3u8" },
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/87.m3u8" }
                            ]
                        },
                        {
                            id: "france2",
                            name: "France 2",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/b1cFa5FcHHnpejKiPybXSPcqKjT.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/france2hd/browser-HLS8/france2hd.m3u8" }
                            ]
                        },
                        {
                            id: "france3",
                            name: "France 3",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/1ePfTUHHvBlVQxa0Fltx5kWhIs5.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/france3hd/browser-HLS8/france3hd.m3u8" }
                            ]
                        },
                        {
                            id: "france4",
                            name: "France 4",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/9v9Mink1IVxPNRZOmCZ8N58BOHe.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/france4hd/browser-HLS8/france4hd.m3u8" }
                            ]
                        },
                        {
                            id: "france5",
                            name: "France 5",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/8xK6AdNT6PfRyygRvb2MKCoqrv2.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/france5hd/browser-HLS8/france5hd.m3u8" }
                            ]
                        },
                        {
                            id: "m6",
                            name: "M6",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/ebCZs9U5Kq1GqOFBT1tlH1lZd8p.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/m6hd/browser-HLS8/m6hd.m3u8" }
                            ]
                        },
                        {
                            id: "arte",
                            name: "Arte",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/6UIpEURdjnmcJPwgTDRzVRuwADr.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/artehd/browser-HLS8/artehd.m3u8" }
                            ]
                        },
                        {
                            id: "canal",
                            name: "Canal+",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/n7BRwMvmF2xaSAH8PfJzacrhOU8.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/106.m3u8" }
                            ]
                        },
                        {
                            id: "tmc",
                            name: "TMC",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/mG8AujLo1qacorLWNXqHqMCxlPM.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/tmc/browser-HLS8/tmc.m3u8" }
                            ]
                        },
                        {
                            id: "tf1-serie",
                            name: "TF1 Serie",
                            logo: "https://upload.wikimedia.org/wikipedia/fr/thumb/4/4b/TF1_S%C3%A9ries_Films_logo_2020.svg/512px-TF1_S%C3%A9ries_Films_logo_2020.svg.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/hd1/browser-HLS8/hd1.m3u8" }
                            ]
                        },
                        {
                            id: "w9",
                            name: "W9",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/e5TTp11V850EmQjoeoTd93NyDHS.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/w9/browser-HLS8/w9.m3u8" },
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/79.m3u8" }
                            ]
                        },
                        {
                            id: "rmc-decouverte",
                            name: "RMC Découverte",
                            logo: "https://upload.wikimedia.org/wikipedia/fr/archive/b/b3/20180115173144%21RMC_D%C3%A9couverte_logo_2017.svg",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/90.m3u8" }
                            ]
                        },
                        {
                            id: "gulli",
                            name: "Gulli",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/4b8ZM73YKqFCJLbQB70Pyw5wQCK.png",
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
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/49jOrcvbD94I5xOAUch2ShVWXK1.png",
                            links: [
                                { type: "hls_direct", url: "https://live-cdn-stream-euw1.bfmtv.bct.nextradiotv.com/master.m3u8" }
                            ]
                        },
                        {
                            id: "franceinfo",
                            name: "France Info",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/0/03/Franceinfo.svg",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/franceinfo/browser-HLS8/franceinfo.m3u8" }
                            ]
                        },
                        {
                            id: "lci",
                            name: "LCI",
                            logo: "https://upload.wikimedia.org/wikipedia/fr/8/85/LCI.png",
                            links: [
                                {
                                    type: "hls_direct",
                                    url: "https://viamotionhsi.netplus.ch/live/eds/lci/browser-HLS8/lci.m3u8"
                                },
                                {
                                    type: "hls_direct",
                                    url: "https://live-lci.akamaized.net/hls/live/2038765/lci/master.m3u8"
                                },
                                {
                                    type: "mpd",
                                    url: "https://viamotionhsi.netplus.ch/live/eds/lci/browser-dash/lci.mpd"
                                }
                            ]
                        },
                        {
                            id: "cnews",
                            name: "CNEWS",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Canal_News_logo.svg",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/itele/browser-HLS8/itele.m3u8" }
                            ]
                        },
                        {
                            id: "bfm-business",
                            name: "BFM Business",
                            logo: "https://upload.wikimedia.org/wikipedia/fr/2/22/Logo_BFM_Business.svg",
                            links: [
                                { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_BUSINESS/index.m3u8?start=LIVE&end=END" }
                            ]
                        },
                        {
                            id: "bfm-paris",
                            name: "BFM Paris",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/7/79/Logo_BFM_Paris_2022.svg",
                            links: [
                                { type: "hls_direct", url: "https://www.viously.com/video/hls/G86AvlqLgXj/index.m3u8" }
                            ]
                        },
                        {
                            id: "bfm-lyon",
                            name: "BFM Lyon",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/0/00/Logo_BFM_Lyon_%282022%29.png",
                            links: [
                                { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_LYON/index.m3u8?start=LIVE&end=END" }
                            ]
                        },
                        {
                            id: "bfm-litoral",
                            name: "BFM Litoral",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Logo_BFM_Grand_Littoral.svg",
                            links: [
                                { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFMGRANDLITTORAL/index.m3u8?start=LIVE&end=END" }
                            ]
                        },
                        {
                            id: "bfm-alsace",
                            name: "BFM Alsace",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Logo_BFM_Alsace.svg",
                            links: [
                                { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_ALSACE/index.m3u8?start=LIVE&end=END" }
                            ]
                        },
                        {
                            id: "bfm-grand-lille",
                            name: "BFM Grand Lille",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Logo_BFM_Grand_Lille.svg",
                            links: [
                                { type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFMGRANDLILLE/index.m3u8?start=LIVE&end=END" }
                            ]
                        },
                        {
                            id: "rt-france",
                            name: "RT France",
                            logo: "https://upload.wikimedia.org/wikipedia/fr/9/9e/RT_France.svg",
                            links: [
                                { type: "hls_direct", url: "https://rt-fra.rttv.com/live/rtfrance/playlist.m3u8" }
                            ]
                        },
                        {
                            id: "france24",
                            name: "France 24",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/8/8a/France24.png",
                            links: [
                                { type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/france24/browser-HLS8/france24.m3u8" }
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
                            logo: "https://upload.wikimedia.org/wikipedia/fr/2/2f/BeIN_Sports_1_%282014%29.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/44.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-2",
                            name: "Bein Sports 2",
                            logo: "https://upload.wikimedia.org/wikipedia/fr/5/55/BeIN_Sports_2_%282014%29.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/49.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-3",
                            name: "Bein Sports 3",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/e/e9/BeIN_Sports_3_HD.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/50.m3u8" }
                            ]
                        },
                        {
                            id: "canal-plus-foot",
                            name: "Canal+ Foot",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/e/eb/Canal%2BFoot.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/88.m3u8" }
                            ]
                        },
                        {
                            id: "canal-plus-sport-360",
                            name: "Canal+ Sport 360",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/6/64/Canal%2BSport_360.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/58.m3u8" }
                            ]
                        },
                        {
                            id: "rmc-sport-1",
                            name: "RMC Sport 1",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Logo_RMC_Sport_1_2018.svg",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/33.m3u8" }
                            ]
                        },
                        {
                            id: "rmc-sport-2",
                            name: "RMC Sport 2",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Logo_RMC_Sport_2_2018.svg",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/40.m3u8" }
                            ]
                        },
                        {
                            id: "rmc-sport-3",
                            name: "RMC Sport 3",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/7/71/Logo_RMC_Sport_3_2018.svg",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/42.m3u8" }
                            ]
                        },
                        {
                            id: "lequipe-tv",
                            name: "L'Équipe TV",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/9/9b/La_cha%C3%AEne_l%27Equipe_-_logo_2016.png",
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
                            logo: "https://upload.wikimedia.org/wikipedia/commons/3/34/Syfy.svg",
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
                            logo: "https://upload.wikimedia.org/wikipedia/fr/a/a0/Game_One_%281998%29_Logo.svg",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/104.m3u8" }
                            ]
                        },
                        {
                            id: "mangas",
                            name: "Mangas",
                            logo: "https://fr.wikipedia.org/wiki/Mangas#/media/Fichier:Logo-mangaschaine2022.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/97.m3u8" }
                            ]
                        },
                        {
                            id: "boomerang",
                            name: "Boomerang",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/4/41/Boomerang_tv_logo.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/180.m3u8" }
                            ]
                        },
                        {
                            id: "cartoon-network",
                            name: "Cartoon Network",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/8/80/Cartoon_Network_2010_logo.svg",
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
                            logo: "https://upload.wikimedia.org/wikipedia/commons/1/13/National_Geographic_Channel.svg",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/81.m3u8" }
                            ]
                        },
                        {
                            id: "natgeo-wild",
                            name: "National Geographic Wild",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/2/27/National_Geographic_Wild_logo.svg",
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
                            logo: "https://upload.wikimedia.org/wikipedia/commons/e/e3/TCM_Cin%C3%A9ma_logo_2019.png",
                            links: [
                                { type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/95.m3u8" }
                            ]
                        }
                    ]
                },
                {
                    id: "radio",
                    name: "Radio",
                    channels: [
                        {
                            id: "france-inter",
                            name: "France Inter",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/a/a0/France_Inter_logo_2021.svg",
                            links: [
                                { type: "hls_direct", url: "https://icecast.radiofrance.fr/franceinter-midfi.mp3" }
                            ]
                        },
                        {
                            id: "radio-nova",
                            name: "Radio Nova",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Radio_Nova_2024.svg",
                            links: [
                                { type: "hls_direct", url: "http://novazz.ice.infomaniak.ch/novazz-128.mp3" }
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
                            id: "bein-sports-1-ar",
                            name: "Bein Sports 1 (Ar)",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Logo_beIN_SPORTS_1.png",
                            links: [
                                { type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_1.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-2-ar",
                            name: "Bein Sports 2 (Ar)",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Logo_bein_sports_2.png",
                            links: [
                                { type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_2.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-3-ar",
                            name: "Bein Sports 3 (Ar)",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/c/c4/Logo_bein_sports_3.png",
                            links: [
                                { type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_3.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-4-ar",
                            name: "Bein Sports 4 (Ar)",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/9/96/Logo_bein_sports_4.png",
                            links: [
                                { type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_4.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-5-ar",
                            name: "Bein Sports 5 (Ar)",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Logo_BeinSports_5_MAX.svg",
                            links: [
                                { type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_5.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-6-ar",
                            name: "Bein Sports 6 (Ar)",
                            logo: "http://upload.wikimedia.org/wikipedia/commons/9/9a/Logo_BeinSports_6_MAX.svg",
                            links: [
                                { type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_6.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-7-ar",
                            name: "Bein Sports 7 (Ar)",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/1/19/Logo-Beinsports-7MAX.png",
                            links: [
                                { type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_7.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-8-ar",
                            name: "Bein Sports 8 (Ar)",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/6/65/Logo-Beinsports-8MAX.png",
                            links: [
                                { type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_8.m3u8" }
                            ]
                        },
                        {
                            id: "bein-sports-9-ar",
                            name: "Bein Sports 9 (Ar)",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/6/68/Logo-Beinsports-9MAX.png",
                            links: [
                                { type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_9.m3u8" }
                            ]
                        },
                        {
                            id: "elkass-1",
                            name: "ElKass 1",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/%D8%B4%D8%B9%D8%A7%D8%B1_%D9%82%D9%86%D9%88%D8%A7%D8%AA_%D8%A7%D9%84%D9%83%D8%A7%D8%B3.jpg",
                            links: [
                                { type: "hls_segments", url: "https://liveeu-gcp.alkassdigital.net/alkass1-p/20251112T070231Z/mux_video_720p_ts/index-1.m3u8" }
                            ]
                        },
                        {
                            id: "elkass-2",
                            name: "ElKass 2",
                            logo: "https://www.cne-eg.com/uploads/logos/20183142948397.png",
                            links: [
                                { type: "hls_segments", url: "https://liveeu-gcp.alkassdigital.net/alkass2-p/20251112T071253Z/mux_video_720p_ts/index-1.m3u8" }
                            ]
                        },
                        {
                            id: "elkass-3",
                            name: "ElKass 3",
                            logo: "https://www.cne-eg.com/uploads/logos/20183143127531.png",
                            links: [
                                { type: "hls_segments", url: "https://liveeu-gcp.alkassdigital.net/alkass3-p/20251112T072756Z/mux_video_720p_ts/index-1.m3u8" }
                            ]
                        },
                        {
                            id: "elkass-4",
                            name: "ElKass 4",
                            logo: "https://cne-eg.com/uploads/logos/20183142520385.png",
                            links: [
                                { type: "hls_segments", url: "https://liveeu-gcp.alkassdigital.net/alkass4-p/main.m3u8" }
                            ]
                        },
                        {
                            id: "elkass-6",
                            name: "ElKass 6",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/%D8%B4%D8%B9%D8%A7%D8%B1_%D9%82%D9%86%D9%88%D8%A7%D8%AA_%D8%A7%D9%84%D9%83%D8%A7%D8%B3.jpg",
                            links: [
                                { type: "hls_segments", url: "https://liveeu-gcp.alkassdigital.net/alkass6-p/20251112T064254Z/mux_video_720p_ts/index-1.m3u8" }
                            ]
                        },
                        {
                            id: "dubai-sports-1",
                            name: "Dubai Sports 1",
                            logo: "https://i.imgur.com/Poxw8lG.png",
                            links: [
                                { type: "hls_direct", url: "https://dmidspta.cdn.mgmlcdn.com/dubaisports/smil:dubaisports.stream.smil/chunklist.m3u8" }
                            ]
                        },
                        {
                            id: "dubai-sports-2",
                            name: "Dubai Sports 2",
                            logo: "https://i.postimg.cc/qRHqQ87Z/dubaisports2.png",
                            links: [
                                { type: "hls_direct", url: "https://dmitwlvvll.cdn.mangomolo.com/dubaisportshd/smil:dubaisportshd.smil/chunklist.m3u8" }
                            ]
                        },
                        {
                            id: "dubai-sports-3",
                            name: "Dubai Sports 3",
                            logo: "https://i.postimg.cc/hj8jYfz4/dubaisports3.png",
                            links: [
                                { type: "hls_direct", url: "https://dmitwlvvll.cdn.mgmlcdn.com/dubaisportshd5/smil:dubaisportshd5.smil/chunklist.m3u8" }
                            ]
                        },
                        {
                            id: "ad-sports-1",
                            name: "AD Sports 1",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Ad_sport_1.png",
                            links: [
                                { type: "hls_direct", url: "https://admn-live-cdn-lb.starzplayarabia.com/out/v1/admn_tv_enc/abudhabi_sports_1/abudhabi_sports_1_hls_nd/index.m3u8" }
                            ]
                        },
                        {
                            id: "ad-sports-2",
                            name: "AD Sports 2",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/5/5d/Ad_sport_2.jpg",
                            links: [
                                { type: "hls_direct", url: "https://admn-live-cdn-lb.starzplayarabia.com/out/v1/admn_tv_enc/abudhabi_sports_2/abudhabi_sports_2_hls_nd/index.m3u8" }
                            ]
                        },
                    ]
                },
                {
                    id: "tunisie",
                    name: "Tunisie",
                    channels: [
                        {
                            id: "watania-1",
                            name: "Watania 1",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/3/32/Watania_1.png",
                            links: [
                                { type: "hls_direct", url: "https://games2.elahmad.xyz/tv769_www.elahmad.com_watania1/index.m3u8?token=b9d0297eeef834aa66b673fe97e0b29d246eee83-0f18c0ac40653414b0a06c98a6a28998-1765511168-1765500368" }
                            ]
                        },
                        {
                            id: "hiwar-tounsi",
                            name: "Hiwar Tounsi",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/7/76/Hiwar_ettounsi_TV.png",
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
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/vtEHxJKWedfOLGoibApOrFBBTES.png",
                            links: [
                                { type: "hls_direct", url: "https://live-hls-web-aja.getaj.net/AJA/04.m3u8" }
                            ]
                        },
                        {
                            id: "eljazira-english",
                            name: "ElJazira English",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/9nAXtejiDQYqkeIWWk5eulSo2c.png",
                            links: [
                                { type: "hls_direct", url: "https://live-hls-web-aje.getaj.net/AJE/04.m3u8" }
                            ]
                        },
                        {
                            id: "rt-arabe",
                            name: "RT Arabe",
                            logo: "https://jaruba.github.io/channel-logos/export/transparent-color/1Jaw3XrH1YIljfYKzreC5vccham.png",
                            links: [
                                { type: "hls_direct", url: "https://rt-arb.rttv.com/live/rtarab/playlist.m3u8" }
                            ]
                        },
                        {
                            id: "elarabiya",
                            name: "ElAarabiya",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Al_Arabiya.svg",
                            links: [
                                { type: "hls_direct", url: "https://shls-live-ak.akamaized.net/out/v1/f5f319206ed740f9a831f2097c2ead23/index_37.m3u8" }
                            ]
                        },
                        {
                            id: "france24-arabe",
                            name: "France 24 Arabe",
                            logo: "https://upload.wikimedia.org/wikipedia/commons/8/8a/France24.png",
                            links: [
                                { type: "hls_direct", url: "https://live.france24.com/hls/live/2037222-b/F24_AR_HI_HLS/master_2300.m3u8" }
                            ]
                        }
                    ]
                },
                {
                    id: "radio",
                    name: "Radio",
                    channels: [
                        {
                            id: "mosaique-fm",
                            name: "Mosaïque FM",
                            logo: "https://upload.wikimedia.org/wikipedia/fr/2/26/Mosaique_fm_logo.png",
                            links: [
                                { type: "hls_direct", url: "https://webcam.mosaiquefm.net/mosatv/_definst_/studio/playlist.m3u8?DVR" }
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
