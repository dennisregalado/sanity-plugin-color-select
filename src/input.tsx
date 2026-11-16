import {CheckmarkIcon} from '@sanity/icons/Checkmark'
import {CloseIcon} from '@sanity/icons/Close'
import {Box, Button, Card, Flex, Grid, Stack, Text, TextInput} from '@sanity/ui'
import {Tooltip} from '@sanity/ui/tooltip'
import {useCallback, useId, useState, type ChangeEvent} from 'react'
import {set, unset} from 'sanity'

import type {ColorPickerInputProps, ColorSwatch} from './types'

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

function normalizeHex(input: string): string | null {
  const match = input.trim().match(HEX)
  if (!match) return null
  const hex = match[1]
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex
  return `#${full.toUpperCase()}`
}

function sameColor(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  return (normalizeHex(a) ?? a.toLowerCase()) === (normalizeHex(b) ?? b.toLowerCase())
}

/** Small swatch used as the `colorPicker` preview media. */
export function ColorPreviewMedia({value}: {value?: string | null}) {
  return (
    <span
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        background: value || 'transparent',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
      }}
    />
  )
}

function Swatch({
  swatch,
  selected,
  readOnly,
  onSelect,
}: {
  swatch: ColorSwatch
  selected: boolean
  readOnly?: boolean
  onSelect: (picked: ColorSwatch) => void
}) {
  return (
    <Tooltip
      content={
        <Box padding={2}>
          <Text size={1}>
            {swatch.label} <span style={{opacity: 0.6}}>{swatch.value}</span>
          </Text>
        </Box>
      }
      placement="top"
      portal
    >
      <button
        type="button"
        aria-label={swatch.label}
        aria-pressed={selected}
        disabled={readOnly}
        onClick={() => onSelect(swatch)}
        style={{
          all: 'unset',
          boxSizing: 'border-box',
          cursor: readOnly ? 'default' : 'pointer',
          width: '100%',
          aspectRatio: '1',
          borderRadius: 6,
          background: swatch.value,
          boxShadow: selected
            ? '0 0 0 2px var(--card-bg-color), 0 0 0 4px var(--card-focus-ring-color)'
            : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          mixBlendMode: 'normal',
        }}
      >
        {selected && (
          <CheckmarkIcon style={{fontSize: 21, filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.6))'}} />
        )}
      </button>
    </Tooltip>
  )
}

export function ColorPickerInput(props: ColorPickerInputProps) {
  const {value, onChange, readOnly, schemaType, pluginOptions} = props
  const colorList = schemaType.options?.colorList ?? pluginOptions?.colorList ?? []
  const allowCustom = schemaType.options?.allowCustom ?? true
  const id = useId()

  const current = value?.value ?? ''
  const [draft, setDraft] = useState(current)
  // Reset the draft when the stored value changes (another editor, a swatch click, undo).
  const [synced, setSynced] = useState(current)
  if (synced !== current) {
    setSynced(current)
    setDraft(current)
  }
  const key = value?._key

  const commit = useCallback(
    (next: {label?: string | null; value: string} | null) => {
      if (!next) {
        onChange(unset())
        return
      }
      onChange(
        set({
          ...(key ? {_key: key} : {}),
          _type: 'colorPicker',
          label: next.label ?? null,
          value: next.value,
        }),
      )
    },
    [onChange, key],
  )

  const selectSwatch = useCallback(
    (swatch: ColorSwatch) => commit({label: swatch.label, value: swatch.value}),
    [commit],
  )

  const commitCustom = useCallback(
    (raw: string) => {
      const hex = normalizeHex(raw)
      if (!hex) {
        setDraft(current)
        return
      }
      const match = colorList.find((s) => sameColor(s.value, hex))
      commit(match ? {label: match.label, value: match.value} : {label: null, value: hex})
    },
    [colorList, commit, current],
  )

  return (
    <Stack gap={3}>
      {colorList.length > 0 && (
        <Grid gridTemplateColumns={[6, 8, 10]} gap={2}>
          {colorList.map((swatch) => (
            <Swatch
              key={swatch.value}
              swatch={swatch}
              selected={sameColor(swatch.value, current)}
              readOnly={readOnly}
              onSelect={selectSwatch}
            />
          ))}
        </Grid>
      )}

      {allowCustom && (
        <Flex gap={2} align="center">
          <Card
            radius={2}
            border
            style={{
              position: 'relative',
              width: 35,
              height: 35,
              flex: 'none',
              overflow: 'hidden',
              background: normalizeHex(draft) ?? 'transparent',
            }}
          >
            <input
              aria-label="Custom color"
              type="color"
              disabled={readOnly}
              value={normalizeHex(draft) ?? '#000000'}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setDraft(e.target.value.toUpperCase())
              }
              onBlur={(e) => commitCustom(e.target.value)}
              style={{position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer'}}
            />
          </Card>
          <Box flex={1}>
            <TextInput
              id={id}
              value={draft}
              readOnly={readOnly}
              placeholder="#000000"
              onChange={(e) => setDraft(e.currentTarget.value)}
              onBlur={(e) => commitCustom(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitCustom(e.currentTarget.value)
                }
              }}
            />
          </Box>
          {value?.value && !readOnly && (
            <Button
              icon={CloseIcon}
              mode="bleed"
              aria-label="Clear color"
              onClick={() => commit(null)}
            />
          )}
        </Flex>
      )}

      {value?.label && (
        <Text size={1} muted>
          {value.label}
        </Text>
      )}
    </Stack>
  )
}
