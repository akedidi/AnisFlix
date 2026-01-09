package com.anisflix.domain.repository

import kotlinx.coroutines.flow.Flow

enum class AppTheme {
    SYSTEM, LIGHT, DARK
}

enum class ContentLanguage {
    VF, VOSTFR, VO
}

interface SettingsRepository {
    val appLanguage: Flow<String> // "fr" or "en"
    val contentLanguage: Flow<ContentLanguage>
    val appTheme: Flow<AppTheme>
    
    suspend fun setAppLanguage(language: String)
    suspend fun setContentLanguage(language: ContentLanguage)
    suspend fun setAppTheme(theme: AppTheme)
}
