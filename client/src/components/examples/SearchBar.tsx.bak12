import SearchBar from "../SearchBar";

export default function SearchBarExample() {
  const mockSuggestions = [
    {
      id: 1,
      title: "Inception",
      posterPath: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
      mediaType: "movie" as const,
      year: "2010",
    },
    {
      id: 2,
      title: "Breaking Bad",
      posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      mediaType: "tv" as const,
      year: "2008",
    },
  ];

  return (
    <div className="max-w-2xl p-4">
      <SearchBar
        onSearch={(q) => console.log("Searching:", q)}
        onSelect={(item) => console.log("Selected:", item)}
        suggestions={mockSuggestions}
      />
    </div>
  );
}
