import {BookmarkIcon} from '@sanity/icons/Bookmark'
import {CheckmarkIcon} from '@sanity/icons/Checkmark'
import {CloseIcon} from '@sanity/icons/Close'
import {Box, Card, Flex, Stack, Text, TextInput, useClickOutsideEvent} from '@sanity/ui'
import {Popover} from '@sanity/ui/popover'
import React, {useCallback, useEffect, useMemo, useRef, useState, type JSX} from 'react'
import {set, unset, useDocumentValuePermissions, type ObjectInputProps, type Path} from 'sanity'

import {
  formatColor,
  fromColorValue,
  parseColor,
  sameColor,
  storedCss,
  toColorValue,
  toHex,
  type ColorFormat,
  type ColorValue,
  type Hsva,
  type StoredColor,
} from './color'
import {assignRefs, nextTabbable, tabbables} from './dom'
import {useListNavigation} from './listNavigation'
import {ColorPicker} from './picker'
import {ColorSwatch, filterPresets, PresetList, PresetResults, usePresets} from './presets'
import {PresetReference, ReferencedPreset, type LiveColor} from './reference'
import type {ColorOptions, ColorPickerInputProps, ColorPreset} from './types'
import {TooltipButton} from './ui'
import {useSavePreset} from './useSavePreset'

/** Same color, format and alpha: nothing to write. */
function sameValue(a: Partial<ColorValue> | null | undefined, b: ColorValue): boolean {
  return Boolean(a && a.css === b.css && a.hex === b.hex && a.alpha === b.alpha && a.hsv)
}

type ColorFieldInputProps = {
  /** The stored color object (a field's `value`, or a preset's `color`). */
  colorValue: ColorValue | null | undefined
  /** Set when the color comes from a preset; shows the reference row. */
  referenceId?: string
  /** Live color of the referenced preset. */
  referencedColor?: StoredColor
  format: ColorFormat
  alpha: boolean
  pickerOnly: boolean
  paletteOnly: boolean
  presetType: string
  /** Only these preset IDs (a field's `options.presets`). */
  presetIds?: string[]
  /** Format new presets are saved in. */
  presetFormat: ColorFormat
  readOnly?: boolean
  elementProps: ObjectInputProps['elementProps']
  path: Path
  /** A manual color was picked, typed or pasted. */
  onValue: (value: ColorValue) => void
  /** A preset was picked (or just saved); `value` is its color in this field's format. */
  onPreset: (preset: ColorPreset, value: ColorValue | null) => void
  onClear: () => void
}

/**
 * The field UI, like the link picker: one input with a popover holding the picker and presets.
 * Shared by `colorPicker` fields and the preset document's `color`; each maps the callbacks onto
 * its own value shape.
 */
