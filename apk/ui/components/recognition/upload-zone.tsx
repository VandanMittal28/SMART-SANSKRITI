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
          e.target.value = ''
        }}
      />
      <div
        className="border-2 border-dashed border-[#D6A84B]/50 rounded-2xl p-12 text-center transition-all duration-300 hover:border-[#D6A84B] hover:bg-[#D6A84B]/5 cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-[#D6A84B]/20 flex items-center justify-center">
            <Upload className="w-8 h-8 text-[#D6A84B]" />
          </div>
        </div>

        <h3 className="font-semibold text-[#F6F1E8] text-lg mb-2">
          Drag and drop file here
        </h3>

        <p className="text-[#AEB6C8] text-sm mb-4">
          JPG, JPEG, PNG accepted
        </p>

        <button
          className="px-6 py-2 gold-gradient text-[#080D1D] font-semibold rounded-lg transition-all duration-300 hover:scale-105"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
        >
          Browse files
        </button>
      </div>
    </div>
  )
}
