import {Box, Button, Flex, Stack, Text} from '@sanity/ui'
import {Tooltip} from '@sanity/ui/tooltip'
import {
  type JSX,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {useClient} from 'sanity'

import {type ColorFormat, formatColor, type Hsva, parseColor, toHex} from './color'
import {API_VERSION, ColorSwatch} from './presets'
import {keepFocus} from './ui'

const MAX_RECENT = 8
// Rapid commits (arrow keys on a slider, typing channel values) count once, as the last color.
const SETTLE_MS = 600

type RecentStore = {
  get: () => string[]
  subscribe: (onChange: () => void) => () => void
  add: (hex: string) => void
}

/** Stored hexes, valid and capped. Anything else in storage is ignored. */
function parseList(raw: string | null): string[] {
  try {
    const list: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    return list
      .filter((hex): hex is string => typeof hex === 'string' && Boolean(parseColor(hex)))
      .slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

function readStorage(key: string): string[] {
  try {
    return parseList(window.localStorage.getItem(key))
  } catch {
    return []
  }
}

function writeStorage(key: string, list: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // Storage full, blocked or unavailable: the list still lives in memory for this page.
  }
}

// One store per storage key, shared by every field on the page.
const stores = new Map<string, RecentStore>()

function recentStore(key: string): RecentStore {
  const existing = stores.get(key)
  if (existing) return existing

  let value = readStorage(key)
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())
  // Other tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== key) return
    value = parseList(event.newValue)
    emit()
  }

  const store: RecentStore = {
    get: () => value,
    subscribe: (onChange) => {
      if (listeners.size === 0) window.addEventListener('storage', onStorage)
      listeners.add(onChange)
      return () => {
        listeners.delete(onChange)
        if (listeners.size === 0) window.removeEventListener('storage', onStorage)
      }
    },
    // Newest first, one entry per hex + alpha.
    add: (hex) => {
      value = [hex, ...value.filter((h) => h !== hex)].slice(0, MAX_RECENT)
      writeStorage(key, value)
      emit()
    },
  }
  stores.set(key, store)
  return store
}

const noRecent: string[] = []
const getNoRecent = () => noRecent
const noSubscription = () => () => undefined

/**
 * The colors this user last committed in picker-only fields, per browser and per project +
 * dataset. `add` records a committed color (not live drags); off when `enabled` is false.
 */
export function useRecentColors(enabled: boolean): {
  recent: string[]
  add: (color: Hsva) => void
} {
  const client = useClient({apiVersion: API_VERSION})
  const {projectId, dataset} = client.config()
  const store = useMemo(
    () => (enabled ? recentStore(`color-select.recent:${projectId}:${dataset}`) : null),
    [dataset, enabled, projectId],
  )
  const recent = useSyncExternalStore(store?.subscribe ?? noSubscription, store?.get ?? getNoRecent)

  const pending = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    if (pending.current) store?.add(pending.current)
    pending.current = null
  }, [store])
  const add = useCallback(
    (color: Hsva) => {
      if (!store) return
      pending.current = toHex(color, true)
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, SETTLE_MS)
    },
    [flush, store],
  )
  // A field unmounting (document closed) still records its last commit.
  useEffect(() => flush, [flush])

  return {recent, add}
}

/** One swatch: the color in the field's format as tooltip and `aria-label`. Click applies it. */
function RecentSwatch({
  index,
  color,
  label,
  css,
  tabbable,
  selected,
  onFocusIndex,
  onSelect,
}: {
  index: number
  color: Hsva
  label: string
  css: string
  tabbable: boolean
  selected: boolean
  onFocusIndex: (i: number) => void
  onSelect: (picked: Hsva) => void
}): JSX.Element {
  const focus = useCallback(() => onFocusIndex(index), [index, onFocusIndex])
  const select = useCallback(() => onSelect(color), [color, onSelect])
  return (
    <Tooltip
      animate
      portal
      placement="top"
      content={
        <Text size={1} weight="medium">
          {label}
        </Text>
      }
    >
      <Button
        data-recent-color=""
        aria-label={label}
        tabIndex={tabbable ? 0 : -1}
        mode="bleed"
        padding={1}
        selected={selected}
        onMouseDown={keepFocus}
        onFocus={focus}
        onClick={select}
      >
        <ColorSwatch color={css} size={25} />
      </Button>
    </Tooltip>
  )
}

/**
 * A row of recently used colors under the picker. One tab stop, like a toolbar: the arrow keys,
 * Home and End move between swatches.
 */
export function RecentColors({
  colors,
  format,
  alpha,
  current,
  onSelect,
}: {
  /** Stored hexes, newest first. */
  colors: string[]
  format: ColorFormat
  alpha: boolean
  /** The field's color, to mark its swatch. */
  current: Hsva | null
  onSelect: (color: Hsva) => void
}): JSX.Element | null {
  // In this field's alpha: a field without alpha shows (and applies) them opaque.
  const swatches = useMemo(() => {
    const seen = new Set<string>()
    const list: Array<{hex: string; color: Hsva}> = []
    for (const stored of colors) {
      const parsed = parseColor(stored)
      if (!parsed) continue
      const color = alpha ? parsed : {...parsed, a: 1}
      const hex = toHex(color, alpha)
      if (seen.has(hex)) continue
      seen.add(hex)
      list.push({hex, color})
    }
    return list
  }, [alpha, colors])
  const currentHex = current ? toHex(alpha ? current : {...current, a: 1}, alpha) : null

  const [focusIndex, setFocusIndex] = useState(0)
  const tabIndex = focusIndex < swatches.length ? focusIndex : 0
  const rowRef = useRef<HTMLDivElement | null>(null)

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const last = swatches.length - 1
      const moves: Record<string, number> = {
        ArrowRight: tabIndex === last ? 0 : tabIndex + 1,
        ArrowDown: tabIndex === last ? 0 : tabIndex + 1,
        ArrowLeft: tabIndex === 0 ? last : tabIndex - 1,
        ArrowUp: tabIndex === 0 ? last : tabIndex - 1,
        Home: 0,
        End: last,
      }
      const next = moves[event.key]
      if (next === undefined) return
      event.preventDefault()
      setFocusIndex(next)
      rowRef.current?.querySelectorAll<HTMLElement>('[data-recent-color]')[next]?.focus()
    },
    [swatches.length, tabIndex],
  )

  if (!swatches.length) return null

  return (
    <Stack gap={1}>
      <Box paddingX={2} paddingY={3}>
        <Text size={1} weight="medium">
          Recent
        </Text>
      </Box>
      <Flex
        ref={rowRef}
        role="group"
        aria-label="Recent colors"
        wrap="wrap"
        gap={1}
        paddingX={1}
        paddingBottom={2}
        onKeyDown={onKeyDown}
      >
        {swatches.map(({hex, color}, index) => (
          <RecentSwatch
            key={hex}
            index={index}
            color={color}
            label={formatColor(color, format, alpha)}
            css={formatColor(color, 'rgb', alpha)}
            tabbable={index === tabIndex}
            selected={hex === currentHex}
            onFocusIndex={setFocusIndex}
            onSelect={onSelect}
          />
        ))}
      </Flex>
    </Stack>
  )
}
