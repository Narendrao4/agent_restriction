import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

import { runModerationPipeline } from "./moderationPipeline.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const UPLOAD_DIR = path.join(__dirname, "../../../uploads")

export default function restrictContentRoutes(fastify, _opts, done) {
  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }

  /**
   * POST /api/restrictcontent/upload
   * Accepts: multipart/form-data with a single "file" field
   * Returns: 200 if safe and stored, 400 if blocked or invalid
   */
  fastify.post("/upload", async (req, reply) => {
    let fileBuf = null
    let fileMeta = null

    for await (const part of req.parts()) {
      if (part.type === "file") {
        fileBuf = await part.toBuffer()
        fileMeta = part
        break // only first file needed
      }
    }

    if (!fileBuf || !fileMeta || !fileMeta.filename) {
      return reply.code(400).send({ success: false, message: "No file uploaded." })
    }

    const { allowed, reason } = await runModerationPipeline(fileBuf, fileMeta.filename)

    if (!allowed) {
      return reply.code(400).send({
        success: false,
        message: reason || "File violates content policy and was rejected.",
      })
    }

    // Safe — store locally under uploads/
    const safeName = `${Date.now()}-${fileMeta.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    const destPath = path.join(UPLOAD_DIR, safeName)
    fs.writeFileSync(destPath, fileBuf)

    return reply.code(200).send({
      success: true,
      message: "File passed content moderation and was stored successfully.",
      filename: safeName,
      originalName: fileMeta.filename,
      mimetype: fileMeta.mimetype,
      size: fileBuf.length,
    })
  })

  /**
   * GET /api/restrictcontent/files
   * Lists all stored (approved) files
   */
  fastify.get("/files", async (_req, reply) => {
    const files = fs.existsSync(UPLOAD_DIR)
      ? fs.readdirSync(UPLOAD_DIR).map((name) => {
          const stat = fs.statSync(path.join(UPLOAD_DIR, name))
          return { name, size: stat.size, uploadedAt: stat.birthtime }
        })
      : []
    return reply.send({ success: true, files })
  })

  done()
}
