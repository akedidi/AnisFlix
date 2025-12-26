// src/anime-lib/extractors/search.extractor.js
import axios from "axios";
import * as cheerio from "cheerio";

// src/anime-lib/configs/header.config.js
var DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
};

// src/anime-lib/utils/base_v1.js
var v1_base_url = "hianime.to";

// src/anime-lib/routes/filter.maping.js
var FILTER_LANGUAGE_MAP = {
  ALL: "",
  SUB: "1",
  DUB: "2",
  SUB_DUB: "3"
};
var GENRE_MAP = {
  ACTION: "1",
  ADVENTURE: "2",
  CARS: "3",
  COMEDY: "4",
  DEMENTIA: "5",
  DEMONS: "6",
  DRAMA: "8",
  ECCHI: "9",
  FANTASY: "10",
  GAME: "11",
  HAREM: "35",
  HISTORICAL: "13",
  HORROR: "14",
  ISEKAI: "44",
  JOSEI: "43",
  KIDS: "15",
  MAGIC: "16",
  MARTIAL_ARTS: "17",
  MECHA: "18",
  MILITARY: "38",
  MUSIC: "19",
  MYSTERY: "7",
  PARODY: "20",
  POLICE: "39",
  PSYCHOLOGICAL: "40",
  ROMANCE: "22",
  SAMURAI: "21",
  SCHOOL: "23",
  SCI_FI: "24",
  SEINEN: "42",
  SHOUJO: "25",
  SHOUJO_AI: "26",
  SHOUNEN: "27",
  SHOUNEN_AI: "28",
  SLICE_OF_LIFE: "36",
  SPACE: "29",
  SPORTS: "30",
  SUPER_POWER: "31",
  SUPERNATURAL: "37",
  THRILLER: "41",
  VAMPIRE: "32"
};
var FILTER_TYPES = {
  ALL: "",
  MOVIE: "1",
  TV: "2",
  OVA: "3",
  ONA: "4",
  SPECIAL: "5",
  MUSIC: "6"
};
var FILTER_STATUS = {
  ALL: "",
  FINISHED: "1",
  CURRENTLY_AIRING: "2",
  NOT_YET_AIRED: "3"
};
var FILTER_RATED = {
  ALL: "",
  G: "1",
  PG: "2",
  PG_13: "3",
  R: "4",
  R_PLUS: "5",
  RX: "6"
};
var FILTER_SCORE = {
  ALL: "",
  APPALLING: "1",
  HORRIBLE: "2",
  VERY_BAD: "3",
  BAD: "4",
  AVERAGE: "5",
  FINE: "6",
  GOOD: "7",
  VERY_GOOD: "8",
  GREAT: "9",
  MASTERPIECE: "10"
};
var FILTER_SEASON = {
  ALL: "",
  SPRING: "1",
  SUMMER: "2",
  FALL: "3",
  WINTER: "4"
};
var FILTER_SORT = {
  DEFAULT: "default",
  RECENTLY_ADDED: "recently_added",
  RECENTLY_UPDATED: "recently_updated",
  SCORE: "score",
  NAME_AZ: "name_az",
  RELEASED_DATE: "released_date",
  MOST_WATCHED: "most_watched"
};

