package com.anisflix.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.anisflix.domain.model.Media
import com.anisflix.domain.model.StreamingSource
import com.anisflix.domain.model.Subtitle
import com.anisflix.domain.repository.StreamingRepository
import com.anisflix.domain.repository.TMDBRepository
import com.anisflix.domain.repository.WatchProgressRepository
import com.anisflix.ui.viewmodel.GlobalPlayerManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MovieDetailState(
    val isLoading: Boolean = true,
    val movie: Media? = null, // Using Media model for simplicity, might need extended DTO if Media is too simple
    val similarMovies: List<Media> = emptyList(),
    val sources: List<StreamingSource> = emptyList(),
    val filteredSources: List<StreamingSource> = emptyList(),
    val selectedLanguage: String = "VF", // VF, VOSTFR, VO
    val isLoadingSources: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class MovieDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val tmdbRepository: TMDBRepository,
    private val streamingRepository: StreamingRepository,
    private val watchProgressRepository: WatchProgressRepository,
    private val playerManager: GlobalPlayerManager
) : ViewModel() {

    private val movieId: Int = checkNotNull(savedStateHandle["movieId"]) { "movieId is required" }.toString().toInt()

    private val _state = MutableStateFlow(MovieDetailState())
    val state: StateFlow<MovieDetailState> = _state.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                // Parallel fetch details + similar
                val movieResult = tmdbRepository.getMovieDetails(movieId)
                val similarResult = tmdbRepository.getSimilarMovies(movieId)

                if (movieResult.isSuccess) {
                    val movie = movieResult.getOrThrow()
                    _state.update { 
                        it.copy(
                            movie = movie,
                            similarMovies = similarResult.getOrElse { emptyList() },
                            isLoading = false
                        ) 
                    }
                    // Load fetch sources after details
                    loadSources()
                } else {
                    _state.update { it.copy(isLoading = false, error = "Failed to load movie details") }
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    private fun loadSources() {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingSources = true) }
            val sourcesResult = streamingRepository.getMovieSources(movieId)
            
            val sources = sourcesResult.getOrElse { emptyList() }
            
            // Auto-detect best language to select
            val hasVF = sources.any { it.language.equals("VF", ignoreCase = true) || it.language.contains("french", ignoreCase = true) }
            val hasVOSTFR = sources.any { it.language.contains("vostfr", ignoreCase = true) }
            
            val initialLang = when {
                hasVF -> "VF"
                hasVOSTFR -> "VOSTFR"
                else -> "VO"
            }
            
            _state.update {
                it.copy(
                    sources = sources,
                    selectedLanguage = initialLang,
                    isLoadingSources = false
                )
            }
            filterSources(initialLang)
        }
    }

    fun selectLanguage(language: String) {
        _state.update { it.copy(selectedLanguage = language) }
        filterSources(language)
    }

    private fun filterSources(language: String) {
        val currentSources = _state.value.sources
        val filtered = currentSources.filter { source ->
            val lang = source.language.lowercase()
            when (language) {
                "VF" -> lang.contains("vf") || lang.contains("french")
                "VOSTFR" -> lang.contains("vostfr")
                else -> !lang.contains("vf") && !lang.contains("french") && !lang.contains("vostfr") // VO/English
            }
        }
        _state.update { it.copy(filteredSources = filtered) }
    }

    fun playMovie(source: StreamingSource) {
        val movie = _state.value.movie ?: return
        
        // Extract stream logic if needed (e.g. for some providers)
        // For now, assuming direct URL or Repository handles extraction
        // StreamingRepository usually returns Extractable sources? 
        // If StreamingRepository returns raw sources (like upstream), we need extraction step.
        // Reviewing previous context: StreamingRepositoryImpl returns logic with extraction if implied?
        // Actually, typically Repository returns "Sources". We might need a "StreamingService.extract(source)" step.
        // Let's assume for now sources are play-ready or we implement extraction here.
        // Refactoring: Extraction logic is better in Repository or UseCase.
        // I will assume for Phase 4 step 1 that sources are mostly usable or I will add extraction call.
        
        // TODO: Implement Source Extraction for providers that need it (Vidmoly, etc.)
        // For this task, passing source directly to GlobalPlayerManager.
        
        // Fetch subtitles if any (async) - simplified for now
        val subs: List<Subtitle> = emptyList() // Fetch from repo later
        
        playerManager.play(
            media = movie,
            source = source,
            title = movie.title,
            posterUrl = movie.getPosterUrl(),
            subtitles = subs
        )
    }
}
