import Fastify from "fastify"
import cors from "@fastify/cors"
import fastifyMultipart from "@fastify/multipart"

import dialogflow from "./services/voiceagent/dialogflow.js"
import { loadNSFWModel } from "./services/restrictcontent/checkVideo.js"
import restrictContentRoutes from "./services/restrictcontent/uploadRoutes.js"

const fastify = Fastify({ logger: true })

await fastify.register(cors, {
  origin: ["http://localhost:3000"],
  credentials: true,
})

fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max per file
    files: 1,
  },
})

fastify.get("/health", async () => ({ status: "ok" }))

fastify.register(dialogflow, { prefix: "/api/voiceagent" })
fastify.register(restrictContentRoutes, { prefix: "/api/restrictcontent" })

try {
  fastify.log.info("Loading content moderation model (ViT)...")
  await loadNSFWModel()
  fastify.log.info("Content moderation model ready.")

  await fastify.listen({ port: 3001, host: "0.0.0.0" })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
