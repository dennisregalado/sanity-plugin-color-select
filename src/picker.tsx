import {CheckmarkIcon} from '@sanity/icons/Checkmark'
import {CopyIcon} from '@sanity/icons/Copy'
import {Box, Button, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {Tooltip} from '@sanity/ui/tooltip'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

import {
  checkerboard,
  clamp,
  overCheckerboard,
  COLOR_FORMATS,
  formatColor,
  hslaToHsva,
  hsvaToHsla,
  hsvaToOklcha,
  oklchaToHsva,
  hsvaToRgba,
  parseColor,
  rgbaToHsva,
  toHex,
  type ColorFormat,
  type Hsva,
} from './color'

const THUMB = 20
// An empty field starts at full saturation and brightness, so a hue or opacity drag shows a change.
const START: Hsva = {h: 0, s: 1, v: 1, a: 1}

function Thumb({x, y, color}: {x: string; y: string; color: string}) {
  return (
    <Box
      as="span"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: THUMB,
        height: THUMB,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: color,
        border: '4px solid #fff',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.3)',
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }}
    />
  )
}

/** Pointer handlers that report position inside the element as 0–1 fractions. */
function useDrag(onMove: (x: number, y: number) => void, onEnd: () => void) {
  const ref = useRef<HTMLDivElement | null>(null)
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    onMove(
      clamp((event.clientX - rect.left) / rect.width),
      clamp((event.clientY - rect.top) / rect.height),
    )
  }
  return {
    ref,
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      move(event)
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event)
    },
    onPointerUp: onEnd,
  }
}

/** A horizontal track (hue or alpha) with a round thumb. */
function Slider({
  label,
  value,
  background,
  thumbColor,
  step,
  onChange,
  onCommit,
}: {
  label: string
  value: number
  background: string
  thumbColor: string
  step: number
  onChange: (fraction: number) => void
  onCommit: (fraction: number) => void
}) {
  const drag = useDrag(
    (x) => onChange(x),
    () => onCommit(value),
  )
  return (
    <Box
      {...drag}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={value}
      onKeyDown={(event: KeyboardEvent) => {
        const dir = {ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1}[event.key]
        if (!dir) return
        event.preventDefault()
        const next = clamp(value + dir * step * (event.shiftKey ? 10 : 1))
        onChange(next)
        onCommit(next)
      }}
      style={{
        position: 'relative',
        height: 12,
        marginInline: THUMB / 2,
        touchAction: 'none',
        cursor: 'pointer',
      }}
    >
      <Card radius={6} style={{position: 'absolute', inset: `0 -${THUMB / 2}px`, background}} />
      <Thumb x={`${value * 100}%`} y="50%" color={thumbColor} />
    </Box>
  )
}

function EyedropperIcon() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 25 25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <path d="m15 7 3 3M5 20.5l1-4 9.5-9.5a2.12 2.12 0 0 1 3 3L9 19.5l-4 1Z" />
      <path d="m13.5 5.5 1.5-1.5a2.83 2.83 0 0 1 4 0l2 2a2.83 2.83 0 0 1 0 4L19.5 11.5" />
    </svg>
  )
}

function UpDownIcon() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 25 25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <path d="m9 10 3.5-3.5L16 10M9 15l3.5 3.5L16 15" />
    </svg>
  )
}

// TextInput's `prefix` renders as a separate bordered addon; the icon slot keeps "#" inside.
function HashIcon() {
  return <span style={{opacity: 0.6}}>#</span>
}

type EyeDropperCtor = new () => {open: () => Promise<{sRGBHex: string}>}

type Channel = {key: string; label: string; value: number; min: number; max: number; step?: number}

/** Channels shown for each input mode, read from and written back to HSVA. */
function channelsFor(mode: ColorFormat, color: Hsva, alpha: boolean): Channel[] {
  const a: Channel[] = alpha
    ? [{key: 'a', label: 'A', value: Math.round(color.a * 100) / 100, min: 0, max: 1, step: 0.01}]
    : []
  if (mode === 'rgb') {
    const {r, g, b} = hsvaToRgba(color)
    return [
      {key: 'r', label: 'R', value: r, min: 0, max: 255},
      {key: 'g', label: 'G', value: g, min: 0, max: 255},
      {key: 'b', label: 'B', value: b, min: 0, max: 255},
      ...a,
    ]
  }
  if (mode === 'oklch') {
    const {l, c, h} = hsvaToOklcha(color)
    return [
      {key: 'l', label: 'L', value: Math.round(l * 1000) / 10, min: 0, max: 100, step: 0.1},
      {key: 'c', label: 'C', value: Math.round(c * 1000) / 1000, min: 0, max: 0.4, step: 0.005},
      {key: 'h', label: 'H', value: Math.round(h * 10) / 10, min: 0, max: 360},
      ...a,
    ]
  }
  if (mode === 'hsl') {
    const {h, s, l} = hsvaToHsla(color)
    return [
      {key: 'h', label: 'H', value: Math.round(h), min: 0, max: 360},
      {key: 's', label: 'S', value: Math.round(s * 100), min: 0, max: 100},
      {key: 'l', label: 'L', value: Math.round(l * 100), min: 0, max: 100},
      ...a,
    ]
  }
  return a
}

