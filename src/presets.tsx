import {Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {SanityDefaultPreview, useClient} from 'sanity'

import {checkerboard, fromColorValue, storedCss, toHex, type StoredColor} from './color'

const searchableHex = (color: StoredColor) => {
  const parsed = fromColorValue(color)
  return parsed ? toHex(parsed, true).slice(1).toLowerCase() : ''
}
import type {ColorPreset} from './types'

const API_VERSION = '2025-02-19'

/**
 * Like the link picker: keep focus in the field while clicking inside the popover. Otherwise the
 * field's blur clears the search and swaps the popover content before the click lands.
 */
const keepInputFocus = (event: React.MouseEvent) => event.preventDefault()

/** Every published color preset, refetched on demand (palettes are small). */
export function usePresets(type: string, enabled = true, ids?: string[]) {
  const client = useClient({apiVersion: API_VERSION})
  const [colors, setColors] = useState<ColorPreset[] | null>(null)
  const idsKey = ids?.join(',') ?? ''

  const refresh = useCallback(() => {
    if (!enabled) return
    const only = idsKey ? idsKey.split(',') : null
    client
      .withConfig({perspective: 'published'})
      .fetch<ColorPreset[]>(
        '*[_type == $type && (!defined($ids) || _id in $ids)] | order(title asc) {_id, title, color}',
        {type, ids: only},
      )
      // A field's own preset list keeps its given order.
      .then((list) =>
        only ? [...list].sort((a, b) => only.indexOf(a._id) - only.indexOf(b._id)) : list,
      )
      .then(setColors)
      .catch(() => setColors([]))
  }, [client, enabled, idsKey, type])

  useEffect(refresh, [refresh])

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

export function ColorSwatch({color, size = 16}: {color?: string | null; size?: number | string}) {
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

export function PresetList({
  colors,
  selectedId,
  onSelect,
}: {
  colors: ColorPreset[] | null
  selectedId?: string
  onSelect: (color: ColorPreset) => void
}) {
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
        <Stack gap={1}>
          {colors.map((c) => (
            <Button
              key={c._id}
              mode="bleed"
              width="fill"
              padding={1}
              selected={c._id === selectedId}
              onMouseDown={keepInputFocus}
              onClick={() => onSelect(c)}
            >
              <SanityDefaultPreview
                layout="compact"
                title={c.title || 'Untitled'}
                subtitle={storedCss(c.color) || undefined}
                media={<ColorSwatch color={storedCss(c.color)} size="100%" />}
              />
            </Button>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

/** Search results, laid out like the link picker's: a count header, then one row per match. */
export function PresetResults({
  colors,
  query,
  onSelect,
}: {
  colors: ColorPreset[] | null
  query: string
  onSelect: (color: ColorPreset) => void
}) {
  const matches = useMemo(() => (colors ? filterPresets(colors, query) : []), [colors, query])
  const label =
    colors === null
      ? 'Searching...'
      : `${matches.length} ${matches.length === 1 ? 'result' : 'results'}`

  return (
    <Stack gap={1}>
      <Box paddingX={2} paddingY={3}>
        <Text size={1} weight="medium">
          {label}
        </Text>
      </Box>
      {matches.length > 0 ? (
        <Stack gap={1} style={{maxHeight: 390, overflowY: 'auto'}}>
          {matches.map((c) => (
            <Button
              key={c._id}
              mode="bleed"
              width="fill"
              padding={1}
              onMouseDown={keepInputFocus}
              onClick={() => onSelect(c)}
            >
              <SanityDefaultPreview
                layout="default"
                title={c.title || 'Untitled'}
                subtitle={storedCss(c.color) || undefined}
                media={<ColorSwatch color={storedCss(c.color)} size="100%" />}
              />
            </Button>
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
