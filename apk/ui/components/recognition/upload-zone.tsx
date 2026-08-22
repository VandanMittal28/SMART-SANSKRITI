"use client"

import { useRef } from "react"
import { Upload } from "lucide-react"

interface UploadZoneProps {
  onFileSelect: (file: File) => void
}

export function UploadZone({ onFileSelect }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file) return
    onFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <div
        className="border-2 border-dashed border-[#C9A84C]/50 rounded-2xl p-12 text-center transition-all duration-300 hover:border-[#C9A84C] hover:bg-[#C9A84C]/5 cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
            <Upload className="w-8 h-8 text-[#C9A84C]" />
          </div>
        </div>

        <h3 className="font-semibold text-[#F5E6D3] text-lg mb-2">
          Drag and drop file here
        </h3>

        <p className="text-[#C4A882] text-sm mb-4">
          JPG, JPEG, PNG accepted
        </p>

        <button
          className="px-6 py-2 gold-gradient text-[#0F0B1E] font-semibold rounded-lg transition-all duration-300 hover:scale-105"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
        >
          Browse files
        </button>
      </div>
    </div>
  )
}
