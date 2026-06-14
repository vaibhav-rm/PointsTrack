'use client'

import { useState } from 'react'
import { Plus, X, Upload, Megaphone, Link as LinkIcon, Image as ImageIcon, Palette, Layout, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadFile, LINK_TYPES, CLUB_SECTIONS } from '@/lib/api'

export interface ClubCustomization {
  accentColor: string
  secondaryColor: string
  coverStyle: 'gradient' | 'solid'
  links: { type: string; url: string }[]
  gallery: string[]
  announcement: string
  announcementLink: string
  hiddenSections: string[]
}

export default function ClubPageCustomizer({
  value,
  onChange,
}: {
  value: ClubCustomization
  onChange: (patch: Partial<ClubCustomization>) => void
}) {
  const [uploading, setUploading] = useState(false)

  // ---- Links ----
  const addLink = () => onChange({ links: [...value.links, { type: 'website', url: '' }] })
  const updateLink = (i: number, patch: Partial<{ type: string; url: string }>) =>
    onChange({ links: value.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) })
  const removeLink = (i: number) => onChange({ links: value.links.filter((_, idx) => idx !== i) })

  // ---- Gallery ----
  const uploadGallery = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) urls.push(await uploadFile(file))
      onChange({ gallery: [...value.gallery, ...urls] })
      toast.success(`Added ${urls.length} photo${urls.length > 1 ? 's' : ''}`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }
  const removePhoto = (i: number) => onChange({ gallery: value.gallery.filter((_, idx) => idx !== i) })

  // ---- Sections ----
  const toggleSection = (key: string) =>
    onChange({
      hiddenSections: value.hiddenSections.includes(key)
        ? value.hiddenSections.filter((k) => k !== key)
        : [...value.hiddenSections, key],
    })

  const Section = ({ icon: Icon, title, children }: any) => (
    <div className="border-t border-slate-700/50 pt-6">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
        <Icon className="w-4 h-4 text-slate-400" /> {title}
      </label>
      {children}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Announcement */}
      <Section icon={Megaphone} title="Pinned Announcement">
        <input
          value={value.announcement}
          onChange={(e) => onChange({ announcement: e.target.value })}
          placeholder="e.g. Recruiting new members — apply now!"
          maxLength={280}
          className="w-full px-4 py-2 mb-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <input
          value={value.announcementLink}
          onChange={(e) => onChange({ announcementLink: e.target.value })}
          placeholder="Optional link (https://…)"
          className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
        />
      </Section>

      {/* Links */}
      <Section icon={LinkIcon} title="Social & Contact Links">
        <div className="space-y-2">
          {value.links.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={link.type}
                onChange={(e) => updateLink(i, { type: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white text-sm capitalize focus:outline-none focus:border-cyan-500"
              >
                {LINK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                value={link.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                placeholder={link.type === 'email' ? 'name@club.com' : 'https://…'}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
              />
              <button type="button" onClick={() => removeLink(i)} className="p-2 text-slate-400 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addLink} className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300">
            <Plus className="w-4 h-4" /> Add link
          </button>
        </div>
      </Section>

      {/* Gallery */}
      <Section icon={ImageIcon} title="Photo Gallery">
        {value.gallery.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
            {value.gallery.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm cursor-pointer hover:bg-cyan-500/20">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Add photos'}
          <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={(e) => uploadGallery(e.target.files)} />
        </label>
      </Section>

      {/* Theme depth */}
      <Section icon={Palette} title="Cover & Colour">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {(['gradient', 'solid'] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onChange({ coverStyle: style })}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize border transition-colors ${
                  value.coverStyle === style
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
          {value.coverStyle === 'gradient' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Gradient blends into:</span>
              <input
                type="color"
                value={value.secondaryColor || value.accentColor}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                className="w-9 h-9 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
              />
            </div>
          )}
          {/* Preview */}
          <div
            className="h-9 w-28 rounded-lg border border-slate-700"
            style={{
              background:
                value.coverStyle === 'solid'
                  ? value.accentColor
                  : `linear-gradient(135deg, ${value.accentColor}, ${value.secondaryColor || value.accentColor})`,
            }}
          />
        </div>
      </Section>

      {/* Section visibility */}
      <Section icon={Layout} title="Sections (uncheck to hide on your page)">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CLUB_SECTIONS.map((s) => {
            const visible = !value.hiddenSections.includes(s.key)
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSection(s.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  visible ? 'bg-slate-800/60 border-slate-600 text-white' : 'border-slate-800 text-slate-500'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${visible ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'}`}>
                  {visible && <span className="text-[9px] text-white">✓</span>}
                </span>
                {s.label}
              </button>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
