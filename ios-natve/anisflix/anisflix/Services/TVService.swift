//
//  TVService.swift
//  anisflix
//
//  Created by AI Assistant on 28/11/2025.
//

import Foundation

class TVService {
    static let shared = TVService()
    
    private init() {}
    
    // Cache for Jaruba logos
    private var jarubaLogos: [String: String] = [:]
    private var areLogosLoaded = false
    
    // Base URL for Proxy
    private let baseUrl = "https://anisflix.vercel.app"
    
    // MARK: - Mappings (from Web)
    
    private let channelNameMapping: [String: String] = [
        // Généraliste
        "tf1": "tf1",
        "france2": "france 2",
        "france3": "france 3",
        "france4": "france 4",
        "france5": "france 5",
        "m6": "m6",
        "arte": "arte",
        "tfx": "tfx",
        "canal-plus": "canal+",
        "tmc": "tmc",
        "w9": "w9",
        "rmc-decouverte": "rmc découverte",
        "gulli": "gulli",
        
        // Info
        "bfmtv": "bfm tv",
        "bfm-business": "bfm business",
        "bfm-paris": "bfm paris",
        "bfm-lyon": "bfm lyon",
        "bfm-litoral": "bfm grand littoral",
        "bfm-alsace": "bfm alsace",
        "bfm-grand-lille": "bfm grand lille",
        "rt-france": "rt france",
        
        // Sport
        "bein-sports-1": "bein sports 1",
        "bein-sports-2": "bein sports 2",
        "bein-sports-3": "bein sports 3",
        "canal-plus-foot": "canal+ foot",
        "canal-plus-sport-360": "canal+ sport 360",
        "rmc-sport-1": "rmc sport 1",
        "rmc-sport-2": "rmc sport 2",
        "rmc-sport-3": "rmc sport 3",
        "lequipe-tv": "l'équipe tv",
        
        // Fiction & Série
        "syfy": "syfy",
        
        // Jeunesse
        "game-one": "game one",
        "mangas": "mangas",
        "boomerang": "boomerang",
        "cartoon-network": "cartoon network",
        
        // Découverte
        "natgeo": "national geographic",
        "natgeo-wild": "national geographic wild",
        
        // Cinéma
        "tcm-cinema": "tcm cinema",
        
        // Arabe - Sport
        "elkass-1": "elkass 1",
        "elkass-2": "elkass 2",
        "elkass-3": "elkass 3",
        "elkass-4": "elkass 4",
        "elkass-6": "elkass 4", // Using default Alkass logo or similar
        "bein-sports-1-ar": "bein sports 1",
        "bein-sports-2-ar": "bein sports 2",
        "bein-sports-3-ar": "bein sports 3",
        "bein-sports-5-ar": "bein sports 5",
        "bein-sports-6-ar": "bein sports 5", // Fallback to 5 logo

        
        // Arabe - Tunisie
        "watania-1": "watania 1",
        "hiwar-tounsi": "hiwar tounsi",
        
        // Arabe - Info
        "eljazira": "al jazeera",
        "eljazira-english": "al jazeera english",
        "rt-arabe": "rt arabic",
        "elarabiya": "al arabiya"
    ]
    
    private let localChannelLogos: [String: String] = [:]
    
    // MARK: - Channels Data (Exact copy from Web)
    