function withChannel(mode: ColorFormat, color: Hsva, key: string, n: number): Hsva {
  if (key === 'a') return {...color, a: n}
  if (mode === 'rgb') return rgbaToHsva({...hsvaToRgba(color), [key]: n})
  if (mode === 'oklch') {
    const oklch = hsvaToOklcha(color)
    return oklchaToHsva({...oklch, [key]: key === 'l' ? n / 100 : n})
  }
  const hsl = hsvaToHsla(color)
  return hslaToHsva({...hsl, [key]: key === 'h' ? n : n / 100})
}

/** A paste that is clearly a whole color, not a channel number (`123` stays a number). */
const looksLikeColor = (text: string) =>
  /^#|\(/.test(text.trim()) || /^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(text.trim())

function ChannelInput({
  channel,
  onCommit,
  onPasteColor,
}: {
  channel: Channel
  onCommit: (n: number) => void
  onPasteColor: (text: string) => boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = (raw: string | null) => {
    setDraft(null)
    const n = Number(raw)
    if (raw === null || raw.trim() === '' || Number.isNaN(n)) return
    onCommit(clamp(n, channel.min, channel.max))
  }
  return (
    <Stack gap={2} flex={1} style={{minWidth: 0}}>
      <TextInput
        aria-label={channel.label}
        fontSize={1}
        padding={2}
        inputMode="decimal"
        value={draft ?? String(channel.value)}
        style={{textAlign: 'center'}}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onPaste={(event) => {
          const text = event.clipboardData.getData('text')
          if (looksLikeColor(text) && onPasteColor(text)) {
            event.preventDefault()
            setDraft(null)
          }
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit(draft)
          }
          const dir = {ArrowUp: 1, ArrowDown: -1}[event.key]
          if (dir) {
            event.preventDefault()
            const step = (channel.step ?? 1) * (event.shiftKey ? 10 : 1)
            onCommit(clamp(channel.value + dir * step, channel.min, channel.max))
          }
        }}
      />
      <Text size={0} muted align="center">
        {channel.label}
      </Text>
    </Stack>
  )
}

function IconAction({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: ElementType
  onClick: () => void
}) {
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
        aria-label={label}
        icon={icon}
        mode="bleed"
        padding={2}
        fontSize={1}
        onClick={onClick}
      />
    </Tooltip>
  )
}

/**
 * Saturation/value area, swatch beside hue (and alpha) sliders, then the color as HEX, RGB or
 * HSL inputs with eyedropper, mode switch and copy. `onChange` fires live while dragging;
 * `onCommit` once a gesture or edit ends.
 */
