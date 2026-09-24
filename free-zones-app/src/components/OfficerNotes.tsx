import { useState, useEffect } from 'react'

interface OfficerNotesProps {
  sectionId: string
  lang: 'en' | 'bm'
}

const STORAGE_KEY = 'customs_act_officer_notes'

export function OfficerNotes({ sectionId, lang }: OfficerNotesProps) {
  const [notes, setNotes] = useState<Record<string, { text: string; updatedAt: number }>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  const [isOpen, setIsOpen] = useState(false)
  const [currentText, setCurrentText] = useState('')

  useEffect(() => {
    setCurrentText(notes[sectionId]?.text || '')
  }, [sectionId, notes])

  const handleSave = () => {
    const updated = {
      ...notes,
      [sectionId]: {
        text: currentText.trim(),
        updatedAt: Date.now(),
      },
    }
    if (!currentText.trim()) {
      delete updated[sectionId]
    }
    setNotes(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}
    setIsOpen(false)
  }

  const handleDelete = () => {
    const updated = { ...notes }
    delete updated[sectionId]
    setNotes(updated)
    setCurrentText('')
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}
    setIsOpen(false)
  }

  const hasNote = Boolean(notes[sectionId]?.text)

  return (
    <div className="officer-notes-container">
      <div className="officer-notes-bar">
        <button
          type="button"
          className={`officer-notes-btn ${hasNote ? 'has-note' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>📝</span>
          <span>
            {hasNote
              ? lang === 'bm'
                ? 'Lihat / Kemas Kini Nota Pegawai'
                : 'View / Edit Officer Note'
              : lang === 'bm'
                ? '+ Tambah Nota Pegawai'
                : '+ Add Officer Note'}
          </span>
          {hasNote && <span className="note-badge">●</span>}
        </button>
      </div>

      {isOpen && (
        <div className="officer-notes-editor">
          <div className="officer-notes-editor-head">
            <h4>
              {lang === 'bm'
                ? `Nota Pegawai — Seksyen ${sectionId}`
                : `Officer Confidential Note — Section ${sectionId}`}
            </h4>
            {notes[sectionId]?.updatedAt && (
              <span className="note-time">
                {new Date(notes[sectionId].updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <textarea
            className="officer-notes-textarea"
            rows={4}
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            placeholder={
              lang === 'bm'
                ? 'Tulis rujukan kes, tafsiran operasi atau catatan pegawai di sini...'
                : 'Write case references, operational interpretations, or officer notes here...'
            }
          />
          <div className="officer-notes-actions">
            <button type="button" className="btn-note-save" onClick={handleSave}>
              💾 {lang === 'bm' ? 'Simpan' : 'Save Note'}
            </button>
            {hasNote && (
              <button type="button" className="btn-note-delete" onClick={handleDelete}>
                🗑️ {lang === 'bm' ? 'Padam' : 'Delete'}
              </button>
            )}
            <button type="button" className="btn-note-cancel" onClick={() => setIsOpen(false)}>
              {lang === 'bm' ? 'Batal' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
