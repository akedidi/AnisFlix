import MediaCarousel from "../MediaCarousel";

export default function MediaCarouselExample() {
  const mockItems = [
    { id: 1, title: "Inception", posterPath: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", rating: 8.8, year: "2010", mediaType: "movie" as const },
    { id: 2, title: "The Dark Knight", posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", rating: 9.0, year: "2008", mediaType: "movie" as const },
    { id: 3, title: "Interstellar", posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", rating: 8.6, year: "2014", mediaType: "movie" as const },
    { id: 4, title: "The Matrix", posterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", rating: 8.7, year: "1999", mediaType: "movie" as const },
  ];

  return (
    <div className="p-4">
      <MediaCarousel
        title="Tendances"
        items={mockItems}
        onItemClick={(item) => console.log("Clicked:", item)}
      />
    </div>
  );
}
