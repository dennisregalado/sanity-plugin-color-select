import React from 'react'
import {
  defineField,
  definePlugin,
  defineType,
  type ObjectInputProps,
  type SchemaTypeDefinition,
} from 'sanity'

import {ColorPickerInput, ColorPreviewMedia} from './input'
import type {
  ColorPickerInputProps,
  ColorPickerPluginOptions,
  ColorPickerSchemaType,
  ColorPickerValue,
} from './types'

/**
 * Registers a `colorPicker` object type: `{label, value}`, picked from a swatch list or entered
 * as a custom color.
 *
 * @example
 * ```ts
 * // sanity.config.ts
 * plugins: [colorPicker({colorList: [{label: 'Bone', value: '#F3F0DE'}]})]
 *
 * // schema
 * defineField({name: 'background', type: 'colorPicker'})
 * ```
 */
export const colorPicker = definePlugin<ColorPickerPluginOptions | void>((options) => {
  const pluginOptions = options || {}

  const colorPickerType = defineType({
    name: 'colorPicker',
    title: 'Color',
    type: 'object',
    fields: [
      defineField({name: 'label', title: 'Label', type: 'string'}),
      defineField({name: 'value', title: 'Value', type: 'string'}),
    ],
    preview: {
      select: {label: 'label', value: 'value'},
      prepare: ({label, value}: {label?: string; value?: string}) => ({
        title: label || value || 'No color',
        subtitle: label && value ? value : undefined,
        media: React.createElement(ColorPreviewMedia, {value}),
      }),
    },
    components: {
      input: (props: ObjectInputProps) =>
        React.createElement(ColorPickerInput, {
          ...(props as ObjectInputProps<ColorPickerValue, ColorPickerSchemaType>),
          pluginOptions,
        } as ColorPickerInputProps),
    },
  })

  return {
    name: 'color-picker',
    schema: {types: [colorPickerType as SchemaTypeDefinition]},
  }
})

export type {
  ColorPickerFieldOptions,
  ColorPickerInputProps,
  ColorPickerPluginOptions,
  ColorPickerSchemaType,
  ColorPickerValue,
  ColorSwatch,
} from './types'
