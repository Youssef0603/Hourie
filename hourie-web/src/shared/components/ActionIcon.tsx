type ActionIconProps = {
  name: 'add' | 'close' | 'collapse' | 'expand' | 'logout' | 'filter' | 'refresh' | 'location' | 'upload' | 'edit' | 'history'
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
      ) : name === 'refresh' ? (
        <><path d="M15.5 8A6 6 0 1 0 16 11M15.5 4.5V8H12" /></>
      ) : name === 'location' ? (
        <><path d="M16 8.5c0 4.25-6 8-6 8s-6-3.75-6-8a6 6 0 1 1 12 0Z" /><circle cx="10" cy="8.5" r="1.8" /></>
      ) : name === 'upload' ? (
        <><path d="M10 13V4M6.5 7.5 10 4l3.5 3.5M4 12.5v2A1.5 1.5 0 0 0 5.5 16h9a1.5 1.5 0 0 0 1.5-1.5v-2" /></>
      ) : name === 'edit' ? (
        <><path d="M4.5 13.5 4 16l2.5-.5L15 7a1.4 1.4 0 0 0-2-2L4.5 13.5Z" /><path d="m11.5 6.5 2 2" /></>
      ) : name === 'history' ? (
        <><path d="M4.8 6.5H2.5V4.2" /><path d="M3 6.2A7 7 0 1 1 3.5 14" /><path d="M10 6v4l2.8 1.7" /></>
      ) : (
        <path d="M3.5 5h13M5.5 10h9M8 15h4" />
      )}
    </svg>
  )
}
