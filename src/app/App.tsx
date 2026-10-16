import { useEffect } from "react";
import { MazeGame } from "./components/Maze";

export default function App() {
  useEffect(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="white"/><polygon points="50,22 78,50 50,78 22,50" fill="black"/></svg>`;
    const link =
      document.querySelector<HTMLLinkElement>("link[rel~='icon']") ??
      document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    document.head.appendChild(link);
  }, []);

  return <MazeGame />;
}
