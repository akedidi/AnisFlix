package com.anisflix.ui.settings;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.RadioGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import com.anisflix.R;
import com.anisflix.utils.Constants;
import com.anisflix.utils.PreferencesManager;
import com.anisflix.utils.ThemeManager;

/**
 * Settings Fragment - Theme, Language, About
 */
public class SettingsFragment extends Fragment {
    
    private PreferencesManager prefsManager;
    private ThemeManager themeManager;
    private RadioGroup themeRadioGroup;
    private RadioGroup languageRadioGroup;
    private Button clearCacheButton;
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_settings, container, false);
        
        prefsManager = PreferencesManager.getInstance(requireContext());
        themeManager = ThemeManager.getInstance(requireContext());
        
        initViews(view);
        loadCurrentSettings();
        setupListeners();
        
        return view;
    }
    
    private void initViews(View view) {
        themeRadioGroup = view.findViewById(R.id.theme_radio_group);
        languageRadioGroup = view.findViewById(R.id.language_radio_group);
        clearCacheButton = view.findViewById(R.id.clear_cache_button);
    }
    
    private void loadCurrentSettings() {
        String currentTheme = prefsManager.getTheme();
        String currentLang = prefsManager.getStreamingLanguage();
        
        // Set theme radio button
        switch (currentTheme) {
            case Constants.THEME_LIGHT:
                themeRadioGroup.check(R.id.radio_light);
                break;
            case Constants.THEME_DARK:
                themeRadioGroup.check(R.id.radio_dark);
                break;
            default:
                themeRadioGroup.check(R.id.radio_system);
                break;
        }
        
        // Set language radio button
        switch (currentLang) {
            case Constants.LANG_VF:
                languageRadioGroup.check(R.id.radio_vf);
                break;
            case Constants.LANG_VOSTFR:
                languageRadioGroup.check(R.id.radio_vostfr);
                break;
            case Constants.LANG_VO:
                languageRadioGroup.check(R.id.radio_vo);
                break;
        }
    }
    
    private void setupListeners() {
        themeRadioGroup.setOnCheckedChangeListener((group, checkedId) -> {
            String theme = Constants.THEME_SYSTEM;
            
            if (checkedId == R.id.radio_light) {
                theme = Constants.THEME_LIGHT;
            } else if (checkedId == R.id.radio_dark) {
                theme = Constants.THEME_DARK;
            }
            
            themeManager.setTheme(theme, getActivity());
        });
        
        languageRadioGroup.setOnCheckedChangeListener((group, checkedId) -> {
            String lang = Constants.LANG_VF;
            
            if (checkedId == R.id.radio_vostfr) {
                lang = Constants.LANG_VOSTFR;
            } else if (checkedId == R.id.radio_vo) {
                lang = Constants.LANG_VO;
            }
            
            prefsManager.setStreamingLanguage(lang);
        });
        
        clearCacheButton.setOnClickListener(v -> {
            // Clear Glide cache
            // Clear other caches
        });
    }
}