export function ColorPicker({
  value,
  alpha,
  format,
  onChange,
  onCommit,
}: {
  value: Hsva | null
  alpha: boolean
  format: ColorFormat
  onChange: (color: Hsva) => void
  onCommit: (color: Hsva) => void
}) {
  const color = value ?? START
  const [mode, setMode] = useState<ColorFormat>(format)
  const [hexDraft, setHexDraft] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  // Hold the latest dragged color so pointer-up commits what was last shown.
  const latest = useRef(color)
  useLayoutEffect(() => {
    latest.current = color
  })
  const change = (next: Hsva) => {
    latest.current = next
    onChange(next)
  }
  const commitLatest = () => onCommit(latest.current)
  const set = (next: Hsva) => {
    latest.current = next
    onChange(next)
    onCommit(next)
  }

  const area = useDrag((x, y) => change({...latest.current, s: x, v: 1 - y}), commitLatest)
  const opaque = formatColor({...color, a: 1}, 'hex')
  const css = formatColor(color, 'rgb', alpha)

  // A pasted color replaces the current one at once, whatever was in the box.
  const pasteColor = (text: string): boolean => {
    const parsed = parseColor(text)
    if (!parsed) return false
    setHexDraft(null)
    set(alpha ? parsed : {...parsed, a: color.a})
    return true
  }

  const commitHex = () => {
    if (hexDraft === null) return
    const parsed = parseColor(hexDraft)
    setHexDraft(null)
    if (parsed) set(alpha ? parsed : {...parsed, a: color.a})
  }

  const EyeDropper =
    typeof window === 'undefined' ? undefined : (window as {EyeDropper?: EyeDropperCtor}).EyeDropper
  const pickFromScreen = async () => {
    if (!EyeDropper) return
    try {
      const {sRGBHex} = await new EyeDropper().open()
      const parsed = parseColor(sRGBHex)
      if (parsed) set({...parsed, a: color.a})
    } catch {
      // Cancelled with Escape.
    }
  }

  const nextMode = COLOR_FORMATS[(COLOR_FORMATS.indexOf(mode) + 1) % COLOR_FORMATS.length]
  const copy = () => {
    navigator.clipboard?.writeText(formatColor(color, mode, alpha)).then(() => setCopied(true))
  }

  return (
    <Stack gap={4}>
      <Card
        {...area}
        radius={2}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuetext={opaque}
        onKeyDown={(event: KeyboardEvent) => {
          const step = (event.shiftKey ? 10 : 1) / 100
          const moves: Record<string, Partial<Hsva>> = {
            ArrowLeft: {s: clamp(color.s - step)},
            ArrowRight: {s: clamp(color.s + step)},
            ArrowUp: {v: clamp(color.v + step)},
            ArrowDown: {v: clamp(color.v - step)},
          }
          if (!moves[event.key]) return
          event.preventDefault()
          set({...color, ...moves[event.key]})
        }}
        style={{
          position: 'relative',
          height: 180,
          touchAction: 'none',
          cursor: 'crosshair',
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${color.h} 100% 50%))`,
        }}
      >
        <Thumb x={`${color.s * 100}%`} y={`${(1 - color.v) * 100}%`} color={opaque} />
      </Card>

      <Flex gap={3} align="center">
        <Card
          radius={6}
          shadow={1}
          style={{width: 32, height: 32, flex: 'none', background: checkerboard(css)}}
        />
        <Stack gap={3} flex={1}>
          <Slider
            label="Hue"
            value={color.h / 360}
            step={1 / 360}
            background="linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)"
            thumbColor={`hsl(${color.h} 100% 50%)`}
            onChange={(x) => change({...latest.current, h: x * 360})}
            onCommit={commitLatest}
          />
          {alpha && (
            <Slider
              label="Opacity"
              value={color.a}
              step={0.01}
              background={overCheckerboard(`linear-gradient(to right, transparent, ${opaque})`)}
              thumbColor={css}
              onChange={(x) => change({...latest.current, a: Math.round(x * 100) / 100})}
              onCommit={commitLatest}
            />
          )}
        </Stack>
      </Flex>

      <Flex gap={1} align="flex-start">
        <Flex gap={1} flex={1}>
          {mode === 'hex' && (
            <Stack gap={2} flex={1} style={{minWidth: 0}}>
              <TextInput
                aria-label="Hex"
                fontSize={1}
                padding={2}
                icon={HashIcon}
                value={hexDraft ?? toHex({...color, a: 1}).slice(1)}
                onChange={(event) => setHexDraft(event.currentTarget.value.replace(/^#/, ''))}
                onPaste={(event) => {
                  if (pasteColor(event.clipboardData.getData('text'))) event.preventDefault()
                }}
                onBlur={commitHex}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    commitHex()
                  }
                }}
              />
              <Text size={0} muted align="center">
                HEX
              </Text>
            </Stack>
          )}
          {channelsFor(mode, color, alpha).map((channel) => (
            <ChannelInput
              key={`${mode}-${channel.key}`}
              channel={channel}
              onCommit={(n) => set(withChannel(mode, color, channel.key, n))}
              onPasteColor={pasteColor}
            />
          ))}
        </Flex>
        <Flex>
          {EyeDropper && (
            <IconAction label="Pick from screen" icon={EyedropperIcon} onClick={pickFromScreen} />
          )}
          <IconAction
            label={`Switch to ${nextMode.toUpperCase()}`}
            icon={UpDownIcon}
            onClick={() => setMode(nextMode)}
          />
          <IconAction
            label={copied ? 'Copied' : `Copy ${mode.toUpperCase()}`}
            icon={copied ? CheckmarkIcon : CopyIcon}
            onClick={copy}
          />
        </Flex>
      </Flex>
    </Stack>
  )
}
