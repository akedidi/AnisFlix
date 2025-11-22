import { getMovieStream } from "@/lib/movix";

export interface Subtitle {
    id: string;
    url: string;
    lang: string;
    label: string;
    flag: string;
}

const LANGUAGE_FLAGS: Record<string, string> = {
    fre: "🇫🇷",
    eng: "🇬🇧",
    spa: "🇪🇸",
    ger: "🇩🇪",
    ita: "🇮🇹",
    por: "🇵🇹",
    rus: "🇷🇺",
    tur: "🇹🇷",
    ara: "🇸🇦",
    chi: "🇨🇳",
    jpn: "🇯🇵",
    kor: "🇰🇷",
    dut: "🇳🇱",
    pol: "🇵🇱",
    swe: "🇸🇪",
    dan: "🇩🇰",
    fin: "🇫🇮",
    nor: "🇳🇴",
    cze: "🇨🇿",
    hun: "🇭🇺",
    rom: "🇷🇴",
    bul: "🇧🇬",
    gre: "🇬🇷",
    heb: "🇮🇱",
    tha: "🇹🇭",
    vie: "🇻🇳",
    ind: "🇮🇩",
    may: "🇲🇾",
    per: "🇮🇷",
    ukr: "🇺🇦",
    hrv: "🇭🇷",
    srp: "🇷🇸",
    slv: "🇸🇮",
    slk: "🇸🇰",
    lit: "🇱🇹",
    lav: "🇱🇻",
    est: "🇪🇪",
};

const LANGUAGE_NAMES: Record<string, string> = {
    fre: "Français",
    eng: "Anglais",
    spa: "Espagnol",
    ger: "Allemand",
    ita: "Italien",
    por: "Portugais",
    rus: "Russe",
    tur: "Turc",
    ara: "Arabe",
    chi: "Chinois",
    jpn: "Japonais",
    kor: "Coréen",
    dut: "Néerlandais",
    pol: "Polonais",
    swe: "Suédois",
    dan: "Danois",
    fin: "Finnois",
    nor: "Norvégien",
    cze: "Tchèque",
    hun: "Hongrois",
    rom: "Roumain",
    bul: "Bulgare",
    gre: "Grec",
    heb: "Hébreu",
    tha: "Thaï",
    vie: "Vietnamien",
    ind: "Indonésien",
    may: "Malais",
    per: "Persan",
    ukr: "Ukrainien",
    hrv: "Croate",
    srp: "Serbe",
    slv: "Slovène",
    slk: "Slovaque",
    lit: "Lituanien",
    lav: "Letton",
    est: "Estonien",
};

export async function getSubtitles(
    imdbId: string,
    type: "movie" | "series",
    season?: number,
    episode?: number
): Promise<Subtitle[]> {
    try {
        let url = "";
        if (type === "movie") {
            url = `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`;
        } else {
            if (!season || !episode) throw new Error("Season and episode required for series");
            url = `https://opensubtitles-v3.strem.io/subtitles/series/${imdbId}:${season}:${episode}.json`;
        }

        console.log(`🔍 [OpenSubtitles] Fetching subtitles from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`⚠️ [OpenSubtitles] Failed to fetch subtitles: ${response.status}`);
            return [];
        }

        const data = await response.json();
        if (!data.subtitles || !Array.isArray(data.subtitles)) {
            return [];
        }

        const subtitles: Subtitle[] = data.subtitles.map((sub: any) => {
            const lang = sub.lang; // e.g., "fre", "eng"
            const flag = LANGUAGE_FLAGS[lang] || "🏳️";
            const label = LANGUAGE_NAMES[lang] || lang;

            return {
                id: sub.id,
                url: sub.url,
                lang: lang,
                label: label,
                flag: flag,
            };
        });

        // Sorting logic:
        // 1. French (fre)
        // 2. English (eng)
        // 3. Others alphabetically
        subtitles.sort((a, b) => {
            if (a.lang === "fre" && b.lang !== "fre") return -1;
            if (a.lang !== "fre" && b.lang === "fre") return 1;
            if (a.lang === "eng" && b.lang !== "eng") return -1;
            if (a.lang !== "eng" && b.lang === "eng") return 1;
            return a.label.localeCompare(b.label);
        });

        // Add "Off" option at the beginning is handled in the UI component usually, 
        // but we return the list of available subtitles here.

        console.log(`✅ [OpenSubtitles] Found ${subtitles.length} subtitles`);
        return subtitles;
    } catch (error) {
        console.error("❌ [OpenSubtitles] Error fetching subtitles:", error);
        return [];
    }
}
