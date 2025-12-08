package com.anisflix.ui.tv;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.anisflix.R;

/**
 * TV Channels Fragment
 */
public class TVChannelsFragment extends Fragment {
    
    private TVChannelsViewModel viewModel;
    private RecyclerView recyclerView;
    
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        viewModel = new ViewModelProvider(this).get(TVChannelsViewModel.class);
    }
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_tv_channels, container, false);
        initViews(view);
        observeData();
        return view;
    }
    
    private void initViews(View view) {
        recyclerView = view.findViewById(R.id.recycler_view);
        
        GridLayoutManager layoutManager = new GridLayoutManager(getContext(), 3);
        recyclerView.setLayoutManager(layoutManager);
        
        com.anisflix.adapters.TVChannelsAdapter adapter = new com.anisflix.adapters.TVChannelsAdapter(getContext());
        adapter.setOnChannelClickListener(channel -> {
            // TODO: Play channel
            // For now, maybe just show a toast or open player if we have correct links
        });
        recyclerView.setAdapter(adapter);
    }
    
    private void observeData() {
        viewModel.getChannels().observe(getViewLifecycleOwner(), channels -> {
            if (channels != null && recyclerView.getAdapter() instanceof com.anisflix.adapters.TVChannelsAdapter) {
                ((com.anisflix.adapters.TVChannelsAdapter) recyclerView.getAdapter()).setChannels(channels);
            }
        });
    }
}
