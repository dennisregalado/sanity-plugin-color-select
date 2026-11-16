# sanity-plugin-color-select

A Sanity Studio color field built like a link picker: one input, a popover, and **shared color presets** your whole dataset references.

- **Color presets**: documents with a title and a color. Pick one and the field stores a weak reference _and_ a snapshot of the color, so GROQ never has to dereference.
- **Picker**: saturation/brightness area, hue and opacity sliders, HEX / RGB / HSL / OKLCH inputs, an eyedropper (Chromium) and copy to clipboard.
- **Search or paste**: type a preset's title or hex to search presets, or paste any CSS color (`#AE2525`, `rgb(…)`, `hsl(…)`, `oklch(…)`) to apply it immediately.
- **Save as preset** inline: turn the current color into a preset right from the field, then name it.
- **Modes**: presets only, picker only, or both.
- **Portable Text** text-color and highlight marks with the same UI.
- **A GROQ-friendly value**: `css`, `hex`, `alpha`, `rgb`, `hsl`, `hsv` and `oklch`, written by the Studio so your frontend doesn't convert anything.

## Install

```sh
npm install sanity-plugin-color-select
```

```ts
// sanity.config.ts
import {defineConfig} from 'sanity'
import {colorPicker} from 'sanity-plugin-color-select'

export default defineConfig({
  // ...
  plugins: [colorPicker()],
})
```

## Usage

```ts
import {defineField} from 'sanity'

defineField({
  name: 'background',
  title: 'Background',
  type: 'colorPicker',
})
```

### Options

Pass options to the plugin to set defaults for every field. A field's `options` override them.

```ts
colorPicker({
  format: 'hex', // 'hex' | 'rgb' | 'hsl' | 'oklch'
  alpha: true,
  paletteOnly: false,
  pickerOnly: false,
  presetType: 'colorPreset',
})

defineField({
  name: 'brandColor',
  type: 'colorPicker',
  options: {paletteOnly: true},
})
```

| Option        | Default         |                                                                                                                                                             |
| ------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format`      | `'hex'`         | How `value.css` is written, and the picker's starting input mode.                                                                                           |
| `alpha`       | `true`          | Show the opacity slider and keep alpha in the value.                                                                                                        |
| `paletteOnly` | `false`         | Only presets: no picker, no custom colors, no saving. A custom value fails validation.                                                                      |
| `pickerOnly`  | `false`         | Only the picker: no presets, search, saving or references. Wins over `paletteOnly`.                                                                         |
| `presetType`  | `'colorPreset'` | Name of the preset document type (plugin-level only).                                                                                                       |
| `presets`     | —               | Field-level only. Limit the field to these preset document IDs, in this order. Saving new presets from the field is off, and other presets fail validation. |

Limit a field to some presets, e.g. backgrounds that must stay dark under light text:

```ts
defineField({
  name: 'background',
  type: 'colorPicker',
  options: {paletteOnly: true, presets: ['colorPreset-charcoal', 'colorPreset-oxide']},
})
```

### Color presets

The plugin registers a `colorPreset` document type with a `title` and a `color`. Add it to your structure if you want a list of presets:

```ts
S.documentTypeListItem('colorPreset').title('Color presets')
```

Editors can also create presets from any color field: pick a color, click **Save as preset**, and name it.

### Portable Text marks

Add text color and highlight to a block's annotations:

```ts
defineArrayMember({
  type: 'block',
  marks: {
    annotations: [{type: 'colorText'}, {type: 'colorHighlight'}],
  },
})
```

The Studio editor renders marked text in its color. Each mark stores the same object as a field.

## Stored value

```ts
{
  _type: 'colorPicker',
  // Only when a preset was picked:
  reference: {_type: 'reference', _ref: '…', _weak: true},
  value: {
    _type: 'colorPickerValue',
    css: '#AE2525', // in the field's `format`, ready to use
    hex: '#AE2525', // always 6-digit, without alpha
    alpha: 1,
    rgb: {r: 174, g: 37, b: 37, a: 1},
    hsl: {h: 0, s: 0.649, l: 0.414, a: 1},
    hsv: {h: 0, s: 0.787, v: 0.682, a: 1},
    oklch: {l: 0.492, c: 0.173, h: 26.4, a: 1},
  },
}
```

A preset's `color` has the same `colorPickerValue` shape.

When a field references a preset, `value` is a snapshot of the preset's color, taken when the preset was picked. Opening a document never writes to it; it's refreshed the next time an editor changes the field. If a preset's color may change after it's been picked, read the live color first:

```groq
"background": coalesce(background.reference->color.css, background.value.css)
```

## GROQ

```groq
*[_type == "page"][0]{
  "background": coalesce(background.reference->color.css, background.value.css),
  "backgroundName": background.reference->title,
  "backgroundRgb": background.value.rgb,
}
```

Portable Text marks:

```groq
content[]{
  ...,
  markDefs[]{
    ...,
    _type in ["colorText", "colorHighlight"] => {"color": value.css}
  }
}
```

## Utilities

The color helpers the input uses are exported for frontends that need them:

```ts
import {parseColor, formatColor} from 'sanity-plugin-color-select'

formatColor(parseColor('#AE2525')!, 'oklch') // 'oklch(49.2% 0.173 26.4)'
```

## License

MIT © Dennis Regalado
