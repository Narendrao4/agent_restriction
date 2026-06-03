/* eslint-disable complexity */
import fs from "fs"
import os from "os"
import path from "path"

import ExifImage from "exif"
import Tesseract from "tesseract.js"

import { BLOCKED_KEYWORDS, ZERO_SHOT_HARMFUL_LABELS, ZERO_SHOT_SAFE_LABEL, ZERO_SHOT_LABEL_THRESHOLDS, ZERO_SHOT_DEFAULT_THRESHOLD } from "./checkVideo.js"
import { getClassifier } from "./classifierSingleton.js"

// Whole-word match: "bra" must not match inside "Branch" or "library"
function containsKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i").test(text)
}

export async function checkImageIsSafe(imageBuf) {
  const classifier = await getClassifier()
  const tmpPath = path.join(os.tmpdir(), `img-${Date.now()}.jpg`)
  fs.writeFileSync(tmpPath, imageBuf)

  try {
    // Layer 1: EXIF metadata scan
    const exifText = await getExifText(tmpPath)
    console.log("EXIF text:", exifText)

    const exifFlagged = BLOCKED_KEYWORDS.find((w) => containsKeyword(exifText, w))
    if (exifFlagged) {
      console.log(` Blocked by EXIF: ${exifFlagged}`)
      return false
    }

    // Layer 2: OCR text scan
    const ocrText = await getImageOCRText(tmpPath)
    console.log("OCR text:", ocrText)

    const ocrFlagged = BLOCKED_KEYWORDS.find((w) => containsKeyword(ocrText, w))
    if (ocrFlagged) {
      console.log(` Blocked by OCR: ${ocrFlagged}`)
      return false
    }

    // Layer 3: CLIP zero-shot visual classification
    // Scores image against descriptive harmful content labels directly
    const allLabels = [...ZERO_SHOT_HARMFUL_LABELS, ZERO_SHOT_SAFE_LABEL]
    const output = await classifier(tmpPath, allLabels)
    console.log(`Zero-shot scores:`, output)

    const blocked = output.find((x) => {
      if (x.label === ZERO_SHOT_SAFE_LABEL) return false
      const threshold = ZERO_SHOT_LABEL_THRESHOLDS[x.label] ?? ZERO_SHOT_DEFAULT_THRESHOLD
      return x.score >= threshold
    })

    if (blocked) {
      console.log(` Blocked by classifier: "${blocked.label}" (score ${blocked.score})`)
      return false
    }

    return true
  } finally {
    fs.rmSync(tmpPath, { force: true })
  }
}

function getExifText(imgPath) {
  return new Promise((resolve) => {
    try {
      new ExifImage({ image: imgPath }, (error, exifData) => {
        if (error) {
          console.log("No EXIF or failed:", error.message)
          resolve("")
          return
        }

        const parts = [
          exifData.image?.ImageDescription || "",
          exifData.image?.UserComment || "",
          exifData.image?.XPTitle || "",
          exifData.image?.XPComment || "",
          exifData.image?.Copyright || "",
          exifData.image?.Software || "",
        ]

        resolve(parts.filter(Boolean).join(" ").trim())
        return
      })
    } catch (err) {
      console.error("EXIF error:", err)
      resolve("")
      return
    }

    return
  })
}

async function getImageOCRText(imgPath) {
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(imgPath, "eng", {
      logger: () => {},
    })
    return text || ""
  } catch (err) {
    console.error("OCR failed:", err)
    return ""
  }
}
