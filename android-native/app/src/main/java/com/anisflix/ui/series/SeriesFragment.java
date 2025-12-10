package com.anisflix.ui.series;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;
import com.anisflix.R;
import com.anisflix.models.Series;
import com.anisflix.adapters.HorizontalSeriesAdapter;
import java.util.List;

public class SeriesFragment extends Fragment {
    
    private SeriesViewModel viewModel;
    private android.widget.LinearLayout container;
    
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewModel = new ViewModelProvider(this).get(SeriesViewModel.class);
    }
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_series, container, false);
        this.container = view.findViewById(R.id.series_container);
        
        setupSection("Diffusé aujourd'hui", viewModel.getAiringTodaySeries(), "AIRING_TODAY");
        setupSection("Tendances", viewModel.getTrendingSeries(), "TRENDING");
        setupSection("Les Mieux Notés", viewModel.getTopRatedSeries(), "TOP_RATED");
        setupSection("Populaires", viewModel.getPopularSeries(), "POPULAR");
        
        return view;
    }
    
    private void setupSection(String title, androidx.lifecycle.LiveData<List<Series>> liveData, String categoryKey) {
        View sectionView = getLayoutInflater().inflate(R.layout.item_section_layout, container, false);
        
        android.widget.TextView titleView = sectionView.findViewById(R.id.section_title);
        titleView.setText(title);
        
         android.widget.TextView seeAllBtn = sectionView.findViewById(R.id.see_all_button);
        seeAllBtn.setOnClickListener(v -> {
            android.content.Intent intent = new android.content.Intent(getContext(), com.anisflix.ui.section.SectionContentActivity.class);
            intent.putExtra(com.anisflix.ui.section.SectionContentActivity.EXTRA_TITLE, title);
            intent.putExtra(com.anisflix.ui.section.SectionContentActivity.EXTRA_TYPE, "series");
            intent.putExtra(com.anisflix.ui.section.SectionContentActivity.EXTRA_CATEGORY, categoryKey);
            startActivity(intent);
        });
        
        RecyclerView recycler = sectionView.findViewById(R.id.section_recycler);
        recycler.setLayoutManager(new androidx.recyclerview.widget.LinearLayoutManager(getContext(), RecyclerView.HORIZONTAL, false));
        
        HorizontalSeriesAdapter adapter = new HorizontalSeriesAdapter(getContext());
        adapter.setOnItemClickListener(series -> {
             android.content.Intent intent = new android.content.Intent(getContext(), com.anisflix.ui.detail.SeriesDetailActivity.class);
             intent.putExtra("series_id", series.getId());
             startActivity(intent);
        });
        recycler.setAdapter(adapter);
        
        View loading = sectionView.findViewById(R.id.section_loading);
        loading.setVisibility(View.VISIBLE);
        
        liveData.observe(getViewLifecycleOwner(), series -> {
            loading.setVisibility(View.GONE);
            if (series != null && !series.isEmpty()) {
                adapter.setSeries(series);
                container.addView(sectionView);
            }
        });
    }
}
