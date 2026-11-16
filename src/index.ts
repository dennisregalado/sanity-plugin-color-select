import {HighlightIcon} from '@sanity/icons/Highlight'
import {TextIcon} from '@sanity/icons/Text'
import React from 'react'
import {
  defineField,
  definePlugin,
  defineType,
  type BlockAnnotationProps,
  type ObjectInputProps,
  type SchemaTypeDefinition,
} from 'sanity'

import type {ColorValue} from './color'
import {ColorAnnotation} from './annotations'
import {ColorPickerInput, PresetColorInput} from './input'
import {ColorSwatch} from './presets'
import type {
  ColorOptions,
  ColorPickerInputProps,
  ColorPickerPluginOptions,
  ColorPickerSchemaType,
  ColorPickerValue,
} from './types'

const channels = (name: string, title: string, keys: string[]) =>
  defineField({
    name,
    title,
    type: 'object',
    fields: keys.map((key) => defineField({name: key, type: 'number'})),
  })

/**
 * Registers a `colorPicker` field type, its `colorPickerValue` object and a preset document
 * type (`colorPreset` by default).
 *
 * The input always writes the resolved color to `value` (`css`, `hex`, `alpha`, `rgb`, `hsl`,
 * `hsv`, `oklch`), and also a weak `reference` when it came from a preset, so GROQ can read
 * `background.value.css` directly or `background.reference->title`.
 *
 * @example
 * ```ts
 * // sanity.config.ts
 * plugins: [colorPicker({format: 'hex', alpha: true, paletteOnly: false})]
 *
 * // schema (field options override the plugin's)
 * defineField({name: 'background', type: 'colorPicker', options: {paletteOnly: true}})
 * ```
 */
export const colorPicker = definePlugin<ColorPickerPluginOptions | void>((options) => {
  const presetType = options?.presetType ?? 'colorPreset'
  const defaults: Required<ColorOptions> = {
    format: options?.format ?? 'hex',
    alpha: options?.alpha ?? true,
    paletteOnly: options?.paletteOnly ?? false,
    pickerOnly: options?.pickerOnly ?? false,
  }

  const colorPreset = defineType({
    name: presetType,
    title: 'Color preset',
    type: 'document',
    fields: [
      defineField({
        name: 'title',
        title: 'Title',
        type: 'string',
        placeholder: 'e.g. Charcoal',
        validation: (rule) => rule.required(),
      }),
      defineField({
        name: 'color',
        title: 'Color',
        type: 'colorPickerValue',
        validation: (rule) => rule.required(),
        components: {
          input: (props: ObjectInputProps) =>
            React.createElement(PresetColorInput, {
              ...(props as ObjectInputProps<ColorValue>),
              presetType,
              defaults,
            }),
        },
      }),
    ],
    preview: {
      select: {title: 'title', css: 'color.css'},
      prepare: ({title, css}: {title?: string; css?: string}) => ({
        title: title || 'Untitled',
        subtitle: css,
        media: React.createElement(ColorSwatch, {color: css, size: '100%'}),
      }),
    },
  })

  const colorPickerValue = defineType({
    name: 'colorPickerValue',
    title: 'Color value',
    type: 'object',
    fields: [
      defineField({name: 'css', title: 'CSS', type: 'string'}),
      defineField({name: 'hex', title: 'Hex', type: 'string'}),
      defineField({name: 'alpha', title: 'Alpha', type: 'number'}),
      channels('rgb', 'RGB', ['r', 'g', 'b', 'a']),
      channels('hsl', 'HSL', ['h', 's', 'l', 'a']),
      channels('hsv', 'HSV', ['h', 's', 'v', 'a']),
      channels('oklch', 'OKLCH', ['l', 'c', 'h', 'a']),
    ],
  })

  /** The `{value, reference}` color object, shared by the field and the Portable Text marks. */
  const colorObjectType = (
    name: string,
    typeTitle: string,
    extra: {icon?: React.ComponentType; annotation?: 'text' | 'highlight'} = {},
  ) =>
    defineType({
      name,
      title: typeTitle,
      type: 'object',
      icon: extra.icon,
      // Marks edit in a dialog: the field's own popover nests reliably there, unlike in the
      // default annotation popover.
      ...(extra.annotation ? {options: {modal: {type: 'dialog', width: 1}}} : {}),
      fields: [
        defineField({name: 'value', title: 'Color', type: 'colorPickerValue'}),
        defineField({
          name: 'reference',
          title: 'Color preset',
          type: 'reference',
          weak: true,
          to: [{type: presetType}],
        }),
      ],
      validation: (rule) =>
        rule.custom((value: ColorPickerValue | undefined, context) => {
          const type = context.type as ColorPickerSchemaType | undefined
          const paletteOnly = type?.options?.paletteOnly ?? defaults.paletteOnly
          if (paletteOnly && value?.value && !value.reference) return 'Pick a preset'
          const allowed = type?.options?.presets
          const ref = value?.reference?._ref
          if (allowed && ref && !allowed.includes(ref)) return 'Pick one of this field’s presets'
          return true
        }),
      preview: {
        select: {css: 'value.css', title: 'reference.title'},
        prepare: ({css, title}: {css?: string; title?: string}) => ({
          title: title || css || 'No color',
          subtitle: title ? css : undefined,
          media: React.createElement(ColorSwatch, {color: css, size: '100%'}),
        }),
      },
      components: {
        input: (props: ObjectInputProps) =>
          React.createElement(ColorPickerInput, {
            ...(props as ObjectInputProps<ColorPickerValue>),
            presetType,
            defaults,
          } as ColorPickerInputProps),
        ...(extra.annotation
          ? {
              annotation: (props: BlockAnnotationProps) =>
                React.createElement(ColorAnnotation, {...props, mode: extra.annotation!}),
            }
          : {}),
      },
    })

  const colorPickerType = colorObjectType('colorPicker', 'Color')
  // Portable Text marks: add to a block's `marks.annotations`.
  const colorText = colorObjectType('colorText', 'Text color', {icon: TextIcon, annotation: 'text'})
  const colorHighlight = colorObjectType('colorHighlight', 'Highlight', {
    icon: HighlightIcon,
    annotation: 'highlight',
  })

  return {
    name: 'color-select',
    schema: {
      types: [
        colorPreset,
        colorPickerValue,
        colorPickerType,
        colorText,
        colorHighlight,
      ] as SchemaTypeDefinition[],
    },
  }
})

export {
  formatColor,
  fromColorValue,
  normalizeColor,
  parseColor,
  sameColor,
  toColorValue,
  type ColorFormat,
  type ColorValue,
  type Hsva,
} from './color'
export type {
  ColorOptions,
  ColorPickerFieldOptions,
  ColorPickerInputProps,
  ColorPickerPluginOptions,
  ColorPickerValue,
  ColorReferenceValue,
  ColorPreset,
} from './types'
