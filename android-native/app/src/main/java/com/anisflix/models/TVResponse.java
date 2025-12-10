package com.anisflix.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class TVResponse {
    @SerializedName("sections")
    private List<TVSection> sections;

    public List<TVSection> getSections() {
        return sections;
    }

    public void setSections(List<TVSection> sections) {
        this.sections = sections;
    }
}
