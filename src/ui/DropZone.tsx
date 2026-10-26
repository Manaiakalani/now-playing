import { useState, type DragEvent, type ReactNode } from "react";

interface Props {
  onFile: (file: File) => void;
  children: ReactNode;
}

export function DropZone({ onFile, children }: Props) {
  const [over, setOver] = useState(false);

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setOver(true);
  };
  const onDragLeave = () => setOver(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      className={`dropzone ${over ? "is-over" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {over ? <div className="drop-veil">Drop the track</div> : null}
    </div>
  );
}
