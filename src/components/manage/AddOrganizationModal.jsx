import { useState } from 'react'
import { useStore } from '../../lib/store.js'

/**
 * Self-service "add a new organization" — a real scope change from how every org added so far
 * has worked (Claude sourcing the real logo/colors from the program's own athletics site, see
 * docs/PROGRAMS.md). Here the client supplies their own logo file and picks their own colors
 * directly, per Josh's explicit request for a button that lets him add a new org himself. The
 * uploaded logo is stored as a data URI directly in the browser store (no backend/file storage
 * exists yet) — fine at this scale, worth revisiting once real Supabase storage is connected.
 */
export default function AddOrganizationModal({ open, onClose, onCreated }) {
  const store = useStore()
  const [name, setName] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState(null)
  const [colorPrimary, setColorPrimary] = useState('#14b8a6')
  const [colorAccent, setColorAccent] = useState('#14b8a6')

  if (!open) return null

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogoDataUrl(reader.result)
    reader.readAsDataURL(file)
  }

  function reset() {
    setName('')
    setLogoDataUrl(null)
    setColorPrimary('#14b8a6')
    setColorAccent('#14b8a6')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const newOrgId = await store.addOrganization({
      name: name.trim(),
      logoUrl: logoDataUrl,
      colorPrimary,
      colorAccent,
    })
    reset()
    onCreated(newOrgId)
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-lg p-5 w-full max-w-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text">Add Organization</h2>
          <p className="text-xs text-muted mt-1">
            Creates a new org you can immediately add teams and a roster under (in Manage Teams).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="text-sm text-muted flex flex-col gap-1">
            Organization name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Riverside Athletics"
              required
              className="bg-surface2 border border-border rounded-md px-2 py-2 text-text"
            />
          </label>

          <label className="text-sm text-muted flex flex-col gap-1">
            Logo (optional)
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="block text-xs text-text file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-accent file:text-accentFg file:font-medium file:cursor-pointer"
            />
            {logoDataUrl && (
              <img src={logoDataUrl} alt="Logo preview" className="w-12 h-12 object-contain bg-white rounded-md mt-1" />
            )}
          </label>

          <div className="flex gap-3">
            <label className="text-sm text-muted flex flex-col gap-1">
              Primary color
              <input
                type="color"
                value={colorPrimary}
                onChange={(e) => setColorPrimary(e.target.value)}
                className="w-14 h-9 bg-surface2 border border-border rounded-md"
              />
            </label>
            <label className="text-sm text-muted flex flex-col gap-1">
              Accent color
              <input
                type="color"
                value={colorAccent}
                onChange={(e) => setColorAccent(e.target.value)}
                className="w-14 h-9 bg-surface2 border border-border rounded-md"
              />
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90"
            >
              Create Organization
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="text-sm border border-border text-muted px-4 py-2 rounded-md hover:text-text"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
