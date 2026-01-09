package com.anisflix.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.anisflix.domain.repository.AppTheme
import com.anisflix.domain.repository.ContentLanguage
import com.anisflix.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsState(
    val appLanguage: String = "fr",
    val contentLanguage: ContentLanguage = ContentLanguage.VF,
    val appTheme: AppTheme = AppTheme.SYSTEM
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    val state: StateFlow<SettingsState> = combine(
        settingsRepository.appLanguage,
        settingsRepository.contentLanguage,
        settingsRepository.appTheme
    ) { appLang, contentLang, theme ->
        SettingsState(
            appLanguage = appLang,
            contentLanguage = contentLang,
            appTheme = theme
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SettingsState()
    )

    fun setAppLanguage(language: String) {
        viewModelScope.launch {
            settingsRepository.setAppLanguage(language)
        }
    }

    fun setContentLanguage(language: ContentLanguage) {
        viewModelScope.launch {
            settingsRepository.setContentLanguage(language)
        }
    }

    fun setAppTheme(theme: AppTheme) {
        viewModelScope.launch {
            settingsRepository.setAppTheme(theme)
        }
    }
}
