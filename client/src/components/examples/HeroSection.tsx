import HeroSection from "../HeroSection";

export default function HeroSectionExample() {
  return (
    <HeroSection
      title="Inception"
      overview="Dom Cobb est un voleur expérimenté – le meilleur qui soit dans l'art périlleux de l'extraction : sa spécialité consiste à s'approprier les secrets les plus précieux d'un individu, enfouis au plus profond de son subconscient, pendant qu'il rêve et que son esprit est particulièrement vulnérable."
      backdropPath="/s3TBrRGB1iav7gFOCNx3H31MoES.jpg"
      rating={8.8}
      year="2010"
      mediaType="movie"
      onPlay={() => console.log("Play clicked")}
      onDownload={() => console.log("Download clicked")}
      onFavorite={() => console.log("Favorite clicked")}
      onInfo={() => console.log("Info clicked")}
    />
  );
}