// src/anime-lib/extractors/search.extractor.js
async function extractSearchResults(params = {}) {
  try {
    const normalizeParam = (param, mapping) => {
      if (!param) return void 0;
      if (typeof param === "string") {
        const isAlreadyId = Object.values(mapping).includes(param);
        if (isAlreadyId) {
          return param;
        }
        const key = param.trim().toUpperCase();
        return mapping.hasOwnProperty(key) ? mapping[key] : void 0;
      }
      return param;
    };
    const typeParam = normalizeParam(params.type, FILTER_TYPES);
    const statusParam = normalizeParam(params.status, FILTER_STATUS);
    const ratedParam = normalizeParam(params.rated, FILTER_RATED);
    const scoreParam = normalizeParam(params.score, FILTER_SCORE);
    const seasonParam = normalizeParam(params.season, FILTER_SEASON);
    const sortParam = normalizeParam(params.sort, FILTER_SORT);
    let languageParam = params.language;
    if (languageParam != null) {
      languageParam = String(languageParam).trim().toUpperCase();
      languageParam = FILTER_LANGUAGE_MAP[languageParam] ?? (Object.values(FILTER_LANGUAGE_MAP).includes(languageParam) ? languageParam : void 0);
    }
    let genresParam = params.genres;
    if (typeof genresParam === "string") {
      genresParam = genresParam.split(",").map((genre) => GENRE_MAP[genre.trim().toUpperCase()] || genre.trim()).join(",");
    }
    const filteredParams = {
      type: typeParam,
      status: statusParam,
      rated: ratedParam,
      score: scoreParam,
      season: seasonParam,
      language: languageParam,
      genres: genresParam,
      sort: sortParam,
      page: params.page || 1,
      sy: params.sy || void 0,
      sm: params.sm || void 0,
      sd: params.sd || void 0,
      ey: params.ey || void 0,
      em: params.em || void 0,
      ed: params.ed || void 0,
      keyword: params.keyword || void 0
    };
    Object.keys(filteredParams).forEach((key) => {
      if (filteredParams[key] === void 0) {
        delete filteredParams[key];
      }
    });
    const queryParams = new URLSearchParams(filteredParams).toString();
    const resp = await axios.get(`https://${v1_base_url}/search?${queryParams}`, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent": DEFAULT_HEADERS
      }
    });
    const $ = cheerio.load(resp.data);
    const elements = "#main-content .film_list-wrap .flw-item";
    const totalPage = Number(
      $('.pre-pagination nav .pagination > .page-item a[title="Last"]')?.attr("href")?.split("=").pop() ?? $('.pre-pagination nav .pagination > .page-item a[title="Next"]')?.attr("href")?.split("=").pop() ?? $(".pre-pagination nav .pagination > .page-item.active a")?.text()?.trim()
    ) || 1;
    const result = [];
    $(elements).each((_, el) => {
      const id = $(el).find(".film-detail .film-name .dynamic-name")?.attr("href")?.slice(1).split("?ref=search")[0] || null;
      result.push({
        id,
        data_id: $(el).find(".film-poster .film-poster-ahref").attr("data-id"),
        title: $(el).find(".film-detail .film-name .dynamic-name")?.text()?.trim(),
        japanese_title: $(el).find(".film-detail .film-name .dynamic-name")?.attr("data-jname")?.trim() || null,
        poster: $(el).find(".film-poster .film-poster-img")?.attr("data-src")?.trim() || null,
        duration: $(el).find(".film-detail .fd-infor .fdi-item.fdi-duration")?.text()?.trim(),
        tvInfo: {
          showType: $(el).find(".film-detail .fd-infor .fdi-item:nth-of-type(1)").text().trim() || "Unknown",
          rating: $(el).find(".film-poster .tick-rate")?.text()?.trim() || null,
          sub: Number(
            $(el).find(".film-poster .tick-sub")?.text()?.trim().split(" ").pop()
          ) || null,
          dub: Number(
            $(el).find(".film-poster .tick-dub")?.text()?.trim().split(" ").pop()
          ) || null,
          eps: Number(
            $(el).find(".film-poster .tick-eps")?.text()?.trim().split(" ").pop()
          ) || null
        }
      });
    });
    return [parseInt(totalPage, 10), result.length > 0 ? result : []];
  } catch (e) {
    console.error(e);
    return e;
  }
}
var search_extractor_default = extractSearchResults;

// src/anime-lib/controllers/search.controller.js
var search = async (req) => {
  try {
    let { keyword, type, status, rated, score, season, language, genres, sort, sy, sm, sd, ey, em, ed } = req.query;
    let page = parseInt(req.query.page) || 1;
    const [totalPage, data] = await search_extractor_default({
      keyword,
      type,
      status,
      rated,
      score,
      season,
      language,
      genres,
      sort,
      page,
      sy,
      sm,
      sd,
      ey,
      em,
      ed
    });
    if (page > totalPage) {
      const error = new Error("Requested page exceeds total available pages.");
      error.status = 404;
      throw error;
    }
    return { data, totalPage };
  } catch (e) {
    console.error(e);
    if (e.status === 404) {
      throw e;
    }
    throw new Error("An error occurred while processing your request.");
  }
};

