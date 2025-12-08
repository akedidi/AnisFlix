package com.anisflix.ui.downloads;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.anisflix.R;

/**
 * Downloads Fragment - Shows downloaded movies/series
 */
public class DownloadsFragment extends Fragment {
    
    private DownloadsViewModel viewModel;
    private RecyclerView recyclerView;
    
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewModel = new ViewModelProvider(this).get(DownloadsViewModel.class);
    }
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_downloads, container, false);
        initViews(view);
        observeData();
        return view;
    }
    
    private void initViews(View view) {
        recyclerView = view.findViewById(R.id.recycler_view);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
    }
    
    private void observeData() {
        viewModel.getDownloads().observe(getViewLifecycleOwner(), downloads -> {
            // TODO: Setup adapter
        });
    }
}