function ColorFieldInput(props: ColorFieldInputProps): JSX.Element {
  const {
    colorValue: storedValue,
    referenceId,
    referencedColor,
    format,
    alpha,
    pickerOnly,
    paletteOnly,
    presetType,
    presetIds,
    presetFormat,
    readOnly,
    elementProps,
    path,
    onValue,
    onPreset,
    onClear,
  } = props
  const {colors, refresh, client} = usePresets(presetType, !pickerOnly, presetIds)
  const hasValue = Boolean(storedValue || referenceId)

  // Saving publishes a new preset (`client.create`, a non-draft id), so check `create` on one.
  const permissionDoc = useMemo(() => ({_id: `${presetType}-new`, _type: presetType}), [presetType])
  const [createPermission] = useDocumentValuePermissions({
    document: permissionDoc,
    permission: 'create',
  })

  const stored = useMemo(() => fromColorValue(storedValue), [storedValue])
  const storedText = storedValue?.css ?? ''

  const [open, setOpen] = useState(false)
  // The state re-renders the popover and click-outside with the new node; effects and handlers
  // read the ref, so the focus effects below don't re-run when the input and reference row swap.
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node
    setContainer(node)
  }, [])
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Text typed in the field: a color to apply, or a search over presets.
  const [typed, setTyped] = useState<string | null>(null)
  // Live color while dragging in the picker, before it is committed.
  const [dragging, setDragging] = useState<Hsva | null>(null)
  // Bumped by handlers that should move focus to the input once the next render is committed.
  const [focusRequest, setFocusRequest] = useState(0)
  // Bumped when the popover closes from inside: focus goes back to the field, without reopening.
  const [restoreRequest, setRestoreRequest] = useState(0)
  // A ref, not state: it's set right before `input.focus()`, whose focus event fires in the same
  // tick, before any re-render.
  const skipOpenRef = useRef(false)
  // Replace: the input stands in for this preset reference until a pick or dismiss.
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const replacing = Boolean(referenceId) && replacingId === referenceId

  const close = useCallback(() => {
    setOpen(false)
    setTyped(null)
    setDragging(null)
    setReplacingId(null)
  }, [])

  useClickOutsideEvent(open && close, () => [container, popoverRef.current])

  const setManual = useCallback(
    (color: Hsva) => {
      if (paletteOnly || readOnly) return
      const next = toColorValue(color, format, alpha)
      if (!referenceId && sameValue(storedValue, next)) return
      onValue(next)
    },
    [alpha, format, onValue, paletteOnly, readOnly, referenceId, storedValue],
  )

  const setPreset = useCallback(
    (preset: ColorPreset) => {
      if (readOnly) return
      const color = fromColorValue(preset.color)
      onPreset(preset, color ? toColorValue(color, format, alpha) : null)
      close()
    },
    [alpha, close, format, onPreset, readOnly],
  )

  const {
    naming,
    setName: setNamingName,
    start: startNaming,
    commit: commitNaming,
    cancel: cancelNaming,
  } = useSavePreset({
    client,
    refresh,
    presetType,
    presetFormat,
    alpha,
    readOnly,
    storedValue,
    onStart: () => {
      close()
      setFocusRequest((n) => n + 1)
    },
    onCreated: setPreset,
    onFailed: setManual,
    onValue,
    onClear,
  })

  const live = referenceId ? fromColorValue(referencedColor) : null
  const typedColor = paletteOnly ? null : parseColor(typed)
  const shown = naming?.color ?? dragging ?? typedColor ?? live ?? stored
  const shownCss = shown ? formatColor(shown, 'rgb', alpha) : ''
  const fieldText = typed ?? storedText
  // Typed text searches presets even when it's also a color (`cafe`, `bad`, `ae2525`).
  const query = !pickerOnly && typed !== null ? typed : ''
  const matches = useMemo(
    () => (query.trim() && colors ? filterPresets(colors, query) : []),
    [colors, query],
  )
  // Written unmistakably as a color, not a word that happens to be hex.
  const explicitColor =
    Boolean(typedColor) && /^(#|rgba?\(|hsla?\(|oklch\()/i.test(typed?.trim() ?? '')
  const popoverOpen = open && !readOnly && !naming

  // The preset's live color in this field's alpha, when it differs from the copy in `value`.
  const liveForField = live && (alpha ? live : {...live, a: 1})
  const outdated =
    liveForField && (!stored || toHex(liveForField, true) !== toHex(stored, true))
      ? {
          stored: stored ? formatColor(stored, format, alpha) : null,
          current: formatColor(liveForField, format, alpha),
        }
      : null

  useEffect(() => {
    if (!focusRequest) return
    inputRef.current?.focus()
    // Replace shows the current color's text selected, so typing searches instead of appending.
    // (Naming starts with an empty input, so there's nothing to select.)
    inputRef.current?.select()
  }, [focusRequest])

  useEffect(() => {
    if (!restoreRequest) return
    const input = inputRef.current
    if (input) {
      // Focusing the input normally opens the popover; not when it's where focus returns to.
      if (document.activeElement !== input) skipOpenRef.current = true
      input.focus()
      return
    }
    // Replace ended: back to the reference row's menu button.
    containerRef.current?.querySelector<HTMLElement>('[data-preset-menu]')?.focus()
  }, [restoreRequest])

  /**
   * Typed text can be both a color and a preset search (`cafe`, `bad`, `ae2525`), so a preset name
   * never silently saves a color:
   * - Enter picks the active row, or the first: "Use <color>" when the text is a color, else the
   *   first match.
   * - Blur applies a typed color only if it can't be a search: written as `#…`, `rgb(…)`,
   *   `hsl(…)` or `oklch(…)`, picker-only, or matching no preset (presets still loading count as
   *   a match). Otherwise the text is dropped.
   * - Paste always applies a color right away (see `pasteColor`).
   */
  const commitTyped = () => {
    const mayBeSearch = !pickerOnly && (colors === null || matches.length > 0)
    if (typedColor && (explicitColor || !mayBeSearch)) setManual(typedColor)
    else if (!readOnly && typed !== null && !typed.trim() && hasValue) onClear()
    setTyped(null)
  }

  // The "Use <color>" row.
  const applyTyped = () => {
    if (!typedColor) return
    setManual(typedColor)
    close()
  }

  const pickFirst = () => {
    if (typedColor && query) applyTyped()
    else if (query.trim() && matches[0]) setPreset(matches[0])
    else commitTyped()
  }

  // The popover's rows, in the order the arrow keys move through them.
  let listColors: ColorPreset[] = []
  if (query) listColors = matches
  else if (!pickerOnly) listColors = colors ?? []
  const typedRow = Boolean(query && typedColor)
  const rows: Array<() => void> = [
    ...(typedRow ? [applyTyped] : []),
    ...listColors.map((preset) => () => setPreset(preset)),
  ]
  const hasListbox = Boolean(query) || listColors.length > 0

  const {nav, move} = useListNavigation(`${popoverOpen}|${query}`, rows.length)
  const {activeIndex} = nav

  // Replace: show the input and popover to pick anew. The value and reference stay until a pick,
  // a typed or pasted color, or an explicit clear; dismissing shows the reference again.
  const edit = () => {
    if (readOnly) return
    setTyped(null)
    setDragging(null)
    setReplacingId(referenceId ?? null)
    setOpen(true)
    setFocusRequest((n) => n + 1)
  }

  // Rewrites `value` from the preset's current color, keeping the reference.
  const updateFromPreset = () => {
    if (readOnly || !referenceId || !live) return
    onPreset({_id: referenceId, color: referencedColor}, toColorValue(live, format, alpha))
  }

  // Keeps the stored copy (what frontends read now) as a manual value and drops the reference.
  // A field with no copy yet keeps the preset's live color instead.
  const unlink = () => {
    if (readOnly) return
    const keep = storedValue ?? (live ? toColorValue(live, format, alpha) : null)
    if (keep) onValue(keep)
    else onClear()
  }

  const remove = () => {
    if (readOnly) return
    close()
    onClear()
  }

  // The × button: clears the typed text and the field's value.
  const clear = () => {
    if (readOnly) return
    setTyped(null)
    setDragging(null)
    if (hasValue) onClear()
  }

  const storedHex = stored ? toHex(stored, alpha) : null
  const alreadyPreset = colors?.some((c) => sameColor(storedCss(c.color), storedHex))
  const canSave =
    !presetIds &&
    !pickerOnly &&
    !paletteOnly &&
    !referenceId &&
    typed === null &&
    Boolean(stored) &&
    !alreadyPreset &&
    createPermission?.granted === true
  const canClear = !naming && (hasValue || Boolean(typed))
  let actionCount = Number(canSave) + Number(canClear)
  if (naming) actionCount = 1
  if (readOnly) actionCount = 0

  let placeholder = 'Search or paste a color'
  if (pickerOnly) placeholder = 'Paste a color'
  if (paletteOnly) placeholder = 'Search color presets'
  if (naming) placeholder = 'Name the preset'

  /**
   * Keyboard model, like a combobox with the picker as its popup:
   * - Focus stays in the input while ArrowUp/ArrowDown move the active row; Enter picks it.
   * - Tab from the input (popover open, no search) moves into the picker, as if the popover sat
   *   right after the input. Tab past its last control leaves the field; Shift+Tab from its
   *   first control returns to the input.
   * - Escape in the popover closes it and returns focus to the input.
   * Focus moving between the input and the popover doesn't count as leaving the field.
   */
  const onPopoverKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      // Keep a parent dialog (Portable Text marks) open.
      event.preventDefault()
      event.stopPropagation()
      close()
      setRestoreRequest((n) => n + 1)
      return
    }
    if (event.key !== 'Tab') return
    const items = tabbables(event.currentTarget)
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (event.shiftKey && index === 0 && inputRef.current) {
      event.preventDefault()
      inputRef.current.focus()
    } else if (!event.shiftKey && index === items.length - 1 && containerRef.current) {
      event.preventDefault()
      const next = nextTabbable(containerRef.current, [popoverRef.current])
      close()
      if (next) next.focus()
      else setRestoreRequest((n) => n + 1)
    }
  }

  const popover = (
    <Popover
      open={popoverOpen}
      referenceElement={container}
      portal
      placement="bottom-start"
      fallbackPlacements={['top-start']}
      animate
      constrainSize
      radius={4}
      shadow={3}
      content={
        <Card
          ref={popoverRef}
          padding={1}
          radius={4}
          // Focusable, so a click on its non-focusable parts moves focus here, not to the body,
          // and the input's blur can tell it stayed inside.
          tabIndex={-1}
          style={{width: 340, maxHeight: 'inherit', overflow: 'auto', outline: 'none'}}
          onKeyDown={onPopoverKeyDown}
          onBlur={(event) => {
            // Tabbing out of the popover closes it too, unless focus goes back to the field.
            const next = event.relatedTarget as Node | null
            if (next && !event.currentTarget.contains(next) && !container?.contains(next)) close()
          }}
        >
          {query ? (
            <PresetResults
              colors={colors}
              matches={matches}
              query={query}
              nav={nav}
              typed={
                typedColor
                  ? {
                      label: formatColor(typedColor, format, alpha),
                      css: formatColor(typedColor, 'rgb', alpha),
                      onSelect: applyTyped,
                    }
                  : undefined
              }
              onSelect={setPreset}
            />
          ) : (
            <Stack gap={1}>
              {!paletteOnly && (
                <Box padding={2}>
                  <ColorPicker
                    value={shown}
                    alpha={alpha}
                    format={format}
                    onChange={setDragging}
                    onCancel={() => setDragging(null)}
                    onCommit={(color) => {
                      setDragging(null)
                      setTyped(null)
                      setManual(color)
                    }}
                  />
                </Box>
              )}
              {!pickerOnly && (
                <PresetList
                  colors={colors}
                  selectedId={referenceId}
                  nav={nav}
                  onSelect={setPreset}
                />
              )}
            </Stack>
          )}
        </Card>
      }
    />
  )

  /**
   * Paste replaces the color, wherever the caret is, and applies right away (no blur needed).
   * Palette-only fields search presets for it instead. Returns whether it was handled.
   */
  const pasteColor = (text: string): boolean => {
    if (readOnly) return false
    const trimmed = text.trim()
    const color = parseColor(trimmed)
    if (!color) return false
    if (paletteOnly) {
      setTyped(trimmed)
      setOpen(true)
      return true
    }
    setDragging(null)
    setTyped(null)
    setManual(color)
    return true
  }

  if (referenceId && !naming && !replacing) {
    return (
      <>
        {popover}
        <Box
          ref={setContainerRef}
          onPaste={(event: React.ClipboardEvent) => {
            if (pasteColor(event.clipboardData.getData('text'))) event.preventDefault()
          }}
        >
          <PresetReference
            documentId={referenceId}
            documentType={presetType}
            path={path}
            readOnly={readOnly}
            outdated={outdated}
            onUpdate={updateFromPreset}
            onReplace={edit}
            onUnlink={unlink}
            onRemove={remove}
          />
        </Box>
      </>
    )
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // Handled here, so a parent dialog stays open; otherwise let it through.
      if (naming) {
        event.preventDefault()
        event.stopPropagation()
        cancelNaming()
      } else if (popoverOpen) {
        event.preventDefault()
        event.stopPropagation()
        close()
        // Ending Replace unmounts the input: focus moves to the reference row.
        if (replacing) setRestoreRequest((n) => n + 1)
      }
      return
    }
    if (naming) {
      if (event.key === 'Enter') {
        event.preventDefault()
        commitNaming()
      }
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (popoverOpen && activeIndex >= 0) rows[activeIndex]()
      else pickFirst()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!popoverOpen) {
        if (!readOnly) setOpen(true)
        return
      }
      move(event.key === 'ArrowDown')
      return
    }
    if (event.key === 'Tab' && !event.shiftKey && popoverOpen && !query && popoverRef.current) {
      const [first] = tabbables(popoverRef.current)
      if (first) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <>
      {popover}
      <Box ref={setContainerRef} style={{position: 'relative'}}>
        {shownCss && (
          // Same swatch, size and inset as the preset reference row's preview media.
          <Box style={{position: 'absolute', top: 5, left: 5, zIndex: 1, pointerEvents: 'none'}}>
            <ColorSwatch color={shownCss} size={25} />
          </Box>
        )}
        <TextInput
          {...elementProps}
          ref={(node) =>
            assignRefs(node, inputRef, elementProps.ref as React.Ref<HTMLInputElement> | undefined)
          }
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={popoverOpen}
          aria-controls={popoverOpen && hasListbox ? nav.listboxId : undefined}
          aria-activedescendant={
            popoverOpen && activeIndex >= 0 ? nav.optionId(activeIndex) : undefined
          }
          readOnly={readOnly}
          placeholder={placeholder}
          fontSize={1}
          weight="medium"
          value={naming ? naming.name : fieldText}
          style={{
            // Same height as the reference row; text starts where its preview title does.
            height: 35,
            ...(shownCss ? {paddingLeft: 38} : {}),
            ...(actionCount ? {paddingRight: `calc(${actionCount} * 33px + 8px)`} : {}),
          }}
          onFocus={(event) => {
            elementProps.onFocus(event)
            if (skipOpenRef.current) {
              skipOpenRef.current = false
              return
            }
            if (!naming) setOpen(true)
          }}
          onClick={() => {
            if (!naming) setOpen(true)
          }}
          onPaste={(event) => {
            if (naming) return
            if (pasteColor(event.clipboardData.getData('text'))) event.preventDefault()
          }}
          onChange={(event) => {
            const next = event.currentTarget.value
            if (naming) {
              setNamingName(next)
              return
            }
            setTyped(next)
            setOpen(true)
          }}
          onBlur={(event) => {
            elementProps.onBlur(event)
            if (naming) {
              commitNaming()
              return
            }
            commitTyped()
            // Tabbing or clicking away closes the popover (and ends Replace). Focus moving into it,
            // like the picker's sliders and inputs, keeps it open.
            if (!popoverRef.current?.contains(event.relatedTarget as Node | null)) close()
          }}
          onKeyDown={onKeyDown}
        />
        {actionCount > 0 && (
          <Flex
            align="center"
            gap={1}
            padding={1}
            style={{position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 2}}
          >
            {/* Sized like TextInput's clear button, and like it, they keep focus in the input. */}
            {naming && (
              <TooltipButton
                keepInputFocus
                label="Save preset"
                icon={CheckmarkIcon}
                onClick={commitNaming}
              />
            )}
            {!naming && canSave && (
              <TooltipButton
                keepInputFocus
                label="Save as preset"
                icon={BookmarkIcon}
                onClick={() => startNaming(shown)}
              />
            )}
            {!naming && canClear && (
              <TooltipButton keepInputFocus label="Clear" icon={CloseIcon} onClick={clear} />
            )}
          </Flex>
        )}
      </Box>
      {naming && (
        <Box paddingTop={2}>
          <Text size={1} muted>
            Enter to save · Esc to cancel
          </Text>
        </Box>
      )}
    </>
  )
}

