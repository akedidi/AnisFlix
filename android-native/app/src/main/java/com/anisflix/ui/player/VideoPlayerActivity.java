package com.anisflix.ui.player;

import android.app.PictureInPictureParams;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.util.Rational;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.source.hls.HlsMediaSource;
import com.google.android.exoplayer2.trackselection.DefaultTrackSelector;
import com.google.android.exoplayer2.ui.StyledPlayerView;
import com.google.android.exoplayer2.upstream.DefaultHttpDataSource;
import com.google.android.exoplayer2.C;
import com.google.android.exoplayer2.Tracks;
import com.google.android.exoplayer2.Format;
import com.anisflix.R;
import com.anisflix.utils.PreferencesManager;
import com.anisflix.cast.CastHelper;
import com.anisflix.services.ProviderExtractor;
import java.util.ArrayList;
import java.util.List;

/**
 * Enhanced Video Player Activity
 * With provider-specific extraction before playback
 */
public class VideoPlayerActivity extends AppCompatActivity {
    
    private static final String TAG = "VideoPlayerActivity";
    
    public static final String EXTRA_MOVIE_ID = "movie_id";
    public static final String EXTRA_SERIES_ID = "series_id";
    public static final String EXTRA_EPISODE_ID = "episode_id"; // Added
    public static final String EXTRA_SEASON = "season";
    public static final String EXTRA_EPISODE = "episode";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_STREAM_URL = "stream_url";
    public static final String EXTRA_POSTER_URL = "poster_url";
    public static final String EXTRA_PROVIDER = "provider";  // NEW!
    
    private StyledPlayerView playerView;
    private ExoPlayer player;
    private DefaultTrackSelector trackSelector;
    private ProgressBar loadingIndicator;
    private ImageButton backButton;
    private ImageButton castButton;
    private ImageButton pipButton;
    private ImageButton subtitlesButton;
    
    private String streamUrl;
    private String title;
    private String posterUrl;
    private String provider;  // NEW!
    private int mediaId;
    private long playbackPosition = 0;
    private boolean playWhenReady = true;
    private boolean isPipSupported = false;
    private PreferencesManager prefsManager;
    private CastHelper castHelper;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Fullscreen and landscape
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        
        setContentView(R.layout.activity_video_player);
        
        prefsManager = PreferencesManager.getInstance(this);
        castHelper = CastHelper.getInstance(this);
        
