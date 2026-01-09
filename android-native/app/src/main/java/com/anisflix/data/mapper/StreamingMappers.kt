package com.anisflix.data.mapper

import com.anisflix.data.remote.dto.*
import com.anisflix.domain.model.StreamingSource
import com.anisflix.domain.model.Subtitle
import java.util.UUID

fun StreamingSourceDTO.toDomain(origin: String? = null): StreamingSource {
    val normalizedLanguage = normalizeLanguage(language ?: "VF")
    val normalizedProvider = normalizeProvider(provider ?: "unknown", quality ?: "", url)
    val finalType = type ?: if (url.contains(".m3u8")) "hls" else "mp4"
    val idString = "${normalizedProvider}_${quality}_${normalizedLanguage}_$url".hashCode().toString()
    
    return StreamingSource(
        id = idString,
        url = url,
        quality = quality ?: "HD",
        language = normalizedLanguage,
        provider = normalizedProvider,
        type = finalType,
        origin = origin,
        tracks = tracks?.map { it.toDomain() },
        headers = headers
    )
}

fun SubtitleDTO.toDomain(): Subtitle {
    return Subtitle(
        url = url,
        label = label,
        code = code,
        flag = flag
    )
}

fun FStreamPlayerDTO.toDomain(languageKey: String): StreamingSource {
    val normalizedLanguage = normalizeLanguage(languageKey)
    val normalizedProvider = normalizeProvider(player, quality, url)
    
    return StreamingSource(
        id = UUID.randomUUID().toString(),
        url = url,
        quality = quality,
        language = normalizedLanguage,
        provider = normalizedProvider,
        type = type,
        origin = "fstream"
    )
}

fun MovieBoxStreamDTO.toDomain(): StreamingSource {
    val normalizedType = type ?: if (url.contains(".m3u8")) "hls" else "mp4"
    
    return StreamingSource(
        id = UUID.randomUUID().toString(),
        url = url,
        quality = quality ?: "HD",
        language = "VO", // MovieBox is typically VO
        provider = "moviebox",
        type = normalizedType,
        origin = "moviebox",
        headers = headers
    )
}

fun UniversalVOFileDTO.toDomain(): StreamingSource {
    val normalizedLanguage = normalizeLanguage(lang ?: "VO")
    
    return StreamingSource(
        id = UUID.randomUUID().toString(),
        url = file,
        quality = quality ?: "HD",
        language = normalizedLanguage,
        provider = provider ?: "universal",
        type = type,
        origin = "universal_vo"
    )
}

fun AfterDarkSourceDTO.toDomain(): StreamingSource {
    val normalizedLanguage = normalizeLanguage(language ?: "VO")
    
    return StreamingSource(
        id = UUID.randomUUID().toString(),
        url = url,
        quality = quality ?: "HD",
        language = normalizedLanguage,
        provider = "afterdark",
        type = if (url.contains(".m3u8")) "hls" else "mp4",
        origin = "afterdark"
    )
}

fun MovixDownloadSourceDTO.toDomain(): StreamingSource {
    val normalizedLanguage = normalizeLanguage(language ?: "VF")
    val finalUrl = m3u8 ?: src ?: ""
    
    return StreamingSource(
        id = UUID.randomUUID().toString(),
        url = finalUrl,
        quality = quality ?: "HD",
        language = normalizedLanguage,
        provider = "movix", // or darkibox based on url
        type = if (finalUrl.contains(".m3u8")) "hls" else "mp4",
        origin = "movix_download"
    )
}


private fun normalizeLanguage(raw: String): String {
    val lower = raw.lowercase()
    return when {
         lower.contains("french") || lower.contains("français") || lower == "fr" || lower == "vf" || lower == "vfq" || lower == "default" -> "VF"
         lower.contains("english") || lower == "en" || lower == "eng" || lower == "vo" -> "VO"
         lower.contains("vostfr") || lower.contains("subtitle") -> "VOSTFR"
         else -> "VF"
    }
}

private fun normalizeProvider(rawProvider: String, quality: String, url: String): String {
    val lowerUrl = url.lowercase()
    val lowerQuality = quality.lowercase()
    val lowerProvider = rawProvider.lowercase()
    
    return when {
        lowerQuality.contains("vidmoly") || lowerUrl.contains("vidmoly") || lowerProvider.contains("vidmoly") -> "vidmoly"
        lowerQuality.contains("vidzy") || lowerUrl.contains("vidzy") || lowerProvider.contains("vidzy") -> "vidzy"
        lowerQuality.contains("darki") || lowerUrl.contains("darki") -> "darki"
        lowerQuality.contains("moviebox") || lowerUrl.contains("moviebox") || lowerProvider.contains("moviebox") -> "moviebox"
        else -> lowerProvider
    }
}
