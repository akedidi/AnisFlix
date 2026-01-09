package com.anisflix.data.remote.dto

import com.google.gson.annotations.SerializedName

data class TVChannelsResponse(
    val sections: List<TVSectionDTO>
)

data class TVSectionDTO(
    val id: String,
    val name: String,
    val categories: List<TVCategoryDTO>
)

data class TVCategoryDTO(
    val id: String,
    val name: String,
    val channels: List<APIChannelDTO>
)

data class APIChannelDTO(
    val id: String,
    val name: String,
    val logo: String?,
    val links: List<TVChannelLinkDTO>?
)

data class TVChannelLinkDTO(
    val type: String,
    val url: String,
    val priority: Int = 1,
    @SerializedName("user-agent") val userAgent: String?,
    val referer: String?
)
