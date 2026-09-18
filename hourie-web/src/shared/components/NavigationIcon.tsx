type NavigationIconProps = {
  name: 'generators' | 'sites' | 'people'
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

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20v-2.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V20M15 5.5a3 3 0 0 1 0 5.5M16.5 13.5a4 4 0 0 1 4 4V20" />
    </svg>
  )
}
