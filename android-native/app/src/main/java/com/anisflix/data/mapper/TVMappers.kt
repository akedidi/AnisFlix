package com.anisflix.data.mapper

import com.anisflix.data.remote.dto.TVChannelLinkDTO
import com.anisflix.data.remote.dto.TVSectionDTO
import com.anisflix.domain.model.TVChannel
import com.anisflix.domain.model.TVChannelLink

fun TVSectionDTO.toDomain(): List<TVChannel> {
    return categories.flatMap { cat ->
        cat.channels.map { ch ->
            TVChannel(
                id = ch.id,
                name = ch.name,
                logo = ch.logo ?: "",
                category = this.id, // Section ID
                group = cat.name,   // Category Name
                links = ch.links?.map { it.toDomain() } ?: emptyList()
            )
        }
    }
}

fun TVChannelLinkDTO.toDomain(): TVChannelLink {
    return TVChannelLink(
        type = type,
        url = url,
        priority = priority,
        userAgent = userAgent,
        referer = referer
    )
}