// src/anime-lib/extractors/episodeList.extractor.js
import axios2 from "axios";
import * as cheerio2 from "cheerio";
async function extractEpisodesList(id) {
  try {
    const showId = id.split("-").pop();
    const response = await axios2.get(
      `https://${v1_base_url}/ajax/v2/episode/list/${showId}`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Referer: `https://${v1_base_url}/watch/${id}`
        }
      }
    );
    if (!response.data.html) return [];
    const $ = cheerio2.load(response.data.html);
    const res = {
      totalEpisodes: 0,
      episodes: []
    };
    res.totalEpisodes = Number($(".detail-infor-content .ss-list a").length);
    $(".detail-infor-content .ss-list a").each((_, el) => {
      res.episodes.push({
        episode_no: Number($(el).attr("data-number")),
        id: $(el)?.attr("href")?.split("/")?.pop() || null,
        title: $(el)?.attr("title")?.trim() || null,
        japanese_title: $(el).find(".ep-name").attr("data-jname"),
        filler: $(el).hasClass("ssl-item-filler")
      });
    });
    return res;
  } catch (error) {
    console.error(error);
    return [];
  }
}
var episodeList_extractor_default = extractEpisodesList;

// src/anime-lib/helper/cache.helper.js
import axios3 from "axios";
import dotenv from "dotenv";
dotenv.config();
var CACHE_SERVER_URL = process.env.CACHE_URL || null;

// src/anime-lib/controllers/episodeList.controller.js
var getEpisodes = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await episodeList_extractor_default(encodeURIComponent(id));
    return data;
  } catch (e) {
    console.error("Error fetching episodes:", e);
    return e;
  }
};

// src/anime-lib/extractors/streamInfo.extractor.js
import axios5 from "axios";
import * as cheerio4 from "cheerio";

// src/anime-lib/parsers/decryptors/decrypt_v1.decryptor.js
import axios4 from "axios";
import CryptoJS from "crypto-js";
import * as cheerio3 from "cheerio";

// src/anime-lib/utils/base_v4.js
var v4_base_url = "9animetv.to";

// src/anime-lib/utils/fallback.js
var fallback_1 = "megaplay.buzz";
var fallback_2 = "vidwish.live";

// src/anime-lib/parsers/decryptors/decrypt_v1.decryptor.js
async function decryptSources_v1(epID, id, name, type, fallback) {
  try {
    let decryptedSources = null;
    let iframeURL = null;
    if (fallback) {
      const fallback_server = ["hd-1", "hd-3"].includes(name.toLowerCase()) ? fallback_1 : fallback_2;
      iframeURL = `https://${fallback_server}/stream/s-2/${epID}/${type}`;
      const { data } = await axios4.get(
        `https://${fallback_server}/stream/s-2/${epID}/${type}`,
        {
          headers: {
            Referer: `https://${fallback_server}/`
          }
        }
      );
      const $ = cheerio3.load(data);
      const dataId = $("#megaplay-player").attr("data-id");
      const { data: decryptedData } = await axios4.get(
        `https://${fallback_server}/stream/getSources?id=${dataId}`,
        {
          headers: {
            "X-Requested-With": "XMLHttpRequest"
          }
        }
      );
      decryptedSources = decryptedData;
    } else {
      const { data: sourcesData } = await axios4.get(
        `https://${v4_base_url}/ajax/episode/sources?id=${id}`
      );
      const ajaxLink = sourcesData?.link;
      if (!ajaxLink) throw new Error("Missing link in sourcesData");
      const sourceIdMatch = /\/([^/?]+)\?/.exec(ajaxLink);
      const sourceId = sourceIdMatch?.[1];
      if (!sourceId) throw new Error("Unable to extract sourceId from link");
      const baseUrlMatch = ajaxLink.match(
        /^(https?:\/\/[^\/]+(?:\/[^\/]+){3})/
      );
      if (!baseUrlMatch) throw new Error("Could not extract base URL");
      const baseUrl = baseUrlMatch[1];
      iframeURL = `${baseUrl}/${sourceId}?k=1&autoPlay=0&oa=0&asi=1`;
      const { data: rawSourceData } = await axios4.get(
        `${baseUrl}/getSources?id=${sourceId}`
      );
      decryptedSources = rawSourceData;
    }
    return {
      id,
      type,
      link: {
        file: fallback ? decryptedSources?.sources?.file ?? "" : decryptedSources?.sources?.[0].file ?? "",
        type: "hls"
      },
      tracks: decryptedSources.tracks ?? [],
      intro: decryptedSources.intro ?? null,
      outro: decryptedSources.outro ?? null,
      iframe: iframeURL,
      server: name
    };
  } catch (error) {
    console.error(
      `Error during decryptSources_v1(${id}, epID=${epID}, server=${name}):`,
      error.message
    );
    return null;
  }
}

