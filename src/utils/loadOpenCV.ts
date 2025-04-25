// src/utils/loadOpenCV.ts
declare const cv: any;

let isOpenCVLoaded = false;

const loadOpenCV = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isOpenCVLoaded || (window as any).cv?.imread) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.5.5/opencv.js";
    script.async = true;
    script.onload = () => {
      cv["onRuntimeInitialized"] = () => {
        isOpenCVLoaded = true;
        resolve();
      };
    };
    script.onerror = () => reject("Failed to load OpenCV.");
    document.body.appendChild(script);
  });
};

export default loadOpenCV;
