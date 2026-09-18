type NavigationIconProps = {
  name: 'generators' | 'sites' | 'people' | 'settings'
}

export function NavigationIcon({ name }: NavigationIconProps) {
  if (name === 'generators') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 9h4M7 13h3M15 10v4M18 10v4M8 19v2M16 19v2" />
      </svg>
    )
  }

  if (name === 'sites') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 21h18M5 21V8l7-4v17M12 10h7v11M8 9h1M8 13h1M8 17h1M15 13h1M15 17h1" />
      </svg>
    )
  }

  if (name === 'settings') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.7a7 7 0 0 0-.7-1.7l.9-1.9-2.1-2.1-1.9.9a7 7 0 0 0-1.7-.7L10.5 2h-3l-.7 2a7 7 0 0 0-1.7.7l-1.9-.9-2.1 2.1.9 1.9a7 7 0 0 0-.7 1.7L0 10.5v3l2 .7a7 7 0 0 0 .7 1.7l-.9 1.9 2.1 2.1 1.9-.9a7 7 0 0 0 1.7.7l.7 2h3l.7-2a7 7 0 0 0 1.7-.7l1.9.9 2.1-2.1-.9-1.9a7 7 0 0 0 .7-1.7Z" /></svg>

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20v-2.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V20M15 5.5a3 3 0 0 1 0 5.5M16.5 13.5a4 4 0 0 1 4 4V20" />
    </svg>
  )
}