/**
 * `colorPicker` fields: every change writes the resolved color to `value`; a preset also stores
 * a weak `reference`, with `value` as a snapshot of its color taken when it was picked. Nothing is
 * written just by opening a document.
 */
export function ColorPickerInput(props: ColorPickerInputProps): JSX.Element {
  const {value, onChange, readOnly, presetType, elementProps, path, schemaType, defaults} = props
  const format = schemaType.options?.format ?? defaults.format
  const alpha = schemaType.options?.alpha ?? defaults.alpha
  const pickerOnly = schemaType.options?.pickerOnly ?? defaults.pickerOnly
  const paletteOnly = !pickerOnly && (schemaType.options?.paletteOnly ?? defaults.paletteOnly)

  const referenceId = value?.reference?._ref
  const [live, setLive] = useState<LiveColor | null>(null)
  const referencedColor = referenceId && live?.id === referenceId ? live.color : null
  const storedValue = value?.value
  const key = value?._key
  const keyed = useMemo(() => (key ? {_key: key} : {}), [key])
  const typeName = schemaType.name

  const onValue = useCallback(
    (next: ColorValue) => onChange(set({...keyed, _type: typeName, value: next})),
    [keyed, onChange, typeName],
  )
  const onPreset = useCallback(
    (preset: ColorPreset, next: ColorValue | null) =>
      onChange(
        set({
          ...keyed,
          _type: typeName,
          ...(next ? {value: next} : {}),
          reference: {_type: 'reference', _ref: preset._id, _weak: true},
        }),
      ),
    [keyed, onChange, typeName],
  )
  const onClear = useCallback(() => onChange(unset()), [onChange])

  return (
    <>
      {referenceId && <ReferencedPreset id={referenceId} type={presetType} onColor={setLive} />}
      <ColorFieldInput
        colorValue={storedValue}
        referenceId={referenceId}
        referencedColor={referencedColor}
        format={format}
        alpha={alpha}
        pickerOnly={pickerOnly}
        paletteOnly={paletteOnly}
        presetType={presetType}
        presetIds={schemaType.options?.presets}
        presetFormat={defaults.format}
        readOnly={readOnly}
        elementProps={elementProps}
        path={path}
        onValue={onValue}
        onPreset={onPreset}
        onClear={onClear}
      />
    </>
  )
}

const noop = () => undefined

/** The preset document's `color`: the same field, picker only, writing the value object itself. */
export function PresetColorInput(
  props: ObjectInputProps<ColorValue> & {presetType: string; defaults: Required<ColorOptions>},
): JSX.Element {
  const {value, onChange, readOnly, elementProps, path, presetType, defaults} = props
  const onValue = useCallback((next: ColorValue) => onChange(set(next)), [onChange])
  const onClear = useCallback(() => onChange(unset()), [onChange])

  return (
    <ColorFieldInput
      colorValue={value}
      format={defaults.format}
      alpha={defaults.alpha}
      pickerOnly
      paletteOnly={false}
      presetType={presetType}
      presetFormat={defaults.format}
      readOnly={readOnly}
      elementProps={elementProps}
      path={path}
      onValue={onValue}
      onPreset={noop}
      onClear={onClear}
    />
  )
}
