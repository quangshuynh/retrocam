import { useRef, useState } from 'react'
import dropzone from '../assets/dropzone.webp'

export default function Dropzone({ onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(list) {
    const file = Array.from(list || []).find((item) => item.type.startsWith('video/'))
    if (file) onFile(file)
  }

  return (
    <div
      className={`dropzone${dragging ? ' is-dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        handleFiles(event.dataTransfer.files)
      }}
    >
      <div className="dropzone-inner">
        <img className="dropzone-cam" src={dropzone} alt="" />
        <h2>Drop a video in</h2>
        <p>MP4, MOV, WebM and anything else your browser can decode. Nothing is uploaded, all of it runs on this device.</p>
        <button type="button" className="button primary" onClick={() => inputRef.current?.click()}>
          Choose a file
        </button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="video/*"
          onChange={(event) => {
            handleFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