        // Check PiP support
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            isPipSupported = getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE);
        }
        
        initViews();
        getIntentExtras();
        
        // Extract then play (iOS pattern)
        extractAndPlay();
    }
    
    private void initViews() {
        playerView = findViewById(R.id.player_view);
        loadingIndicator = findViewById(R.id.loading_indicator);
        backButton = findViewById(R.id.back_button);
        castButton = findViewById(R.id.cast_button);
        pipButton = findViewById(R.id.pip_button);
        subtitlesButton = findViewById(R.id.subtitles_button);
        
        backButton.setOnClickListener(v -> finish());
        castButton.setOnClickListener(v -> castToDevice());
        
        // PiP button
        if (isPipSupported) {
            pipButton.setVisibility(View.VISIBLE);
            pipButton.setOnClickListener(v -> enterPipMode());
        } else {
            pipButton.setVisibility(View.GONE);
        }
        
        // Subtitle button
        subtitlesButton.setOnClickListener(v -> showSubtitleSelector());
    }
    
    private void getIntentExtras() {
        title = getIntent().getStringExtra(EXTRA_TITLE);
        streamUrl = getIntent().getStringExtra(EXTRA_STREAM_URL);
        posterUrl = getIntent().getStringExtra(EXTRA_POSTER_URL);
        provider = getIntent().getStringExtra(EXTRA_PROVIDER);  // NEW!
        mediaId = getIntent().getIntExtra(EXTRA_MOVIE_ID, -1);
        
        // Load saved position
        if (mediaId != -1) {
            playbackPosition = prefsManager.getPlaybackPosition(mediaId);
        }
    }
    
    /**
     * Extract URL based on provider (iOS pattern)
     */
    private void extractAndPlay() {
        if (streamUrl == null || provider == null) {
            Toast.makeText(this, "No stream URL or provider", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }
        
        loadingIndicator.setVisibility(View.VISIBLE);
        
        // Extract in background (iOS pattern)
        new ExtractUrlTask().execute(streamUrl, provider);
    }
    
    private class ExtractUrlTask extends AsyncTask<String, Void, String> {
        private Exception error;
        
        @Override
        protected String doInBackground(String... params) {
            String url = params[0];
            String providerName = params[1];
            
            try {
                Log.d(TAG, "Extracting with provider: " + providerName);
                return ProviderExtractor.getInstance().extractByProvider(url, providerName);
            } catch (Exception e) {
                error = e;
                Log.e(TAG, "Extraction failed", e);
                return null;
            }
        }
        
        @Override
        protected void onPostExecute(String extractedUrl) {
            loadingIndicator.setVisibility(View.GONE);
            
            if (extractedUrl != null) {
                Log.d(TAG, "Playback URL: " + extractedUrl);
                initializePlayer(extractedUrl);
            } else {
                String errorMsg = error != null ? error.getMessage() : "Unknown error";
                Toast.makeText(VideoPlayerActivity.this, 
                    "Extraction failed: " + errorMsg, Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }
    
    private void initializePlayer(String playbackUrl) {
        // Create track selector for subtitles
        trackSelector = new DefaultTrackSelector(this);
        trackSelector.setParameters(
                trackSelector.buildUponParameters()
                        .setPreferredTextLanguage("fr")
        );
        
        // Create ExoPlayer
        player = new ExoPlayer.Builder(this)
                .setTrackSelector(trackSelector)
                .build();
        
        playerView.setPlayer(player);
        
        // Build media item
        MediaItem mediaItem = MediaItem.fromUri(Uri.parse(playbackUrl));
        
        // Prepare player
        player.setMediaItem(mediaItem);
        player.setPlayWhenReady(playWhenReady);
        player.seekTo(playbackPosition);
        player.prepare();
        
        // Add listener
        player.addListener(new Player.Listener() {
            @Override
            public void onIsLoadingChanged(boolean isLoading) {
                loadingIndicator.setVisibility(isLoading ? View.VISIBLE : View.GONE);
            }
            
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_ENDED) {
                    finish();
                }
            }
        });
    }
    
    private void showSubtitleSelector() {
        if (player == null) return;
        
        Tracks tracks = player.getCurrentTracks();
        List<String> subtitleOptions = new ArrayList<>();
        subtitleOptions.add("Off");
        
        // Get available subtitle tracks
        for (Tracks.Group trackGroup : tracks.getGroups()) {
            if (trackGroup.getType() == C.TRACK_TYPE_TEXT) {
                for (int i = 0; i < trackGroup.length; i++) {
                    Format format = trackGroup.getTrackFormat(i);
                    String language = format.language != null ? format.language : "Unknown";
                    subtitleOptions.add(language);
                }
            }
        }
        
        if (subtitleOptions.size() <= 1) {
            Toast.makeText(this, "No subtitles available", Toast.LENGTH_SHORT).show();
            return;
        }
        
        new AlertDialog.Builder(this)
                .setTitle("Select Subtitles")
                .setItems(subtitleOptions.toArray(new String[0]), (dialog, which) -> {
                    if (which == 0) {
                        // Disable subtitles
                        trackSelector.setParameters(
                                trackSelector.buildUponParameters()
                                        .setRendererDisabled(C.TRACK_TYPE_TEXT, true)
                        );
                    } else {
                        // Enable selected subtitle track
                        trackSelector.setParameters(
                                trackSelector.buildUponParameters()
                                        .setRendererDisabled(C.TRACK_TYPE_TEXT, false)
                                        .setPreferredTextLanguage(subtitleOptions.get(which))
                        );
                    }
                })
                .show();
    }
    
    private void castToDevice() {
        if (castHelper.isCastConnected()) {
            // Cast the current video
            castHelper.castMedia(streamUrl, title, posterUrl);
            
            // Save current position and pause local playback
            if (player != null) {
                playbackPosition = player.getCurrentPosition();
                player.pause();
            }
        }
    }
    
    private void enterPipMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isPipSupported) {
            Rational aspectRatio = new Rational(16, 9);
            PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(aspectRatio)
                    .build();
            enterPictureInPictureMode(params);
        }
    }
    
    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode);
        
        if (isInPictureInPictureMode) {
            // Hide UI controls in PiP mode
            playerView.setUseController(false);
        } else {
            // Show UI controls when exiting PiP
            playerView.setUseController(true);
        }
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        if (player != null) {
            playbackPosition = player.getCurrentPosition();
            playWhenReady = player.getPlayWhenReady();
            
            // Save position
            if (mediaId != -1) {
                prefsManager.savePlaybackPosition(mediaId, playbackPosition);
            }
            
            player.pause();
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        if (player != null) {
            player.setPlayWhenReady(playWhenReady);
        }
    }
    
    @Override
    protected void onStop() {
        super.onStop();
        // Save position when going to background
        if (player != null && mediaId != -1) {
            prefsManager.savePlaybackPosition(mediaId, player.getCurrentPosition());
        }
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
            player = null;
        }
    }
}
