/* eslint-disable complexity */
import { checkDocumentIsSafe } from "./checkDocumentIsSafe.js"
import { checkImageIsSafe } from "./checkImageIsSafe.js"
import { checkVideoIsSafe, loadNSFWModel, BLOCKED_KEYWORDS } from "./checkVideo.js"

export async function initializeModerationPipeline() {
  console.log(" Initializing moderation pipeline...")
  await loadNSFWModel()

  try {
    await checkImageIsSafe(Buffer.alloc(1)) // warm-up
  } catch (err) {
    console.warn(" ViT warm-up failed (harmless):", err.message)
  }

  console.log(" Moderation pipeline initialized.")
}

/**
 * Centralized moderation pipeline based on file type and filename keywords.
 *
 * @param {Buffer} buffer - File content buffer
 * @param {string} filename - Original filename with extension
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function runModerationPipeline(buffer, filename) {
  if (!buffer || !filename || typeof filename !== "string") {
    return { allowed: false, reason: "Invalid input for moderation pipeline" }
  }

  const ext = filename.toLowerCase()
  console.log(` Running moderation for: ${filename}`)

  // Fast filename keyword check — before any ML inference
  const flaggedFromFilename = BLOCKED_KEYWORDS.find((word) => ext.includes(word.toLowerCase()))
  if (flaggedFromFilename) {
    console.warn(` Blocked by filename keyword: ${flaggedFromFilename}`)
    return {
      allowed: false,
      reason: `Filename contains restricted keyword: ${flaggedFromFilename}`,
    }
  }

  try {
    // Route by file extension
    if (ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".jfif") || ext.endsWith(".png") || ext.endsWith(".webp") || ext.endsWith(".gif")) {
      const safe = await checkImageIsSafe(buffer)
      console.log("[MODERATION] Image check result →", safe)
      return safe ? { allowed: true } : { allowed: false, reason: "Image contains unsafe or sensitive content" }
    }

    if (ext.endsWith(".mp4") || ext.endsWith(".mov") || ext.endsWith(".webm") || ext.endsWith(".mkv")) {
      const safe = await checkVideoIsSafe(buffer)
      console.log("[MODERATION] Video check result →", safe)
      return safe ? { allowed: true } : { allowed: false, reason: "Video contains unsafe or sensitive content" }
    }

    if (ext.endsWith(".pdf") || ext.endsWith(".docx") || ext.endsWith(".txt")) {
      const safe = await checkDocumentIsSafe(buffer, filename)
      console.log("[MODERATION] Document check result →", safe)
      return safe ? { allowed: true } : { allowed: false, reason: "Document contains prohibited or sensitive content" }
    }

    // Unknown file type — allow with warning
    console.warn(` Unknown file type. Allowing by default: ${ext}`)
    return { allowed: true }
  } catch (err) {
    console.error(" Moderation pipeline crashed:", err)
    return { allowed: false, reason: "Moderation process failed" }
  }
}
