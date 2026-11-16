import type {JSX} from 'react'
import {FormField, type ObjectFieldProps} from 'sanity'

/**
 * Renders the color object like a primitive field: a flat `FormField` around the input,
 * instead of the default object `FormFieldSet` with its indented left rule.
 */
export function ColorField(props: ObjectFieldProps): JSX.Element {
  return (
    <FormField
      __internal_comments={props.__internal_comments}
      __internal_slot={props.__internal_slot}
      __unstable_presence={props.presence}
      changedFromBaseVariant={props.changedFromBaseVariant}
      deprecated={props.schemaType.deprecated}
      description={props.description}
      inputId={props.inputId}
      level={props.level}
      path={props.path}
      title={props.title}
      validation={props.validation}
    >
      {props.children}
    </FormField>
  )
}
