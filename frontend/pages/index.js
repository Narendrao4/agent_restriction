import { useState, useEffect } from "react"
import styles from "../styles/Home.module.css"

const paragraphs = [
  {
    id: 1,
    title: "About Artificial Intelligence",
    text: "Artificial intelligence is transforming the way we live and work. It encompasses machine learning, natural language processing, and computer vision to create systems that can perform tasks that typically require human intelligence. From recommendation systems to autonomous vehicles, AI is reshaping every industry and creating new possibilities that were once unimaginable.",
  },
  {
    id: 2,
    title: "The Digital Revolution",
    text: "We are living through one of the most significant technological revolutions in human history. The rapid advancement of computing power, combined with the explosion of data availability, has created unprecedented opportunities for innovation. Businesses and individuals alike are adapting to a world where digital tools are not just helpful but absolutely essential for everyday life.",
  },
  {
    id: 3,
    title: "Voice Technology and the Future",
    text: "Voice technology is becoming increasingly sophisticated, enabling more natural and intuitive interactions between humans and machines. As speech recognition accuracy improves and natural language understanding deepens, voice interfaces are expanding beyond simple commands to complex conversations. This makes technology more accessible and inclusive for everyone around the world.",
  },
]

export default function Home() {
  const [mode, setMode] = useState("synthesis") // "synthesis" | "dialogflow"
  const [loading, setLoading] = useState(null)
  const [playing, setPlaying] = useState(null)
  const [error, setError] = useState(null)
  const [manualText, setManualText] = useState("")
  const [manualLoading, setManualLoading] = useState(false)
  const [manualPlaying, setManualPlaying] = useState(false)

  useEffect(() => {
    return () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel() }
  }, [])

  function stopAll() {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel()
    setPlaying(null)
    setManualPlaying(false)
  }

  function switchMode(newMode) {
    stopAll()
    setLoading(null)
    setManualLoading(false)
    setError(null)
    setMode(newMode)
  }

  function speakWithSynthesis(text, id, isManual) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setError("Speech Synthesis is not supported in this browser.")
      return
    }
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 1
    utter.pitch = 1
    utter.onend = () => { isManual ? setManualPlaying(false) : setPlaying(null) }
    utter.onerror = (e) => {
      isManual ? setManualPlaying(false) : setPlaying(null)
      if (e.error !== "interrupted") setError("Speech synthesis error: " + e.error)
    }
    window.speechSynthesis.speak(utter)
    if (isManual) setManualPlaying(true); else setPlaying(id)
  }

  async function speakWithDialogflow(text, id, isManual) {
    try {
      const res = await fetch("/api/voiceagent/dialogflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Request failed"); return }
      if (data.audio) {
        await playAudio(data.audio, id, isManual)
      } else {
        setError(
          data.audioStatus === "dialogflow_no_audio"
            ? "Dialogflow returned no audio. Check agent TTS settings."
            : "No audio received from Dialogflow."
        )
      }
    } catch (err) {
      setError("Could not connect to the voice agent backend.")
    }
  }

  async function playAudio(base64Audio, id, isManual) {
    if (isManual) setManualPlaying(true); else setPlaying(id)
    try {
      const binaryString = atob(base64Audio)
      const audioBytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) audioBytes[i] = binaryString.charCodeAt(i)
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const audioContext = new AudioCtx()
      if (audioContext.state === "suspended") await audioContext.resume()
      const audioBuffer = await audioContext.decodeAudioData(audioBytes.buffer)
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      source.onended = () => {
        if (isManual) setManualPlaying(false); else setPlaying(null)
        audioContext.close()
      }
      source.start(0)
    } catch (_err) {
      try {
        const binaryString = atob(base64Audio)
        const audioBytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) audioBytes[i] = binaryString.charCodeAt(i)
        const blob = new Blob([audioBytes], { type: "audio/wav" })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.onended = () => { if (isManual) setManualPlaying(false); else setPlaying(null); URL.revokeObjectURL(url) }
        audio.onerror = () => { setError("Audio playback failed."); if (isManual) setManualPlaying(false); else setPlaying(null); URL.revokeObjectURL(url) }
        await audio.play()
      } catch (e) {
        setError(`Audio playback failed: ${e.message}`)
        if (isManual) setManualPlaying(false); else setPlaying(null)
      }
    }
  }

  async function handleSpeak(id, text) {
    if (loading !== null || manualLoading) return
    setError(null)
    stopAll()
    if (mode === "synthesis") {
      speakWithSynthesis(text, id, false)
    } else {
      setLoading(id)
      await speakWithDialogflow(text, id, false)
      setLoading(null)
    }
  }

  async function handleManualSpeak() {
    const text = manualText.trim()
    if (!text || loading !== null || manualLoading || manualPlaying) return
    setError(null)
    stopAll()
    if (mode === "synthesis") {
      speakWithSynthesis(text, null, true)
    } else {
      setManualLoading(true)
      await speakWithDialogflow(text, null, true)
      setManualLoading(false)
    }
  }

  const isBusy = loading !== null || manualLoading

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.badge}>Voice Agent Demo</span>
          <h1 className={styles.title}>Read Aloud with AI</h1>
          <p className={styles.subtitle}>
            Click the speaker on any paragraph to hear it. Toggle between browser
            Speech Synthesis and Google Dialogflow TTS.
          </p>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggleBtn} ${mode === "synthesis" ? styles.toggleBtnActive : ""}`}
              onClick={() => switchMode("synthesis")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              Speech Synthesis
              <span className={styles.toggleTag}>Browser</span>
            </button>
            <button
              className={`${styles.toggleBtn} ${mode === "dialogflow" ? styles.toggleBtnActive : ""}`}
              onClick={() => switchMode("dialogflow")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
              </svg>
              Dialogflow
              <span className={styles.toggleTag}>Google API</span>
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {error && (
          <div className={styles.errorBanner}>
            <span>⚠</span> {error}
            <button className={styles.dismissBtn} onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className={styles.modeIndicator}>
          <span className={`${styles.modeChip} ${mode === "synthesis" ? styles.modeChipSynthesis : styles.modeChipDialogflow}`}>
            {mode === "synthesis" ? "🔊 Speech Synthesis — Browser built-in" : "🤖 Dialogflow TTS — Google API"}
          </span>
          {(playing !== null || manualPlaying) && (
            <button className={styles.stopChipBtn} onClick={stopAll}>■ Stop</button>
          )}
        </div>

        <div className={styles.grid}>
          {paragraphs.map((p) => {
            const isLoading = loading === p.id
            const isPlaying = playing === p.id
            const isDisabled = isBusy

            return (
              <article key={p.id} className={`${styles.card} ${isPlaying ? styles.cardActive : ""}`}>
                <div className={styles.cardTop}>
                  <span className={styles.cardNumber}>0{p.id}</span>
                  <button
                    className={`${styles.speakBtn} ${isLoading ? styles.btnLoading : ""} ${isPlaying ? styles.btnPlaying : ""}`}
                    onClick={() => handleSpeak(p.id, p.text)}
                    disabled={isDisabled}
                    title={isPlaying ? "Playing…" : "Read aloud"}
                    aria-label={isPlaying ? "Playing audio" : "Read paragraph aloud"}
                  >
                    {isLoading ? (
                      <svg className={styles.spinner} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                      </svg>
                    ) : isPlaying ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                      </svg>
                    )}
                  </button>
                </div>

                <h2 className={styles.cardTitle}>{p.title}</h2>
                <p className={styles.cardText}>{p.text}</p>

                {isPlaying && (
                  <div className={styles.waveBar}>
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={styles.wave} style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>

        {/* ── Manual text area ── */}
        <section className={styles.manualSection}>
          <div className={styles.manualHeader}>
            <h3 className={styles.manualTitle}>Custom Text to Speak</h3>
            <p className={styles.manualSubtitle}>
              Type anything and click <strong>Speak</strong> using the active engine
            </p>
          </div>
          <textarea
            className={styles.manualTextarea}
            placeholder="Type or paste any text here…"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={4}
          />
          <div className={styles.manualActions}>
            <span className={styles.charCount}>{manualText.length} chars</span>
            <button
              className={`${styles.manualSendBtn} ${manualPlaying ? styles.manualSendBtnPlaying : ""}`}
              onClick={handleManualSpeak}
              disabled={!manualText.trim() || isBusy || manualPlaying}
            >
              {manualLoading ? (
                <>
                  <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16 }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  Fetching…
                </>
              ) : manualPlaying ? (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                  Playing…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                  </svg>
                  Speak
                </>
              )}
            </button>
          </div>
          {manualPlaying && (
            <div className={styles.waveBar} style={{ marginTop: 12 }}>
              {[...Array(7)].map((_, i) => (
                <span key={i} className={styles.wave} style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
