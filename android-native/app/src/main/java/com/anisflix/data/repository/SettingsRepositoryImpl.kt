package com.anisflix.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.anisflix.domain.repository.AppTheme
import com.anisflix.domain.repository.ContentLanguage
import com.anisflix.domain.repository.SettingsRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

@Singleton
class SettingsRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context
) : SettingsRepository {

    private object Keys {
        val APP_LANGUAGE = stringPreferencesKey("app_language")
        val CONTENT_LANGUAGE = stringPreferencesKey("content_language")
        val APP_THEME = stringPreferencesKey("app_theme")
    }

    override val appLanguage: Flow<String> = context.dataStore.data
        .map { preferences ->
            preferences[Keys.APP_LANGUAGE] ?: "fr"
        }

    override val contentLanguage: Flow<ContentLanguage> = context.dataStore.data
        .map { preferences ->
            try {
                ContentLanguage.valueOf(preferences[Keys.CONTENT_LANGUAGE] ?: "VF")
            } catch (e: Exception) {
                ContentLanguage.VF
            }
        }

    override val appTheme: Flow<AppTheme> = context.dataStore.data
        .map { preferences ->
            try {
                AppTheme.valueOf(preferences[Keys.APP_THEME] ?: "SYSTEM")
            } catch (e: Exception) {
                AppTheme.SYSTEM
            }
        }

    override suspend fun setAppLanguage(language: String) {
        context.dataStore.edit { preferences ->
            preferences[Keys.APP_LANGUAGE] = language
        }
    }

    override suspend fun setContentLanguage(language: ContentLanguage) {
        context.dataStore.edit { preferences ->
            preferences[Keys.CONTENT_LANGUAGE] = language.name
        }
    }

    override suspend fun setAppTheme(theme: AppTheme) {
        context.dataStore.edit { preferences ->
            preferences[Keys.APP_THEME] = theme.name
        }
    }
}
