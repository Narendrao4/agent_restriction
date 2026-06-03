import fs from "fs"
import os from "os"
import path from "path"

import mammoth from "mammoth"
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js"

// Whole-word match to avoid false positives (e.g. "bra" inside "Branch")
function containsKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i").test(text)
}

const BLOCKED_KEYWORDS = [
  // Sexual / adult
  "rape",
  "sexual assault",
  "sexual violence",
  "gang rape",
  "molestation",
  "molest",
  "pornography",
  "porn",
  "nude",
  "nudity",
  "obscene",
  "explicit content",
  "prostitution",
  "adultery",
  "escort service",
  "child porn",
  "child abuse",
  "underage",
  // Violence & brutality
  "abuse",
  "beating",
  "police brutality",
  "excessive force",
  "torture",
  "assault",
  "murder",
  "killing",
  "massacre",
  "genocide",
  "lynching",
  "execution",
  "beheading",
  "decapitation",
  "mutilation",
  "bloodshed",
  "gore",
  // Weapons & explosives
  "weapon",
  "gun",
  "firearm",
  "explosive",
  "bomb",
  "grenade",
  "ied",
  // Terrorism & extremism
  "terrorist",
  "terrorism",
  "extremist",
  "extremism",
  "jihad",
  "hate speech",
  "slur",
  "white supremacy",
  "neo-nazi",
  // Self-harm
  "suicide",
  "self-harm",
  "self harm",
  // Drugs
  "drugs",
  "cocaine",
  "heroin",
  "methamphetamine",
  "drug trafficking",
]

async function extractPdfText(buffer) {
  const loadingTask = pdfjsLib.getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  let text = ""

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => item.str).join(" ") + " "
  }

  return text
}

export async function checkDocumentIsSafe(buffer, originalName) {
  const tmpPath = path.join(os.tmpdir(), `doc-${Date.now()}-${originalName}`)
  const needsTmp = originalName.endsWith(".docx") || originalName.endsWith(".txt")

  if (needsTmp) {
    fs.writeFileSync(tmpPath, buffer)
  }

  try {
    let text = ""

    if (originalName.endsWith(".pdf")) {
      text = await extractPdfText(buffer)
    } else if (originalName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ path: tmpPath })
      text = result.value
    } else if (originalName.endsWith(".txt")) {
      text = fs.readFileSync(tmpPath, "utf-8")
    } else {
      console.warn(`Unsupported file type: ${originalName}`)
      return true
    }

    const normalizedText = text.toLowerCase()
    console.log("Document text preview:", normalizedText.slice(0, 300))

    const flagged = BLOCKED_KEYWORDS.find((word) => {
      if (containsKeyword(text, word)) {
        console.log(` Blocked by document text: "${word}"`)
        return true
      }
      return false
    })

    return !flagged
  } catch (err) {
    console.error("Error during document check:", err)
    return false
  } finally {
    if (needsTmp) {
      try {
        fs.rmSync(tmpPath, { force: true })
      } catch (err) {
        console.warn(`Failed to remove temp file ${tmpPath}:`, err.message)
      }
    }
  }
}
