type ActionIconProps = {
  name: 'add' | 'close' | 'collapse' | 'expand' | 'logout' | 'filter'
}

export function ActionIcon({ name }: ActionIconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      {name === 'add' ? (
        <path d="M10 4v12M4 10h12" />
      ) : name === 'close' ? (
        <path d="m5.5 5.5 9 9m0-9-9 9" />
      ) : name === 'collapse' ? (
        <path d="m12.5 5-5 5 5 5" />
      ) : name === 'expand' ? (
        <path d="m7.5 5 5 5-5 5" />
      ) : name === 'logout' ? (
        <><path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8M11.5 6.5 15 10l-3.5 3.5M8 10h7" /></>
      ) : (
        <path d="M3.5 5h13M5.5 10h9M8 15h4" />
      )}
    </svg>
  )
}
