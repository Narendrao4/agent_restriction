import fs from "fs"
import os from "os"
import path from "path"

import { pipeline } from "@xenova/transformers"
import ffmpegPath from "ffmpeg-static"
import ffmpeg from "fluent-ffmpeg"

ffmpeg.setFfmpegPath(ffmpegPath)

export let classifier

export async function loadNSFWModel() {
  if (!classifier) {
    console.log("Loading CLIP zero-shot classifier...")
    try {
      classifier = await pipeline("zero-shot-image-classification", "Xenova/clip-vit-base-patch32")
      console.log("CLIP classifier loaded successfully")
    } catch (error) {
      console.error("Failed to load CLIP classifier:", error.message)
      console.error("Error Stack:", error.stack)
      throw error
    }
  }
}

export const BLOCKED_KEYWORDS = [
  // ── Nudity / Adult sexual content ──────────────────────────────────
  "nude",
  "naked",
  "nudity",
  "topless",
  "bottomless",
  "genitalia",
  "genital",
  "penis",
  "vagina",
  "vulva",
  "phallus",
  "brassiere",
  "bandeau",
  "lingerie",
  "underwear",
  "bikini",
  "thong",
  "g-string",
  "swimsuit",
  "maillot",
  "sexy",
  "erotic",
  "breast",
  "nipple",
  "cleavage",
  "porn",
  "pornographic",
  "pornography",
  "hentai",
  "adult content",
  "explicit",
  "obscene",
  "lewd",
  "indecent",
  "sexual",
  "sex act",
  "intercourse",
  "fetish",
  "voyeur",
  "stripper",
  "escort",
  "prostitute",
  "prostitution",
  "brothel",
  "adultery",
  "miniskirt",

  // ── Violence & physical assault ─────────────────────────────────────
  "violence",
  "violent",
  "brutality",
  "brutal",
  "beating",
  "beaten",
  "battered",
  "slap",
  "slaps",
  "slapping",
  "punch",
  "punching",
  "kick",
  "kicking",
  "choking",
  "strangling",
  "strangulation",
  "stabbing",
  "stabbed",
  "torture",
  "torturing",
  "assault",
  "attack",
  "abuse",
  "fight",
  "fighting",
  "fistfight",
  "brawl",
  "riot",
  "lynching",
  "mauling",
  "sexual violence",
  "sexual assault",

  // ── Police brutality ────────────────────────────────────────────────
  "police brutality",
  "police beating",
  "police violence",
  "excessive force",
  "handcuff",
  "baton",
  "taser",
  "pepper spray",
  "restraint",

  // ── Gore / graphic injury ───────────────────────────────────────────
  "blood",
  "bloody",
  "gore",
  "gory",
  "wound",
  "corpse",
  "dead body",
  "decapitation",
  "beheading",
  "mutilation",
  "dismemberment",
  "massacre",
  "murder",
  "killing",
  "execution",
  "hanging",
  "suicide",
  "self-harm",
  "genocide",
  "bloodbath",
  "bloodshed",

  // ── Weapons ─────────────────────────────────────────────────────────
  "gun",
  "rifle",
  "pistol",
  "revolver",
  "shotgun",
  "firearm",
  "machine gun",
  "assault rifle",
  "sniper",
  "knife",
  "sword",
  "machete",
  "weapon",
  "grenade",
  "explosive",
  "bomb",
  "ied",
  "landmine",
  "chainsaw",

  // ── Extremism / terrorism ────────────────────────────────────────────
  "terrorist",
  "terrorism",
  "extremist",
  "extremism",
  "jihad",
  "war",
  "military",
  "shooting",
  "explosion",
  "bombing",
  "hostage",

  // ── Child safety ─────────────────────────────────────────────────────
  "childporn",
  "child porn",
  "childabuse",
  "child abuse",
  "child sexual",

  // ── Drugs ────────────────────────────────────────────────────────────
  "drugs",
  "cocaine",
  "heroin",
  "methamphetamine",
  "meth",
  "marijuana",
  "cannabis",
  "crack",
  "syringe",
  "injection",
]

// CLIP zero-shot labels — model scores the image against each text description
export const ZERO_SHOT_HARMFUL_LABELS = [
  "a person being beaten or physically assaulted",
  "police officer beating or using excessive force on a person",
  "violence fighting brawl punching kicking",
  "nudity naked body exposed genitals",
  "sexual explicit adult pornographic content",
  "person holding a gun firearm or weapon",
  "bloody graphic injury gore wound",
  "drug use syringe needle injection substance abuse",
  "sexual assault rape molestation",
  "child abuse or exploitation",
  "terrorist attack explosion bombing",
  "self-harm suicide hanging",
]
export const ZERO_SHOT_SAFE_LABEL = "safe normal everyday content"

// Per-label thresholds — sexual/nudity labels need higher confidence
// to avoid false positives on innocent images
export const ZERO_SHOT_LABEL_THRESHOLDS = {
  "nudity naked body exposed genitals": 0.40,
  "sexual explicit adult pornographic content": 0.40,
  "sexual assault rape molestation": 0.40,
  "a person being beaten or physically assaulted": 0.25,
  "police officer beating or using excessive force on a person": 0.20,
  "violence fighting brawl punching kicking": 0.25,
  "person holding a gun firearm or weapon": 0.30,
  "bloody graphic injury gore wound": 0.30,
  "drug use syringe needle injection substance abuse": 0.30,
  "child abuse or exploitation": 0.35,
  "terrorist attack explosion bombing": 0.30,
  "self-harm suicide hanging": 0.35,
}
export const ZERO_SHOT_DEFAULT_THRESHOLD = 0.30

export async function checkVideoIsSafe(videoBuf) {
  if (!classifier) {
    throw new Error("NSFW model not loaded!")
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "frames-"))
  const tmpVideoPath = path.join(tmpDir, "video.mp4")
  fs.writeFileSync(tmpVideoPath, videoBuf)

  try {
    console.log(" Extracting frames with fluent-ffmpeg...")
    await extractFrames(tmpVideoPath, tmpDir)
    const frames = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".jpg"))
    console.log(`Checking ${frames.length} frames.`)

    const allLabels = [...ZERO_SHOT_HARMFUL_LABELS, ZERO_SHOT_SAFE_LABEL]

    for (const frame of frames) {
      const output = await classifier(path.join(tmpDir, frame), allLabels)
      console.log(`Frame: ${frame} →`, output)

      const blocked = output.find((x) => {
        if (x.label === ZERO_SHOT_SAFE_LABEL) return false
        const threshold = ZERO_SHOT_LABEL_THRESHOLDS[x.label] ?? ZERO_SHOT_DEFAULT_THRESHOLD
        return x.score >= threshold
      })

      if (blocked) {
        console.log(` Blocked frame: ${frame} => "${blocked.label}" (score ${blocked.score})`)
      }

      if (blocked) {
        console.log(` Blocked: ${frame} => ${blocked.label} (${blocked.score})`)
        return false
      }
    }

    console.log(" Video passed NSFW check.")
    return true
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

function extractFrames(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(["-vf", "fps=1"])
      .output(`${outputDir}/frame_%03d.jpg`)
      .on("end", () => {
        console.log(" Frame extraction done.")
        resolve()
      })
      .on("error", (err) => {
        console.error(" FFmpeg failed:", err)
        reject(err)
      })
      .run()
  })
}
