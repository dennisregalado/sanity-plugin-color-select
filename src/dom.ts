import type {MutableRefObject, Ref} from 'react'

/** Points each ref (callback or object) at `node`. */
export function assignRefs<T>(node: T | null, ...refs: Array<Ref<T> | undefined>): void {
  for (const ref of refs) {
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as MutableRefObject<T | null>).current = node
  }
}

const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]'

/** Elements Tab can reach inside `root`, in DOM order. */
export function tabbables(root: HTMLElement | Document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.hasAttribute('disabled') && el.getClientRects().length > 0,
  )
}

/** The element Tab would reach after `after`, skipping anything inside `skip`. */
export function nextTabbable(
  after: HTMLElement,
  skip: Array<HTMLElement | null>,
): HTMLElement | null {
  return (
    tabbables(document).find(
      (el) =>
        !after.contains(el) &&
        // eslint-disable-next-line no-bitwise
        Boolean(after.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        !skip.some((node) => node?.contains(el)),
    ) ?? null
  )
}
