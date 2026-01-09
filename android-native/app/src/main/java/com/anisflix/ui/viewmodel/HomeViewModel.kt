package com.anisflix.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.anisflix.data.local.entity.WatchProgressEntity
import com.anisflix.domain.model.Media
import com.anisflix.domain.model.TVChannel
import com.anisflix.domain.repository.TMDBRepository
import com.anisflix.domain.repository.TVRepository
import com.anisflix.domain.repository.WatchProgressRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeState(
    val isLoading: Boolean = true,
    val popularMovies: List<Media> = emptyList(),
    val popularSeries: List<Media> = emptyList(),
    val latestMovies: List<Media> = emptyList(),
    val latestSeries: List<Media> = emptyList(),
    val pinnedChannels: List<TVChannel> = emptyList(),
    val continueWatching: List<WatchProgressEntity> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val tmdbRepository: TMDBRepository,
    private val tvRepository: TVRepository,
    private val watchProgressRepository: WatchProgressRepository
) : ViewModel() {

    private val _state = MutableStateFlow(HomeState())
    val state: StateFlow<HomeState> = _state.asStateFlow()

    init {
        loadData()
        observeWatchProgress()
    }
    
    private fun observeWatchProgress() {
        viewModelScope.launch {
            watchProgressRepository.getWatchProgress().collect { progressList ->
                 // Logic to filter:
                 // Movies: progress < 0.9
                 // Series: progress < 0.9 OR hasNextEpisode
                 val filtered = progressList.filter { item ->
                     if (item.mediaType == "movie") {
                         item.progress < 0.9f && item.progress > 0f
                     } else {
                         (item.progress < 0.9f && item.progress > 0f) || item.hasNextEpisode
                     }
                 }.sortedByDescending { it.lastWatched } // Ensuring latest first
                 
                _state.update { it.copy(continueWatching = filtered) }
            }
        }
    }

    fun loadData() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }

            // Parallel fetching
            val popularMoviesDeferred = async { tmdbRepository.getPopularMovies(1, "fr-FR") }
            val popularSeriesDeferred = async { tmdbRepository.getPopularSeries(1, "fr-FR") }
            val latestMoviesDeferred = async { tmdbRepository.getLatestMovies(1, "fr-FR") }
            val latestSeriesDeferred = async { tmdbRepository.getLatestSeries(1, "fr-FR") }
            val channelsDeferred = async { tvRepository.getChannels() }

            val popularMoviesResult = popularMoviesDeferred.await()
            val popularSeriesResult = popularSeriesDeferred.await()
            val latestMoviesResult = latestMoviesDeferred.await()
            val latestSeriesResult = latestSeriesDeferred.await()
            val channelsResult = channelsDeferred.await()

            _state.update { currentState ->
                currentState.copy(
                    isLoading = false,
                    popularMovies = popularMoviesResult.getOrElse { emptyList() },
                    popularSeries = popularSeriesResult.getOrElse { emptyList() },
                    latestMovies = latestMoviesResult.getOrElse { emptyList() },
                    latestSeries = latestSeriesResult.getOrElse { emptyList() },
                    pinnedChannels = channelsResult.getOrElse { emptyList() }
                        .filter { it.id.contains("watania") || it.category == "tn" }
                        .take(5),
                    error = null
                )
            }
        }
    }
}
