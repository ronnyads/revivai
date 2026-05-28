'use client'

import { useRef, useState, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react'

interface Props {
  src: string
  frameClass: string
}

export default function VideoPlayer({ src, frameClass }: Props) {
  const videoRef        = useRef<HTMLVideoElement>(null)
  const progressBarRef  = useRef<HTMLDivElement>(null)
  const [playing, setPlaying]       = useState(false)
  const [muted, setMuted]           = useState(true)
  const [progress, setProgress]     = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]     = useState(0)
  const [hovering, setHovering]     = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.loop  = true
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [src])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  function handleFullscreen(e: React.MouseEvent) {
    e.stopPropagation()
    videoRef.current?.requestFullscreen?.()
  }

  function handleTimeUpdate() {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    if (v.duration) setProgress((v.currentTime / v.duration) * 100)
  }

  function handleLoadedMetadata() {
    const v = videoRef.current
    if (!v) return
    setDuration(v.duration)
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    const v   = videoRef.current
    const bar = progressBarRef.current
    if (!v || !bar || !v.duration) return
    const rect = bar.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = pct * v.duration
  }

  function fmt(s: number) {
    if (!isFinite(s) || s < 0) return '0:00'
    const m   = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const showOverlay = hovering || !playing

  return (
    <div
      className={`${frameClass} relative overflow-hidden rounded-xl border border-zinc-800 bg-black cursor-pointer select-none`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-contain"
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Centro: play / pause overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${
          showOverlay ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className={`rounded-full bg-black/55 p-4 backdrop-blur-[2px] border border-white/10 transition-transform duration-150 ${
            hovering ? 'scale-100' : 'scale-90'
          }`}
        >
          {playing
            ? <Pause size={18} className="text-white fill-white" />
            : <Play  size={18} className="text-white fill-white translate-x-0.5" />
          }
        </div>
      </div>

      {/* Barra de controles inferior */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-200 ${
          hovering ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Gradiente de sombra */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-2 px-3 pb-2.5 pt-5">
          {/* Progress bar */}
          <div
            ref={progressBarRef}
            className="flex-1 h-[3px] bg-white/20 rounded-full cursor-pointer group/prog hover:h-1 transition-all duration-100"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-white rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full translate-x-1/2 opacity-0 group-hover/prog:opacity-100 shadow transition-opacity" />
            </div>
          </div>

          {/* Tempo */}
          <span className="text-[9px] text-white/55 tabular-nums shrink-0">
            {fmt(currentTime)}/{fmt(duration)}
          </span>

          {/* Mute */}
          <button
            onClick={toggleMute}
            className="text-white/55 hover:text-white transition-colors"
          >
            {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={handleFullscreen}
            className="text-white/55 hover:text-white transition-colors"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
