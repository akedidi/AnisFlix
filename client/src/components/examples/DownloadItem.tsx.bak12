import DownloadItem from "../DownloadItem";

export default function DownloadItemExample() {
  return (
    <div className="max-w-2xl p-4 space-y-4">
      <DownloadItem
        id="1"
        title="Inception"
        posterPath="/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg"
        quality="1080p"
        progress={65}
        status="downloading"
        size="1.2 GB"
        onPause={() => console.log("Pause download")}
        onDelete={() => console.log("Delete download")}
      />
      <DownloadItem
        id="2"
        title="The Dark Knight"
        posterPath="/qJ2tW6WMUDux911r6m7haRef0WH.jpg"
        quality="720p"
        progress={100}
        status="completed"
        size="800 MB"
        onDelete={() => console.log("Delete download")}
      />
    </div>
  );
}
