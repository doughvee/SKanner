import { useState, useEffect } from "react";

declare global {
  interface Window {
    cv: any;
  }
}

export const useOpenCV = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkOpenCV = () => {
      if (window.cv && typeof window.cv.imread === "function") {
        setIsReady(true);
      }
    };

    if (document.readyState === "complete") {
      checkOpenCV();
    } else {
      window.addEventListener("load", checkOpenCV);
    }

    return () => {
      window.removeEventListener("load", checkOpenCV);
    };
  }, []);

  return { isReady };
};
