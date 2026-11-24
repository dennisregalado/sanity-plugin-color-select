import {useToast} from '@sanity/ui/toast'
import {useRef, useState} from 'react'
import type {SanityClient} from 'sanity'

import {type ColorFormat, type ColorValue, type Hsva, toColorValue, toHex} from './color'
import type {ColorPreset} from './types'

/** Inline "Name the preset" mode: the name being typed and the color being saved. */
export type Naming = {name: string; color: Hsva}

/**
 * The preset created by the save button. Naming mode only renames it; Escape deletes it.
 * `before` is the manual value to restore on cancel; `linked` is set once the field references
 * the new preset; `cancelled` stops a create that resolves after Escape from linking the field.
 */
type CreatedPreset = {
  promise: Promise<string>
  before: ColorValue | null | undefined
  cancelled: boolean
  linked: boolean
}

export type SavePreset = {
  /** Set while naming; the field shows the name input and the color being saved. */
  naming: Naming | null
  setName: (name: string) => void
  /** The save button: create the preset and start naming it. */
  start: (color: Hsva | null) => void
  /** Enter, blur or the confirm button: keep the preset, renamed unless the name is empty. */
  commit: () => Promise<void>
  /** Escape: undo the save. */
  cancel: () => Promise<void>
}

/**
 * Save as preset. The preset is created right away, titled with its hex, and the field references
 * it. The field then switches to "Name the preset": Enter or blur renames it (an empty name keeps
 * the hex title); Escape deletes it and puts the manual color back.
 */
export function useSavePreset({
  client,
  refresh,
  presetType,
  presetFormat,
  alpha,
  readOnly,
  storedValue,
  onStart,
  onCreated,
  onFailed,
  onValue,
  onClear,
}: {
  client: SanityClient
  /** Refetch the preset list. */
  refresh: () => void
  presetType: string
  /** Format new presets are saved in. */
  presetFormat: ColorFormat
  alpha: boolean
  readOnly?: boolean
  /** The field's manual value, restored on cancel. */
  storedValue: ColorValue | null | undefined
  /** Naming started: close the popover and focus the input. */
  onStart: () => void
  /** The preset exists: link the field to it. */
  onCreated: (preset: ColorPreset) => void
  /** The create failed: keep the color as a manual value. */
  onFailed: (color: Hsva) => void
  onValue: (value: ColorValue) => void
  onClear: () => void
}): SavePreset {
  const toast = useToast()
  const [naming, setNaming] = useState<Naming | null>(null)
  const createdRef = useRef<CreatedPreset | null>(null)

  const saveFailed = (title: string, error: unknown) => {
    toast.push({
      status: 'error',
      title,
      description: error instanceof Error ? error.message : String(error),
    })
  }

  const start = (color: Hsva | null) => {
    if (!color || readOnly) return
    const hex = toHex(color, alpha)
    const value = toColorValue(color, presetFormat, alpha)
    setNaming({name: '', color})
    onStart()
    const entry: CreatedPreset = {
      promise: Promise.resolve(''),
      before: storedValue,
      cancelled: false,
      linked: false,
    }
    entry.promise = client.create({_type: presetType, title: hex, color: value}).then((doc) => {
      refresh()
      if (!entry.cancelled) {
        entry.linked = true
        onCreated({_id: doc._id, title: hex, color: value})
      }
      return doc._id
    })
    createdRef.current = entry
    // Failed (no permission, network): leave naming mode and keep the color as a manual value.
    entry.promise.catch((error: unknown) => {
      if (createdRef.current === entry) {
        createdRef.current = null
        setNaming(null)
      }
      if (entry.cancelled) return // Nothing was left behind.
      onFailed(color)
      saveFailed('Could not save the preset', error)
    })
  }

  const commit = async () => {
    if (!naming) return
    const title = naming.name.trim()
    const entry = createdRef.current
    setNaming(null)
    createdRef.current = null
    if (!title || !entry) return
    let id: string
    try {
      id = await entry.promise
    } catch {
      return // Reported by `start`.
    }
    try {
      await client.patch(id).set({title}).commit()
      refresh()
    } catch (error) {
      // The preset exists, titled with its hex, and the field references it.
      saveFailed('Could not rename the preset', error)
    }
  }

  // Waits for the create, then puts the manual color back (without the reference) and deletes
  // the preset.
  const cancel = async () => {
    const entry = createdRef.current
    setNaming(null)
    createdRef.current = null
    if (!entry) return
    entry.cancelled = true
    let id: string
    try {
      id = await entry.promise
    } catch {
      return // The create failed: there's nothing to delete.
    }
    if (entry.linked && entry.before) onValue(entry.before)
    else if (entry.linked) onClear()
    try {
      await client.delete(id)
      refresh()
    } catch (error) {
      saveFailed('Could not delete the preset', error)
    }
  }

  const setName = (name: string) => setNaming((current) => current && {...current, name})

  return {naming, setName, start, commit, cancel}
}
