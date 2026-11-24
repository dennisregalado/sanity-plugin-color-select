import {useEffect, useId, useMemo, useState} from 'react'

/** Keyboard state shared by the popover's lists: the active row and the ids ARIA points at. */
export type ListNavigation = {
  listboxId: string
  /** Index into the popover's rows (the "Use <color>" row first, when shown). */
  activeIndex: number
  optionId: (index: number) => string
}

/**
 * The combobox's active row: moved with the arrow keys while focus stays in the input, shown with
 * the hover look and announced through `aria-activedescendant`.
 *
 * The active row belongs to one list, named by `listKey`: it resets when the key changes (a new
 * query, the popover closing) or the list gets shorter than the active index.
 */
export function useListNavigation(
  listKey: string,
  rowCount: number,
): {nav: ListNavigation; move: (down: boolean) => void} {
  const [activeState, setActiveState] = useState({key: '', index: -1})
  const activeIndex =
    activeState.key === listKey && activeState.index < rowCount ? activeState.index : -1

  const baseId = useId()
  const nav: ListNavigation = useMemo(
    () => ({
      listboxId: `${baseId}-listbox`,
      activeIndex,
      optionId: (index: number) => `${baseId}-option-${index}`,
    }),
    [activeIndex, baseId],
  )

  useEffect(() => {
    if (activeIndex < 0) return
    document.getElementById(nav.optionId(activeIndex))?.scrollIntoView({block: 'nearest'})
  }, [activeIndex, nav])

  // ArrowDown/ArrowUp: the next or previous row, wrapping at the ends. ArrowUp with no active row
  // starts from the last.
  const move = (down: boolean) => {
    if (!rowCount) return
    let next = down ? activeIndex + 1 : activeIndex - 1
    if (activeIndex < 0 && !down) next = rowCount - 1
    setActiveState({key: listKey, index: (next + rowCount) % rowCount})
  }

  return {nav, move}
}
