import { createRoot } from "react-dom/client";
import App from "./App";
import AppDebug from "./AppDebug";
import "./index.css";

// Utiliser la version de debug pour iOS
const isIOS = navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad');
const AppComponent = isIOS ? AppDebug : App;

createRoot(document.getElementById("root")!).render(<AppComponent />);
