import type {ObjectInputProps, ObjectSchemaType} from 'sanity'

/** One swatch an editor can pick. `value` is any CSS color, usually a hex. */
export type ColorSwatch = {
  label: string
  value: string
}

export type ColorPickerValue = {
  _key?: string
  _type?: 'colorPicker'
  label?: string | null
  value?: string | null
}

/** Options for an individual `colorPicker` field. */
export interface ColorPickerFieldOptions {
  /** Swatches for this field. Replaces the plugin-level list. */
  colorList?: ColorSwatch[]
  /** Allow a custom color outside the swatch list. Defaults to `true`. */
  allowCustom?: boolean
}

/** Options for the plugin (argument to `colorPicker`). */
export interface ColorPickerPluginOptions {
  /** Default swatches for every `colorPicker` field. */
  colorList?: ColorSwatch[]
}

export type ColorPickerSchemaType = Omit<ObjectSchemaType, 'options'> & {
  options?: ColorPickerFieldOptions
}

export type ColorPickerInputProps = ObjectInputProps<ColorPickerValue, ColorPickerSchemaType> & {
  pluginOptions?: ColorPickerPluginOptions
}
