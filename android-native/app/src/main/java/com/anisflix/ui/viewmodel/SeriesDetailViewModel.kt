package com.anisflix.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.anisflix.domain.model.Episode
import com.anisflix.domain.model.Media
import com.anisflix.domain.model.Season
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

data class SeriesDetailState(
    val isLoading: Boolean = true,
    val series: Media? = null,
    val seasons: List<Season> = emptyList(),
    val selectedSeason: Season? = null,
    val episodes: List<Episode> = emptyList(),
    val isLoadingEpisodes: Boolean = false,
    val isLoadingSources: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class SeriesDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val tmdbRepository: TMDBRepository,
    private val streamingRepository: StreamingRepository,
    private val watchProgressRepository: WatchProgressRepository,
    private val playerManager: GlobalPlayerManager
) : ViewModel() {

    private val seriesId: Int = checkNotNull(savedStateHandle["seriesId"]) { "seriesId is required" }.toString().toInt()

    private val _state = MutableStateFlow(SeriesDetailState())
    val state: StateFlow<SeriesDetailState> = _state.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val seriesResult = tmdbRepository.getSeriesDetails(seriesId)
            
            if (seriesResult.isSuccess) {
                val series = seriesResult.getOrThrow()
                // Assuming series.seasons is populated or we need to fetch them? 
                // Media model has `seasons: List<Season>?`.
                // If null, we might need to fetch. 
                // Let's assume TMDBRepository maps it correctly.
                
                // If seasons list is empty/null, we might have an issue.
                // Assuming simple case first.
                val seasons = series.seasons ?: emptyList()
                val firstSeason = seasons.firstOrNull { it.seasonNumber > 0 } ?: seasons.firstOrNull()

                _state.update { 
                    it.copy(
                        series = series,
                        seasons = seasons,
                        selectedSeason = firstSeason,
                        isLoading = false
                    ) 
                }
                
                if (firstSeason != null) {
                    loadEpisodes(firstSeason)
                }
            } else {
                _state.update { it.copy(isLoading = false, error = "Failed to load series details") }
            }
        }
    }

    fun selectSeason(season: Season) {
        if (_state.value.selectedSeason == season) return
        _state.update { it.copy(selectedSeason = season) }
        loadEpisodes(season)
    }

    private fun loadEpisodes(season: Season) {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingEpisodes = true) }
            val result = tmdbRepository.getSeasonDetails(seriesId, season.seasonNumber)
            
            if (result.isSuccess) {
                val seasonDetails = result.getOrThrow()
                _state.update { 
                    it.copy(
                        episodes = seasonDetails.episodes ?: emptyList(),
                        isLoadingEpisodes = false
                    ) 
                }
            } else {
                 _state.update { it.copy(isLoadingEpisodes = false) }
            }
        }
    }

    fun playEpisode(episode: Episode) {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingSources = true) }
            
            val seasonNum = _state.value.selectedSeason?.seasonNumber ?: 1
            
            // Fetch sources for this episode
            val sourcesResult = streamingRepository.getEpisodeSources(seriesId, seasonNum, episode.episodeNumber)
            val sources = sourcesResult.getOrElse { emptyList() }
            
            if (sources.isNotEmpty()) {
                // Auto-select best source (French first, then VO)
                // Logic: VF > VOSTFR > VO
                val vf = sources.firstOrNull { it.language.contains("VF", true) || it.language.contains("French", true) }
                val vostfr = sources.firstOrNull { it.language.contains("VOSTFR", true) }
                val vo = sources.firstOrNull() // Fallback to first
                
                val bestSource = vf ?: vostfr ?: vo
                
                bestSource?.let { source ->
                     val series = _state.value.series
                     val title = "${series?.title} - S${seasonNum}E${episode.episodeNumber} - ${episode.name}"
                     
                     playerManager.play(
                         media = series!!, // Should be valid if we are here
                         source = source,
                         title = title,
                         posterUrl = episode.stillPath?.let { "https://image.tmdb.org/t/p/w500$it" } ?: series.getPosterUrl(),
                         startTime = 0 // Or check watch progress
                     )
                }
            } else {
                // TODO: Show error toast "No sources found"
            }
             _state.update { it.copy(isLoadingSources = false) }
        }
    }
}
