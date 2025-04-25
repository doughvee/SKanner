import React, { useRef } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Button } from "@mui/material";

interface CropModalProps {
  image: string;
  onCropComplete: (blob: Blob) => void;
  onCancel: () => void;
}

const CropModal: React.FC<CropModalProps> = ({ image, onCropComplete, onCancel }) => {
  const cropperRef = useRef<HTMLImageElement & { cropper: any }>(null);

  const handleDone = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.getCroppedCanvas().toBlob((blob: Blob | null) => {
        if (blob) onCropComplete(blob);
      }, "image/jpeg");
    }
  };

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.cropContainer}>
        <Cropper
          src={image}
          style={styles.cropperStyle}
          initialAspectRatio={NaN} // allows freeform
          guides={true}
          viewMode={1}
          dragMode="crop"
          responsive={true}
          autoCropArea={1}
          background={false}
          ref={cropperRef}
        />
      </div>

      <div style={styles.buttonGroup}>
        <Button
          variant="contained"
          onClick={handleDone}
          fullWidth
          style={styles.doneButton}
        >
          Done
        </Button>
        <Button
          variant="outlined"
          onClick={onCancel}
          fullWidth
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh", 
    width: "100vw", 
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    boxSizing: "border-box",
  },
  cropContainer: {
    position: "relative",
    width: "100%",
    height: "calc(100% - 120px)", // subtract height to leave space for buttons
    backgroundColor: "#000",
    borderRadius: "12px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
    marginBottom: "0.5rem", // this pushes the button group upward slightly
  },
  
  cropperStyle: {
    height: "100%", 
    width: "100%", 
    borderRadius: "12px", 
  },
  buttonGroup: {
    width: "100%",
    display: "flex",
    gap: "1rem",
    marginTop: "0.5rem", // lower this to move buttons upward
    padding: "0 1rem",
    flexDirection: "column",
  },
  
  doneButton: {
    backgroundColor: "	#0d6efd",
    color: "#fff",
    borderRadius: "8px",
    textTransform: "uppercase",
    fontWeight: "bold",
    padding: "12px",
    transition: "all 0.3s ease",
  },
  cancelButton: {
    borderColor: "#6c757d",
    color: "#6c757d",
    borderRadius: "8px",
    textTransform: "uppercase",
    fontWeight: "bold",
    padding: "12px",
    transition: "all 0.3s ease",
  },
};


export default CropModal;
