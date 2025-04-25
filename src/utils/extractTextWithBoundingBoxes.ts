import Tesseract from "tesseract.js";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedWord {
  text: string;
  bbox: BoundingBox;
}

export const extractTextWithBoundingBoxes = async (
  image: string
): Promise<ExtractedWord[]> => {
  try {
    const { data } = await Tesseract.recognize(image, "eng", {
      logger: (m) => console.log(m), // Logs OCR progress
    });

    console.log("Tesseract Output:", data); // 🔍 Debugging

    // 🔥 Check if `data.blocks` exists (for bounding boxes)
    if (data.blocks) {
      return data.blocks.flatMap((block: any) =>
        block.paragraphs.flatMap((paragraph: any) =>
          paragraph.lines.flatMap((line: any) =>
            line.words.map((word: any) => ({
              text: word.text,
              bbox: {
                x: word.bbox?.x0 ?? 0,
                y: word.bbox?.y0 ?? 0,
                width: (word.bbox?.x1 ?? 0) - (word.bbox?.x0 ?? 0),
                height: (word.bbox?.y1 ?? 0) - (word.bbox?.y0 ?? 0),
              },
            }))
          )
        )
      );
    }

    // 🔥 Fallback: If no structured data, return plain text
    if (data.text) {
      return [{ text: data.text, bbox: { x: 0, y: 0, width: 0, height: 0 } }];
    }

    console.error("No recognized text data found.");
    return [];
  } catch (error) {
    console.error("OCR Processing Error:", error);
    return [];
  }
};
