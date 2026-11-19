import type { KeyboardEvent } from 'react'

/**
 * Props that make a table row open on click and on Enter/Space,
 * so keyboard users can reach every record.
 */
export function clickableRow(onOpen: () => void) {
  return {
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onOpen()
      }
    },
  }
}
