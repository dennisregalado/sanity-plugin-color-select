/**
 * English (US) strings for the `color-select` namespace. Loaded lazily, the first time a color
 * field or validation rule asks for them.
 *
 * Keys ending in `_one` / `_other` are i18next plurals: call them without the suffix and with
 * `count`. `{{…}}` is an interpolated value; colors are passed already formatted (`#FF5733`,
 * `rgb(255 87 51)`).
 */
const colorSelectLocaleStrings = {
  /** Field input placeholder: presets and a picker */
  'input.placeholder': 'Search or paste a color',
  /** Field input placeholder: picker only */
  'input.placeholder.picker-only': 'Paste a color',
  /** Field input placeholder: presets only */
  'input.placeholder.palette-only': 'Search color presets',
  /** Field input placeholder while naming a just-saved preset */
  'input.placeholder.naming': 'Name the preset',
  /** Hint under the input while naming a just-saved preset */
  'input.naming-hint': 'Enter to save · Esc to cancel',
  /** Button (tooltip and label) that confirms the new preset's name */
  'input.save-preset': 'Save preset',
  /** Button (tooltip and label) that saves the field's color as a new preset */
  'input.save-as-preset': 'Save as preset',
  /** Button (tooltip and label) that clears the field */
  'input.clear': 'Clear',

  /** Toast title: creating a preset failed */
  'toast.save-failed': 'Could not save the preset',
  /** Toast title: renaming a just-saved preset failed */
  'toast.rename-failed': 'Could not rename the preset',
  /** Toast title: deleting a just-saved preset (naming cancelled) failed */
  'toast.delete-failed': 'Could not delete the preset',

  /** Reference row: the preset's color differs from the copy stored in the field */
  'reference.changed': 'Preset changed',
  /** Tooltip on "Preset changed" */
  'reference.changed.tooltip': 'The preset is now {{current}}; this field still stores {{stored}}.',
  /** Tooltip on "Preset changed" when the field has no stored copy yet */
  'reference.changed.tooltip.no-stored-color':
    'The preset is now {{current}}; this field stores no color yet.',
  /** Button that copies the preset's current color into the field */
  'reference.update': 'Update',
  /** Reference row: the linked preset no longer exists */
  'reference.deleted': 'Preset deleted',
  /** Tooltip on "Preset deleted" */
  'reference.deleted.tooltip':
    'This preset was deleted. Frontends still get the stored color, {{color}}.',
  /** Tooltip on "Preset deleted" when the field has no stored color */
  'reference.deleted.tooltip.no-stored-color':
    'This preset was deleted, and this field stores no color.',
  /** Button that keeps the stored color and drops the deleted preset's reference */
  'reference.unlink': 'Unlink',
  /** Reference row of a deleted preset with no stored color */
  'reference.no-color': 'No color',
  /** `aria-label` of the reference row's actions menu button */
  'reference.menu.label': 'Preset actions',
  /** Menu item: pick another preset or color */
  'reference.menu.replace': 'Replace',
  /** Menu item: keep the color, drop the reference */
  'reference.menu.unlink': 'Unlink from preset',
  /** Menu item: open the preset document */
  'reference.menu.open': 'Open preset',
  /** Menu item: clear the field */
  'reference.menu.remove': 'Remove',

  /** Heading above the preset list */
  'presets.heading': 'Presets',
  /** `aria-label` of the preset listbox */
  'presets.list-label': 'Presets',
  /** Shown when there are no presets */
  'presets.empty': 'No presets yet',
  /** Title of a preset without one */
  'presets.untitled': 'Untitled',
  /** Search results header while presets are loading */
  'presets.searching': 'Searching...',
  /** Search results header: the number of matching presets */
  'presets.results_one': '{{count}} result',
  'presets.results_other': '{{count}} results',
  /** `aria-label` of the search results listbox */
  'presets.results-label': 'Colors',
  /** Search result row that applies the typed color */
  'presets.use-color': 'Use {{color}}',
  /** No preset matches the typed text */
  'presets.no-matches': 'No presets match “{{query}}”',

  /** Heading above the recently used colors */
  'recent.heading': 'Recent',
  /** `aria-label` of the recently used colors */
  'recent.label': 'Recent colors',

  /** `aria-label` of the saturation and brightness area */
  'picker.area.label': 'Saturation and brightness',
  /** `aria-label` of the hue slider */
  'picker.hue.label': 'Hue',
  /** `aria-valuetext` of the hue slider */
  'picker.hue.value': '{{degrees}} degrees',
  /** `aria-label` of the opacity slider */
  'picker.opacity.label': 'Opacity',
  /** `aria-valuetext` of the opacity slider */
  'picker.opacity.value': '{{percent}}%',
  /** `aria-label` of the hex input */
  'picker.hex.label': 'Hex',
  /** Validation message for a hex input that isn't a color */
  'picker.hex.invalid': 'Enter a hex color, like FF5733',
  /** Validation message for a channel input that isn't a number */
  'picker.channel.invalid': 'Enter a number',
  /** Channel input labels (shown under the input, and its `aria-label`) */
  'picker.channel.r': 'R',
  'picker.channel.g': 'G',
  'picker.channel.b': 'B',
  'picker.channel.a': 'A',
  'picker.channel.h': 'H',
  'picker.channel.s': 'S',
  'picker.channel.l': 'L',
  'picker.channel.c': 'C',
  /** Eyedropper button */
  'picker.eyedropper': 'Pick from screen',
  /** Input mode button; `format` is HEX, RGB, HSL or OKLCH */
  'picker.switch-format': 'Switch to {{format}}',
  /** Copy button; `format` is HEX, RGB, HSL or OKLCH */
  'picker.copy': 'Copy {{format}}',
  /** Copy button after copying */
  'picker.copy.copied': 'Copied',
  /** Copy button when the clipboard refused */
  'picker.copy.failed': 'Couldn’t copy',

  /** Validation: a palette-only field holds a color that isn't a preset */
  'validation.pick-preset': 'Pick a preset',
  /** Validation: the preset isn't one of the field's `options.presets` */
  'validation.pick-field-preset': 'Pick one of this field’s presets',
  /** Validation warning: the referenced preset doesn't exist (published) */
  'validation.preset-deleted': 'The linked color preset is deleted or unpublished.',
  /** Validation warning: as above, when the field still stores a color */
  'validation.preset-deleted.stored-color':
    'The linked color preset is deleted or unpublished. Frontends still get the stored color.',
} satisfies Record<string, string>

/**
 * Every key in the `color-select` namespace, plural forms included (`presets.results_one`).
 *
 * @public
 */
export type ColorSelectLocaleResourceKeys = keyof typeof colorSelectLocaleStrings

export default colorSelectLocaleStrings
