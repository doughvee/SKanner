import React, { useEffect, useState } from "react";
import { extractTextWithBoundingBoxes } from "../utils/extractTextWithBoundingBoxes";

const OCRTextSelection = ({ image }: { image: string }) => {
  const [textData, setTextData] = useState<
    { text: string; bbox: { x: number; y: number; width: number; height: number } }[]
  >([]);

  useEffect(() => {
    const processImage = async () => {
      const extractedData = await extractTextWithBoundingBoxes(image);
      setTextData(extractedData);
    };

    if (image) processImage();
  }, [image]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <img src={image} alt="Receipt" style={{ width: "100%" }} />
      {textData.map((word, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            top: `${word.bbox.y}px`,
            left: `${word.bbox.x}px`,
            width: `${word.bbox.width}px`,
            height: `${word.bbox.height}px`,
            border: "1px solid red",
            backgroundColor: "rgba(255, 0, 0, 0.2)",
            cursor: "pointer",
          }}
        >
          {word.text}
        </div>
      ))}
    </div>
  );
};

export default OCRTextSelection;
