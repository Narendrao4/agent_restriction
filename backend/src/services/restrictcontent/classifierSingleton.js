import { pipeline } from "@xenova/transformers"

let classifier

export async function getClassifier() {
  if (!classifier) {
    console.log("Loading CLIP zero-shot classifier...")
    classifier = await pipeline("zero-shot-image-classification", "Xenova/clip-vit-base-patch32")
    console.log(" CLIP classifier ready!")
  }
  return classifier
}
