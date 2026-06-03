import { useState, useRef, useEffect } from "react"
import Head from "next/head"
import {
  Upload as UploadIcon,
  FileText,
  Video,
  Image as ImageIcon,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  ScanSearch,
  Eye,
  FileSearch,
  Film,
} from "lucide-react"
import { Button } from "../components/ui/button"
import { cn } from "../lib/utils"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

async function uploadFile(file) {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${BACKEND_URL}/api/restrictcontent/upload`, {
    method: "POST",
    body: form,
  })
  const json = await res.json()
  if (res.ok && json.success) {
    return { ok: true, message: "File approved and stored successfully.", ...json }
  }
  return { ok: false, message: json.message || "File was rejected by content moderation." }
}

function FilePreview({ file, type }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!file) { setUrl(null); return }
    const obj = URL.createObjectURL(file)
    setUrl(obj)
    return () => URL.revokeObjectURL(obj)
  }, [file])

  if (!file || !url) return null

  if (type === "image") {
    return (
      <div className="rounded-lg overflow-hidden border border-blue-100 bg-blue-50">
        <img src={url} alt="preview" className="w-full max-h-48 object-contain" />
        <p className="text-xs text-slate-500 px-3 py-2 truncate border-t border-blue-100">
          {file.name} &middot; {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
    )
  }

  if (type === "video") {
    return (
      <div className="rounded-lg overflow-hidden border border-blue-100 bg-black">
        <video src={url} controls className="w-full max-h-48 object-contain" />
        <p className="text-xs text-slate-500 px-3 py-2 truncate border-t border-blue-100 bg-white">
          {file.name} &middot; {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
    )
  }

  const extIcons = { pdf: FileText, docx: FileText, txt: FileText }
  const extColors = { pdf: "text-red-500", docx: "text-blue-600", txt: "text-slate-500" }
  const ext = file.name.split(".").pop().toLowerCase()
  const Icon = extIcons[ext] || FileText
  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
      <Icon className={cn("w-8 h-8 shrink-0", extColors[ext] || "text-blue-500")} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB &middot; {ext.toUpperCase()}</p>
      </div>
    </div>
  )
}

function UploadPanel({ title, description, accept, inputId, type, Icon }) {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const ref = useRef(null)

  function onChange(e) {
    setFile(e.target.files?.[0] || null)
    setStatus(null)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) { setFile(dropped); setStatus(null) }
  }

  async function onUpload() {
    if (!file) return
    setBusy(true)
    setStatus(null)
    try {
      const result = await uploadFile(file)
      setStatus(result)
    } catch {
      setStatus({ ok: false, message: "Upload failed. Please check the server." })
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ""
      setFile(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover transition-shadow p-6 w-full max-w-sm">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-slate-800 font-semibold text-base leading-tight">{title}</h2>
          <p className="text-slate-400 text-xs mt-0.5">{description}</p>
        </div>
      </div>

      {/* Drop zone */}
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all",
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/50"
        )}
      >
        <UploadIcon className={cn("w-7 h-7 transition-colors", dragging ? "text-blue-600" : "text-slate-400")} />
        <p className="text-sm font-medium text-slate-600">
          {dragging ? "Drop to upload" : "Click to browse"}
        </p>
        <p className="text-xs text-slate-400">or drag &amp; drop</p>
        <input id={inputId} ref={ref} type="file" accept={accept} onChange={onChange} className="hidden" />
      </label>

      {/* Preview */}
      <FilePreview file={file} type={type} />

      {/* Upload button */}
      <Button
        onClick={onUpload}
        disabled={!file || busy}
        className="w-full"
        size="default"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Scanning…
          </>
        ) : (
          <>
            <ScanSearch className="w-4 h-4 mr-2" />
            Upload &amp; Scan
          </>
        )}
      </Button>

      {/* Result */}
      {status && (
        <div className={cn(
          "rounded-xl border p-4 text-sm",
          status.ok
            ? "bg-emerald-50 border-emerald-200"
            : "bg-red-50 border-red-200"
        )}>
          <div className="flex items-center gap-2 mb-1">
            {status.ok
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            }
            <span className={cn("font-semibold", status.ok ? "text-emerald-700" : "text-red-600")}>
              {status.ok ? "Approved" : "Blocked"}
            </span>
          </div>
          <p className="text-slate-600 text-xs leading-relaxed">{status.message}</p>
          {status.ok && (
            <div className="mt-2 pt-2 border-t border-emerald-200 text-xs text-slate-500 space-y-0.5">
              <p>Saved as: <span className="font-medium text-slate-700">{status.filename}</span></p>
              <p>Type: <span className="font-medium text-slate-700">{status.mimetype}</span></p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const FEATURES = [
  { Icon: Eye,        label: "CLIP Zero-Shot Vision AI" },
  { Icon: FileSearch, label: "OCR Text Scanning" },
  { Icon: Film,       label: "Frame-by-Frame Video" },
  { Icon: Shield,     label: "Keyword Document Filter" },
]

export default function Upload() {
  return (
    <div className="min-h-screen bg-[#f0f4f9]">
      <Head>
        <title>Content Moderation — TeamStack</title>
        <meta name="description" content="AI-powered content moderation" />
      </Head>

      {/* Top nav bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-800 text-sm">Content Moderation</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">TeamStack · Touchcore Systems</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Upload &amp; Scan</h1>
          <p className="text-slate-500 text-sm mt-1">
            Files are automatically scanned by AI. Violence, nudity, hate speech and explicit content are blocked before storage.
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap gap-2 mb-8">
          {FEATURES.map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <Icon className="w-3.5 h-3.5 text-blue-600" />
              {label}
            </div>
          ))}
        </div>

        {/* Panels */}
        <div className="flex flex-wrap gap-6">
          <UploadPanel
            title="Profile Picture"
            description="JPG, PNG, WebP, GIF · Max 500 MB"
            accept="image/jpeg,image/png,image/webp,image/gif"
            inputId="img-upload"
            type="image"
            Icon={ImageIcon}
          />
          <UploadPanel
            title="Document"
            description="PDF, DOCX, TXT · Max 500 MB"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            inputId="doc-upload"
            type="document"
            Icon={FileText}
          />
          <UploadPanel
            title="Video"
            description="MP4, MOV, WebM, MKV · Max 500 MB"
            accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mkv"
            inputId="vid-upload"
            type="video"
            Icon={Video}
          />
        </div>
      </main>
    </div>
  )
}