    private var channels: [TVChannel] = [
        // ===== SECTION FRANCE =====
        
        // Généraliste
        TVChannel(id: "tf1", name: "TF1", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "mpd", url: "https://viamotionhsi.netplus.ch/live/eds/tf1hd/browser-dash/tf1hd.mpd"),
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/87.m3u8")
        ]),
        TVChannel(id: "tf1-serie", name: "TF1 Serie", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/hd1/browser-HLS8/hd1.m3u8")
        ]),
        TVChannel(id: "france2", name: "France 2", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/137.m3u8")
        ]),
        TVChannel(id: "france3", name: "France 3", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/france3hd/browser-HLS8/france3hd.m3u8"),
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/138.m3u8")
        ]),
        TVChannel(id: "france4", name: "France 4", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://raw.githubusercontent.com/ipstreet312/freeiptv/master/ressources/ftv/py/fr4.m3u8")
        ]),
        TVChannel(id: "france5", name: "France 5", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://simulcast-p.ftven.fr/ZXhwPTE3NjA3ODM0NjF+YWNsPSUyZip+aG1hYz0wMTMyZjkyODNmZTQ5OGM4M2MwMDY4OGFkYjg1ODA5OGNkMmE0OWYwZjZkMTlhZGNlNjZlNzU5ZWMzMmYyYzAx/simulcast/France_5/hls_fr5/France_5-avc1_2500000=5.m3u8")
        ]),
        TVChannel(id: "m6", name: "M6", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/m6hd/browser-HLS8/m6hd.m3u8"),
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/102.m3u8")
        ]),
        TVChannel(id: "arte", name: "Arte", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master_v720.m3u8")
        ]),
        TVChannel(id: "tfx", name: "TFX", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/nt1/browser-HLS8/nt1.m3u8"),
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/77.m3u8")
        ]),
        TVChannel(id: "canal-plus", name: "Canal+", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/106.m3u8")
        ]),
        TVChannel(id: "tmc", name: "TMC", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/78.m3u8")
        ]),
        TVChannel(id: "w9", name: "W9", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/w9/browser-HLS8/w9.m3u8"),
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/79.m3u8")
        ]),
        TVChannel(id: "rmc-decouverte", name: "RMC Découverte", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/90.m3u8")
        ]),
        TVChannel(id: "gulli", name: "Gulli", logo: "", streamUrl: "", category: "France", group: "Généraliste", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://viamotionhsi.netplus.ch/live/eds/gulli/browser-HLS8/gulli.m3u8")
        ]),
        
        // Info
        TVChannel(id: "bfmtv", name: "BFM TV", logo: "", streamUrl: "", category: "France", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://live-cdn-stream-euw1.bfmtv.bct.nextradiotv.com/master.m3u8")
        ]),
        TVChannel(id: "bfm-business", name: "BFM Business", logo: "", streamUrl: "", category: "France", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_BUSINESS/index.m3u8?start=LIVE&end=END")
        ]),
        TVChannel(id: "bfm-paris", name: "BFM Paris", logo: "", streamUrl: "", category: "France", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://www.viously.com/video/hls/G86AvlqLgXj/index.m3u8")
        ]),
        TVChannel(id: "bfm-lyon", name: "BFM Lyon", logo: "", streamUrl: "", category: "France", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_LYON/index.m3u8?start=LIVE&end=END")
        ]),
        TVChannel(id: "bfm-litoral", name: "BFM Litoral", logo: "", streamUrl: "", category: "France", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFMGRANDLITTORAL/index.m3u8?start=LIVE&end=END")
        ]),
        TVChannel(id: "bfm-alsace", name: "BFM Alsace", logo: "", streamUrl: "", category: "France", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFM_ALSACE/index.m3u8?start=LIVE&end=END")
        ]),
        TVChannel(id: "bfm-grand-lille", name: "BFM Grand Lille", logo: "", streamUrl: "", category: "France", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://ncdn-live-bfm.pfd.sfr.net/shls/LIVE$BFMGRANDLILLE/index.m3u8?start=LIVE&end=END")
        ]),
        TVChannel(id: "rt-france", name: "RT France", logo: "", streamUrl: "", category: "France", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://rt-fra.rttv.com/live/rtfrance/playlist.m3u8")
        ]),
        
        // Sport
        TVChannel(id: "bein-sports-1", name: "Bein Sports 1", logo: "", streamUrl: "", category: "France", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/44.m3u8")
        ]),
        TVChannel(id: "bein-sports-2", name: "Bein Sports 2", logo: "", streamUrl: "", category: "France", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/49.m3u8")
        ]),
        TVChannel(id: "bein-sports-3", name: "Bein Sports 3", logo: "", streamUrl: "", category: "France", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/50.m3u8")
        ]),
        TVChannel(id: "canal-plus-foot", name: "Canal+ Foot", logo: "", streamUrl: "", category: "France", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/88.m3u8")
        ]),
        TVChannel(id: "canal-plus-sport-360", name: "Canal+ Sport 360", logo: "", streamUrl: "", category: "France", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/58.m3u8")
        ]),
        TVChannel(id: "rmc-sport-1", name: "RMC Sport 1", logo: "", streamUrl: "", category: "France", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/33.m3u8")
        ]),
        TVChannel(id: "rmc-sport-2", name: "RMC Sport 2", logo: "", streamUrl: "", category: "France", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/40.m3u8")
        ]),
        TVChannel(id: "rmc-sport-3", name: "RMC Sport 3", logo: "", streamUrl: "", category: "France", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/42.m3u8")
        ]),
        TVChannel(id: "lequipe-tv", name: "L'Équipe TV", logo: "", streamUrl: "", category: "France", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://live2.eu-north-1b.cf.dmcdn.net/sec2(ermuWFoalFOnbKlK1xFl5N6-RFs8TR8ytC0BN_948kQeziLQ1-fkqkfWedz6vwq2pV6cqOmVPXuHrmkEOQaWFwzk0ey6_-rMEdaMlm0fB0xLwngtrfO1pgJlnMjnpi2h)/cloud/3/x2lefik/d/live-720.m3u8")
        ]),
        
        // Fiction & Série
        TVChannel(id: "syfy", name: "Syfy", logo: "", streamUrl: "", category: "France", group: "Fiction & Série", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/91.m3u8")
        ]),
        
        // Jeunesse
        TVChannel(id: "game-one", name: "Game One", logo: "", streamUrl: "", category: "France", group: "Jeunesse", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/104.m3u8")
        ]),
        TVChannel(id: "mangas", name: "Mangas", logo: "", streamUrl: "", category: "France", group: "Jeunesse", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/97.m3u8")
        ]),
        TVChannel(id: "boomerang", name: "Boomerang", logo: "", streamUrl: "", category: "France", group: "Jeunesse", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/180.m3u8")
        ]),
        TVChannel(id: "cartoon-network", name: "Cartoon Network", logo: "", streamUrl: "", category: "France", group: "Jeunesse", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/76.m3u8")
        ]),
        
        // Découverte
        TVChannel(id: "natgeo", name: "National Geographic Channel", logo: "", streamUrl: "", category: "France", group: "Découverte", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/81.m3u8")
        ]),
        TVChannel(id: "natgeo-wild", name: "National Geographic Wild", logo: "", streamUrl: "", category: "France", group: "Découverte", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/82.m3u8")
        ]),
        
        // Cinéma
        TVChannel(id: "tcm-cinema", name: "TCM Cinema", logo: "", streamUrl: "", category: "France", group: "Cinéma", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://fremtv.lol/live/5A24C0D16059EDCC6A20E0CE234C7A25/95.m3u8")
        ]),
        
        // ===== SECTION ARABE =====
        
        // Sport
        TVChannel(id: "bein-sports-1-ar", name: "Bein Sports 1 (Ar)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/BeIN_SPORTS_1_logo.svg/100px-BeIN_SPORTS_1_logo.svg.png", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_1.m3u8")
        ]),
        TVChannel(id: "bein-sports-2-ar", name: "Bein Sports 2 (Ar)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/BeIN_SPORTS_2_logo.svg/100px-BeIN_SPORTS_2_logo.svg.png", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_2.m3u8")
        ]),
        TVChannel(id: "bein-sports-3-ar", name: "Bein Sports 3 (Ar)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/BeIN_SPORTS_3_logo.svg/100px-BeIN_SPORTS_3_logo.svg.png", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_3.m3u8")
        ]),
        TVChannel(id: "bein-sports-4-ar", name: "Bein Sports 4 (Ar)", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/BeIN_SPORTS_4_logo.svg/100px-BeIN_SPORTS_4_logo.svg.png", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_4.m3u8")
        ]),
        TVChannel(id: "bein-sports-5-ar", name: "Bein Sports 5 (Ar)", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1a/BeIN_SPORTS_5_logo.png", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_5.m3u8")
        ]),
        TVChannel(id: "bein-sports-6-ar", name: "Bein Sports 6 (Ar)", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1a/BeIN_SPORTS_5_logo.png", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_6.m3u8")
        ]),
        TVChannel(id: "bein-sports-7-ar", name: "Bein Sports 7 (Ar)", logo: "https://upload.wikimedia.org/wikipedia/commons/ed/e2/Bein_Espanol.png", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_7.m3u8")
        ]),
        TVChannel(id: "bein-sports-8-ar", name: "Bein Sports 8 (Ar)", logo: "https://upload.wikimedia.org/wikipedia/commons/ed/e2/Bein_Espanol.png", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_8.m3u8")
        ]),
        TVChannel(id: "bein-sports-9-ar", name: "Bein Sports 9 (Ar)", logo: "https://upload.wikimedia.org/wikipedia/commons/ed/e2/Bein_Espanol.png", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://py.dencreak.com/bn_u_576P_9.m3u8")
        ]),

        TVChannel(id: "elkass-1", name: "ElKass 1", logo: "", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://liveeu-gcp.alkassdigital.net/alkass1-p/20251112T070231Z/mux_video_720p_ts/index-1.m3u8")
        ]),
        TVChannel(id: "elkass-2", name: "ElKass 2", logo: "", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://liveeu-gcp.alkassdigital.net/alkass2-p/20251112T071253Z/mux_video_720p_ts/index-1.m3u8")
        ]),
        TVChannel(id: "elkass-3", name: "ElKass 3", logo: "", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://liveeu-gcp.alkassdigital.net/alkass3-p/20251112T072756Z/mux_video_720p_ts/index-1.m3u8")
        ]),
        TVChannel(id: "elkass-4", name: "ElKass 4", logo: "", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://liveeu-gcp.alkassdigital.net/alkass4-p/main.m3u8")
        ]),
        TVChannel(id: "elkass-6", name: "ElKass 6", logo: "", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_segments", url: "https://liveeu-gcp.alkassdigital.net/alkass6-p/20251112T064254Z/mux_video_720p_ts/index-1.m3u8")
        ]),
        TVChannel(id: "dubai-sports-1", name: "Dubai Sports 1", logo: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Dubai_Sports_logo.png", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://dmidspta.cdn.mgmlcdn.com/dubaisports/smil:dubaisports.stream.smil/chunklist.m3u8")
        ]),
        TVChannel(id: "dubai-sports-2", name: "Dubai Sports 2", logo: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Dubai_Sports_logo.png", streamUrl: "", category: "Arab", group: "Sport", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://dmitwlvvll.cdn.mangomolo.com/dubaisportshd/smil:dubaisportshd.smil/chunklist.m3u8")
        ]),
        
        // Tunisie
        TVChannel(id: "watania-1", name: "Watania 1", logo: "", streamUrl: "", category: "Arab", group: "Tunisie", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://games2.elahmad.xyz/tv769_www.elahmad.com_watania1/index.m3u8?token=b9d0297eeef834aa66b673fe97e0b29d246eee83-0f18c0ac40653414b0a06c98a6a28998-1765511168-1765500368")
        ]),
        TVChannel(id: "hiwar-tounsi", name: "Hiwar Tounsi", logo: "", streamUrl: "", category: "Arab", group: "Tunisie", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://live20.bozztv.com/akamaissh101/ssh101/venolie-hiwar/playlist.m3u8")
        ]),
        
        // Info
        TVChannel(id: "eljazira", name: "ElJazira", logo: "", streamUrl: "", category: "Arab", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://live-hls-web-aja.getaj.net/AJA/04.m3u8")
        ]),
        TVChannel(id: "eljazira-english", name: "ElJazira English", logo: "", streamUrl: "", category: "Arab", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://live-hls-web-aje.getaj.net/AJE/04.m3u8")
        ]),
        TVChannel(id: "rt-arabe", name: "RT Arabe", logo: "", streamUrl: "", category: "Arab", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://rt-arb.rttv.com/live/rtarab/playlist.m3u8")
        ]),
        TVChannel(id: "elarabiya", name: "ElAarabiya", logo: "", streamUrl: "", category: "Arab", group: "Info", epgId: nil, links: [
            TVChannelLink(type: "hls_direct", url: "https://shls-live-ak.akamaized.net/out/v1/f5f319206ed740f9a831f2097c2ead23/index_37.m3u8")
        ])
    ]
    
    // MARK: - Methods
    
    
    // MARK: - API Methods
    
    func fetchSections() async throws -> [TVSection] {
        let url = URL(string: "\(baseUrl)/api/tv-channels")!
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(TVChannelsResponse.self, from: data)
        return response.sections
    }
    
    func fetchChannels() async throws -> [TVChannel] {
        let sections = try await fetchSections()
        
        // Convert API response to flat channel list
        var allChannels: [TVChannel] = []
        for section in sections {
            for category in section.categories {
                for apiChannel in category.channels {
                    let channel = TVChannel(
                        id: apiChannel.id,
                        name: apiChannel.name,
                        logo:apiChannel.logo ?? "",
                        streamUrl: "", // Deprecated
                        category: section.id, // Using section.id as category
                        group: category.name,
                        epgId: nil,
                        links: apiChannel.links
                    )
                    allChannels.append(channel)
                }
            }
        }
        
        return allChannels
    }
    
    func fetchGroups(category: String) async throws -> [TVGroup] {
        let sections = try await fetchSections()
        
        // Find the section matching the category
        guard let section = sections.first(where: { $0.id == category.lowercased() }) else {
            return []
        }
        
        // Convert categories to groups
        var groups: [TVGroup] = []
        for category in section.categories {
            let channels = category.channels.map { apiChannel in
                TVChannel(
                    id: apiChannel.id,
                    name: apiChannel.name,
                    logo: apiChannel.logo ?? "",
                    streamUrl: "", // Deprecated
                    category: section.id,
                    group: category.name,
                    epgId: nil,
                    links: apiChannel.links
                )
            }
            groups.append(TVGroup(id: category.id, name: category.name, channels: channels))
        }
        
        return groups
    }
    
    
    func searchChannels(query: String) async -> [TVChannel] {
        guard !query.isEmpty else { return [] }
        let lowerQuery = query.lowercased()
        
        // Fetch from API
        let allChannels = (try? await fetchChannels()) ?? []
        return allChannels.filter { $0.name.lowercased().contains(lowerQuery) }
    }
    
    // MARK: - Proxy & Link Logic
    
    func getFilteredLinks(for channel: TVChannel) -> [TVChannelLink] {
        guard let links = channel.links else { return [] }
        // On iOS (Native), filter out MPD, keep only HLS
        return links.filter { $0.type != "mpd" }
    }
    
    func getProxyUrl(originalUrl: String, type: String) -> String {
        // For hls_segments, ALWAYS use the proxy
        if type == "hls_segments" {
            // Extract channel ID from fremtv.lol URLs
            // Regex: /\/live\/[^\/]+\/(\d+)\.m3u8/
            if let regex = try? NSRegularExpression(pattern: "/live/[^/]+/(\\d+)\\.m3u8"),
               let match = regex.firstMatch(in: originalUrl, range: NSRange(originalUrl.startIndex..., in: originalUrl)),
               let range = Range(match.range(at: 1), in: originalUrl) {
                let channelId = String(originalUrl[range])
                return "\(baseUrl)/api/media-proxy?channelId=\(channelId)"
            }
        }
        
        // For hls_direct, use DIRECT URL (matching Web/Capacitor logic)
        // The web app uses direct URLs for hls_direct on Capacitor.
        // We only proxy hls_segments.
        if type == "hls_direct" {
            return originalUrl
        }
        
        return originalUrl
    }
    
    // MARK: - Logo Logic
    
    private func loadLogos() async {
        do {
            let url = URL(string: "https://jaruba.github.io/channel-logos/logo_paths.json")!
            let (data, _) = try await URLSession.shared.data(from: url)
            let rawLogos = try JSONDecoder().decode([String: String].self, from: data)
            // Normalize keys to lowercase for case-insensitive lookup
            var normalizedLogos: [String: String] = [:]
            for (key, value) in rawLogos {
                normalizedLogos[key.lowercased()] = value
            }
            jarubaLogos = normalizedLogos
            areLogosLoaded = true
        } catch {
            print("Error loading Jaruba logos: \(error)")
        }
    }
    
    private func getLogoUrl(for channelId: String) -> String? {
        // 1. Check local logos
        if let localLogo = localChannelLogos[channelId] {
            return localLogo
        }
        
        // 2. Check Jaruba mapping
        guard let mappedName = channelNameMapping[channelId] else { return nil }
        
        // 3. Check Jaruba logos
        if let logoPath = jarubaLogos[mappedName.lowercased()] {
            return "https://jaruba.github.io/channel-logos/export/transparent-color\(logoPath)"
        }
        
        return nil
    }
}
