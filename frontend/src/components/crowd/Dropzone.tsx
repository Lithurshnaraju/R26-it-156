"use client";
// R26 dark-theme component styling

import { useCallback, useRef, useState } from "react";

export function Dropzone({
  accept,
  hint,
  onFile,
  fileName,
}: {
  accept: string;
  hint: string;
  onFile: (file: File) => void;
  fileName?: string | null;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFile(files[0]);
    },
    [onFile]
  );

  return (
    <div
      className={`viewfinder text-cyan-700 rounded-xl border border-dashed p-10 text-center transition-colors cursor-pointer ${
        isDragging
          ? "border-cyan-500 bg-cyan-500/10"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      aria-label={hint}
    >
      <span className="vf-tr" />
      <span className="vf-br" />
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-cyan-500/40 bg-white">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 16V4" />
          <path d="M6 10l6-6 6 6" />
          <path d="M4 20h16" />
        </svg>
      </div>
      <p className="mt-4 font-mono text-sm text-slate-800">
        {fileName ? fileName : "Drop file or click to browse"}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}