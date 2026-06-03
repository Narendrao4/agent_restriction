import path from "path"
import { fileURLToPath } from "url"

import pkg from "dialogflow"
const { SessionsClient } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const keyFilename = path.join(__dirname, "../../../keys/dialogflow-key.json")
const projectId = "voiceagent-qlyb"
const languageCode = "en"

function chunkMessage(text, maxLen = 256) {
  const chunks = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxLen))
    i += maxLen
  }
  return chunks
}

export default function (fastify, _opts, done) {
  const sessionClient = new SessionsClient({ keyFilename })

  fastify.post("/dialogflow", async (req, reply) => {
    const { message } = req.body
    if (!message) {
      return reply.code(400).send({ error: "Missing message" })
    }

    const sessionId = "user-session"
    const sessionPath = sessionClient.sessionPath(projectId, sessionId)

    const chunks = chunkMessage(message)
    const allReplies = []
    const audioBuffers = []
    let sawDialogflowNoAudio = false

    try {
      for (const chunk of chunks) {
        const request = {
          session: sessionPath,
          queryInput: {
            text: {
              text: chunk,
              languageCode,
            },
          },
          queryParams: {
            payload: {
              fields: {
                originalText: {
                  stringValue: chunk,
                  kind: "stringValue",
                },
              },
            },
          },
          outputAudioConfig: {
            audioEncoding: "OUTPUT_AUDIO_ENCODING_LINEAR_16",
          },
        }

        const [response] = await sessionClient.detectIntent(request)

        const fulfillment = response.queryResult?.fulfillmentText?.trim()
        const isFallback = response.queryResult?.intent?.isFallback || false
        allReplies.push(fulfillment || chunk)

        // Dialogflow-only mode: rely exclusively on detectIntent outputAudio.
        if (response.outputAudio && response.outputAudio.length > 0) {
          audioBuffers.push(Buffer.from(response.outputAudio))
        } else {
          sawDialogflowNoAudio = true
          fastify.log.warn("Dialogflow returned no outputAudio for a chunk")
        }

        // In Dialogflow-only mode, avoid stitching multiple fallback prompts
        // when a long message is chunked.
        if (isFallback) {
          break
        }
      }

      const combinedReply = allReplies.join(" ").trim()
      const audioBase64 = audioBuffers.length
        ? Buffer.concat(audioBuffers).toString("base64")
        : null
      let audioStatus = "ok"
      if (!audioBase64) {
        audioStatus = sawDialogflowNoAudio ? "dialogflow_no_audio" : "no_audio_generated"
      }

      return reply.send({
        reply: combinedReply || message,
        audio: audioBase64,
        audioStatus,
      })
    } catch (err) {
      console.error("Dialogflow error:", err.message)
      return reply.send({ reply: "", audio: null, error: err.message })
    }
  })

  done()
}
