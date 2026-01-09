package com.anisflix.domain.model

data class TVChannel(
    val id: String,
    val name: String,
    val logo: String,
    val category: String, // e.g. "tn", "fr" (Section ID)
    val group: String,    // e.g. "Sport", "News" (Category Name)
    val links: List<TVChannelLink>
) {
    fun getStreamUrl(): String? {
        // Return first valid HLS link
        return links.firstOrNull { it.type.startsWith("hls") }?.url
    }
}

data class TVChannelLink(
    val type: String,
    val url: String,
    val priority: Int = 1,
    val userAgent: String? = null,
    val referer: String? = null,
    val licenseKey: String? = null // For DRM if needed
)
