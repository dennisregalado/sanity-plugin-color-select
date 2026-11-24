import {Button, Text} from '@sanity/ui'
import {Tooltip} from '@sanity/ui/tooltip'
import type {ElementType, JSX, MouseEvent} from 'react'

/**
 * `onMouseDown` for controls that shouldn't take focus from the field's input, like TextInput's
 * built-in clear button and the link picker's rows. Otherwise the input's blur would clear the
 * search and swap the popover content before the click lands.
 */
export const keepFocus = (event: MouseEvent): void => event.preventDefault()

/** A bleed icon button with its label as both tooltip and `aria-label`. */
export function TooltipButton({
  label,
  icon,
  fontSize,
  keepInputFocus,
  onClick,
}: {
  label: string
  icon: ElementType
  fontSize?: number
  /** Leave focus where it is when clicked (see `keepFocus`). */
  keepInputFocus?: boolean
  onClick: () => void
}): JSX.Element {
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
        fontSize={fontSize}
        onMouseDown={keepInputFocus ? keepFocus : undefined}
        onClick={onClick}
      />
    </Tooltip>
  )
}
