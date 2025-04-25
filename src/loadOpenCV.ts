export const loadOpenCV = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.cv) {
      // OpenCV is already loaded
      resolve();
    } else {
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/master/opencv.js'; // Or your local path if using a local file
      script.async = true;
      script.onload = () => {
        if (window.cv) {
          resolve();
        } else {
          reject('OpenCV failed to load.');
        }
      };
      script.onerror = () => reject('Error loading OpenCV.js');
      document.head.appendChild(script);
    }
  });
};