// src/anime-lib/extractors/streamInfo.extractor.js
async function extractServers(id) {
  try {
    const resp = await axios5.get(
      `https://${v1_base_url}/ajax/v2/episode/servers?episodeId=${id}`
    );
    const $ = cheerio4.load(resp.data.html);
    const serverData = [];
    $(".server-item").each((index, element) => {
      const data_id = $(element).attr("data-id");
      const server_id = $(element).attr("data-server-id");
      const type = $(element).attr("data-type");
      const serverName = $(element).find("a").text().trim();
      serverData.push({
        type,
        data_id,
        server_id,
        serverName
      });
    });
    return serverData;
  } catch (error) {
    console.log(error);
    return [];
  }
}
async function extractStreamingInfo(id, name, type, fallback) {
  try {
    const servers = await extractServers(id.split("?ep=").pop());
    let requestedServer = servers.filter(
      (server) => server.serverName.toLowerCase() === name.toLowerCase() && server.type.toLowerCase() === type.toLowerCase()
    );
    if (requestedServer.length === 0) {
      requestedServer = servers.filter(
        (server) => server.serverName.toLowerCase() === name.toLowerCase() && server.type.toLowerCase() === "raw"
      );
    }
    if (requestedServer.length === 0) {
      throw new Error(
        `No matching server found for name: ${name}, type: ${type}`
      );
    }
    const streamingLink = await decryptSources_v1(
      id,
      requestedServer[0].data_id,
      name,
      type,
      fallback
    );
    return { streamingLink, servers };
  } catch (error) {
    console.error("An error occurred:", error);
    return { streamingLink: [], servers: [] };
  }
}

// src/anime-lib/controllers/streamInfo.controller.js
var getStreamInfo = async (req, res, fallback = false) => {
  try {
    const input = req.query.id;
    const server = req.query.server;
    const type = req.query.type;
    const match = input.match(/ep=(\d+)/);
    if (!match) throw new Error("Invalid URL format");
    const finalId = match[1];
    const streamingInfo = await extractStreamingInfo(finalId, server, type, fallback);
    return streamingInfo;
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }
};

// api/anime/index.js
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
  const { action } = req.query;
  console.log(`\u{1F38C} [Anime API] Action: ${action}, Query:`, req.query);
  try {
    let data;
    if (action === "search") {
      console.log("\u{1F50D} [Anime API] Search request:", req.query.keyword);
      const result = await search(req);
      data = result;
    } else if (action === "episodes") {
      const id = req.query.id;
      console.log("\u{1F4FA} [Anime API] Episodes request:", id);
      req.params = { id };
      data = await getEpisodes(req, res);
    } else if (action === "stream") {
      console.log("\u{1F3AC} [Anime API] Stream request:", req.query.id);
      data = await getStreamInfo(req, res, false);
    } else {
      return res.status(404).json({
        success: false,
        message: `Missing or unknown action. Available: search, episodes, stream`
      });
    }
    return res.status(200).json({
      success: true,
      results: data
    });
  } catch (error) {
    console.error("\u274C [Anime API] Error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
}
export {
  handler as default
};
