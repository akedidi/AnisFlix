import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Charger Ionic CSS et config seulement si Capacitor est disponible
if (typeof window !== 'undefined' && (window as any).Capacitor) {
  import("./ionic.css").catch(err => {
    console.warn('Failed to load Ionic CSS:', err);
  });
  import("./lib/ionic").catch(err => {
    console.warn('Failed to load Ionic config:', err);
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

try {
  root.render(<App />);
} catch (error) {
  console.error("Error rendering app:", error);
  rootElement.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #000;
      color: #fff;
      padding: 20px;
      font-family: Arial, sans-serif;
    ">
      <h1 style="color: red; margin-bottom: 20px;">Erreur de rendu</h1>
      <pre style="background: #1a1a1a; padding: 20px; border-radius: 8px; overflow: auto; max-width: 90%;">
        ${error instanceof Error ? error.message : String(error)}
        ${error instanceof Error && error.stack ? '\n\n' + error.stack : ''}
      </pre>
    </div>
  `;
}
