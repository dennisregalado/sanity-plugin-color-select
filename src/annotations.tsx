import type {BlockAnnotationProps} from 'sanity'

import type {ColorPickerValue} from './types'

/** Renders a color mark in the Portable Text editor in its actual color. */
export function ColorAnnotation(props: BlockAnnotationProps & {mode: 'text' | 'highlight'}) {
  const {mode, ...rest} = props
  const css = (rest.value as ColorPickerValue | undefined)?.value?.css
  return (
    <span style={css ? (mode === 'text' ? {color: css} : {backgroundColor: css}) : undefined}>
      {rest.renderDefault(rest)}
    </span>
  )
}
