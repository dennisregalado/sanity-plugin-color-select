import type {JSX} from 'react'
import type {BlockAnnotationProps} from 'sanity'

import type {ColorPickerValue} from './types'

/** Renders a color mark in the Portable Text editor in its actual color. */
export function ColorAnnotation(
  props: BlockAnnotationProps & {mode: 'text' | 'highlight'},
): JSX.Element {
  const {mode, ...rest} = props
  const css = (rest.value as ColorPickerValue | undefined)?.value?.css
  const style = mode === 'text' ? {color: css} : {backgroundColor: css}
  return <span style={css ? style : undefined}>{rest.renderDefault(rest)}</span>
}
