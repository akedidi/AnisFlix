import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/ionic"; // Configuration Ionic

createRoot(document.getElementById("root")!).render(<App />);
