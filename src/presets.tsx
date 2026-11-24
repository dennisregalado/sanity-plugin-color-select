import {Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {type JSX, type ReactNode, useCallback, useMemo, useSyncExternalStore} from 'react'
import {
  type DocumentStore,
  type SanityClient,
  SanityDefaultPreview,
  useClient,
  useDocumentStore,
} from 'sanity'

import {checkerboard, fromColorValue, type StoredColor, storedCss, toHex} from './color'
import type {ListNavigation} from './listNavigation'
import type {ColorPreset} from './types'
import {keepFocus} from './ui'

export const API_VERSION = '2025-02-19'

/** A preset's hex without `#`, lowercase, for prefix search (`6f4e` finds `#6F4E37`). */
const searchableHex = (color: StoredColor) => {
  const parsed = fromColorValue(color)
  return parsed ? toHex(parsed, true).slice(1).toLowerCase() : ''
}

const PRESET_FIELDS = '| order(title asc) {_id, title, color}'

type PresetStore = {
  get: () => ColorPreset[] | null
  subscribe: (onChange: () => void) => () => void
  refetch: () => void
}

// One store per document store (workspace) and (type, ids), shared by every field on the page.
const stores = new WeakMap<DocumentStore, Map<string, PresetStore>>()

function presetStore(
  documentStore: DocumentStore,
  client: SanityClient,
  type: string,
  idsKey: string,
): PresetStore {
  const byKey = stores.get(documentStore) ?? new Map<string, PresetStore>()
  stores.set(documentStore, byKey)
  const key = `${type}|${idsKey}`
  const existing = byKey.get(key)
  if (existing) return existing

  const only = idsKey ? idsKey.split(',') : null
  const query = `*[_type == $type${only ? ' && _id in $ids' : ''}] ${PRESET_FIELDS}`
  const params: Record<string, string | string[]> = only ? {type, ids: only} : {type}
  let value: ColorPreset[] | null = null
  const listeners = new Set<() => void>()
  let subscription: {unsubscribe: () => void} | null = null

  const emit = (list: ColorPreset[]) => {
    // A field's own preset list keeps its given order.
    value = only ? [...list].sort((a, b) => only.indexOf(a._id) - only.indexOf(b._id)) : list
    listeners.forEach((listener) => listener())
  }

  const store: PresetStore = {
    get: () => value,
    subscribe: (onChange) => {
      listeners.add(onChange)
      // The first field to mount starts the listener; the last to unmount stops it (the list
      // is kept, so a field mounted later shows it while the listener refetches).
      if (!subscription) {
        subscription = documentStore
          .listenQuery(query, params, {
            apiVersion: API_VERSION,
            perspective: 'published',
            tag: 'color-select.presets',
            throttleTime: 300,
            transitions: ['update', 'appear', 'disappear'],
          })
          .subscribe({next: emit, error: () => emit([])})
      }
      return () => {
        listeners.delete(onChange)
        if (listeners.size === 0) {
          subscription?.unsubscribe()
          subscription = null
        }
      }
    },
    // Right after the field's own save, without waiting for the listener's throttle.
    refetch: () => {
      client
        .withConfig({perspective: 'published'})
        .fetch<ColorPreset[]>(query, params)
        .then(emit)
        .catch(() => undefined)
    },
  }
  byKey.set(key, store)
  return store
}

const noPresets = () => null
const noSubscription = () => () => undefined

/**
 * Every published color preset, kept live: presets created or edited elsewhere (another pane,
 * another user) show up without reopening the document.
 */
export function usePresets(
  type: string,
  enabled = true,
  ids?: string[],
): {colors: ColorPreset[] | null; refresh: () => void; client: SanityClient} {
  const client = useClient({apiVersion: API_VERSION})
  const documentStore = useDocumentStore()
  const idsKey = ids?.join(',') ?? ''
  const store = useMemo(
    () => (enabled ? presetStore(documentStore, client, type, idsKey) : null),
    [client, documentStore, enabled, idsKey, type],
  )
  const colors = useSyncExternalStore(store?.subscribe ?? noSubscription, store?.get ?? noPresets)
  const refresh = useCallback(() => store?.refetch(), [store])

  return {colors, refresh, client}
}

export function filterPresets(colors: ColorPreset[], query: string): ColorPreset[] {
  const q = query.trim().toLowerCase().replace(/^#/, '')
  if (!q) return colors
  return colors.filter(
    (c) =>
      c.title?.toLowerCase().includes(q) ||
      searchableHex(c.color).startsWith(q) ||
      Boolean(storedCss(c.color)?.toLowerCase().includes(q)),
  )
}

export function ColorSwatch({
  color,
  size = 16,
}: {
  color?: string | null
  size?: number | string
}): JSX.Element {
  return (
    <Card
      as="span"
      radius={2}
      shadow={1}
      style={{
        display: 'block',
        width: size,
        height: size,
        flex: 'none',
        background: color ? checkerboard(color) : 'transparent',
      }}
    />
  )
}

type TypedRow = {label: string; css: string; onSelect: () => void}
const selectTyped = (typed: TypedRow) => typed.onSelect()

/**
 * A list row: a bleed button with the hover look while it's the keyboard's active row. Clicking
 * it calls `onSelect(value)`.
 */
function OptionButton<T>({
  index,
  nav,
  selected,
  value,
  onSelect,
  children,
}: {
  index: number
  nav: ListNavigation
  selected?: boolean
  value: T
  onSelect: (row: T) => void
  children: ReactNode
}): JSX.Element {
  const select = useCallback(() => onSelect(value), [onSelect, value])
  const active = index === nav.activeIndex
  return (
    <Button
      id={nav.optionId(index)}
      role="option"
      aria-selected={active}
      // Not a tab stop: the input moves through rows with the arrow keys.
      tabIndex={-1}
      data-hovered={active ? '' : undefined}
      mode="bleed"
      width="fill"
      padding={1}
      selected={selected}
      onMouseDown={keepFocus}
      onClick={select}
    >
      {children}
    </Button>
  )
}

export function PresetList({
  colors,
  selectedId,
  nav,
  onSelect,
}: {
  colors: ColorPreset[] | null
  selectedId?: string
  nav: ListNavigation
  onSelect: (color: ColorPreset) => void
}): JSX.Element {
  return (
    <Stack gap={1}>
      <Box paddingX={2} paddingY={3}>
        <Text size={1} weight="medium">
          Presets
        </Text>
      </Box>
      {colors === null && (
        <Flex justify="center" padding={2}>
          <Spinner muted />
        </Flex>
      )}
      {colors?.length === 0 && (
        <Box paddingX={2} paddingBottom={3}>
          <Text size={1} muted>
            No presets yet
          </Text>
        </Box>
      )}
      {colors && colors.length > 0 && (
        <Stack gap={1} id={nav.listboxId} role="listbox" aria-label="Presets">
          {colors.map((c, index) => (
            <OptionButton
              key={c._id}
              index={index}
              nav={nav}
              selected={c._id === selectedId}
              value={c}
              onSelect={onSelect}
            >
              <SanityDefaultPreview
                layout="compact"
                title={c.title || 'Untitled'}
                subtitle={storedCss(c.color) || undefined}
                media={<ColorSwatch color={storedCss(c.color)} size="100%" />}
              />
            </OptionButton>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

/**
 * Search results, laid out like the link picker's: a count header, then one row per match.
 * `typed` adds a first "Use <color>" row when the query is itself a color.
 */
export function PresetResults({
  colors,
  matches,
  query,
  typed,
  nav,
  onSelect,
}: {
  colors: ColorPreset[] | null
  matches: ColorPreset[]
  query: string
  typed?: TypedRow
  nav: ListNavigation
  onSelect: (color: ColorPreset) => void
}): JSX.Element {
  const label =
    colors === null
      ? 'Searching...'
      : `${matches.length} ${matches.length === 1 ? 'result' : 'results'}`
  const offset = typed ? 1 : 0

  return (
    <Stack gap={1} id={nav.listboxId} role="listbox" aria-label="Colors">
      {typed && (
        <OptionButton index={0} nav={nav} value={typed} onSelect={selectTyped}>
          <SanityDefaultPreview
            layout="default"
            title={`Use ${typed.label}`}
            media={<ColorSwatch color={typed.css} size="100%" />}
          />
        </OptionButton>
      )}
      {/* The group's label carries the count for screen readers. */}
      <Box paddingX={2} paddingY={3} aria-hidden>
        <Text size={1} weight="medium">
          {label}
        </Text>
      </Box>
      {matches.length > 0 ? (
        <Stack gap={1} role="group" aria-label={label} style={{maxHeight: 390, overflowY: 'auto'}}>
          {matches.map((c, index) => (
            <OptionButton
              key={c._id}
              index={index + offset}
              nav={nav}
              value={c}
              onSelect={onSelect}
            >
              <SanityDefaultPreview
                layout="default"
                title={c.title || 'Untitled'}
                subtitle={storedCss(c.color) || undefined}
                media={<ColorSwatch color={storedCss(c.color)} size="100%" />}
              />
            </OptionButton>
          ))}
        </Stack>
      ) : (
        colors !== null && (
          <Box paddingX={2} paddingBottom={3}>
            <Text size={1} muted>
              No presets match “{query.trim()}”
            </Text>
          </Box>
        )
      )}
    </Stack>
  )
}
