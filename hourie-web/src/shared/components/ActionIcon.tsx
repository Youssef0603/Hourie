type ActionIconProps = {
  name: 'add' | 'close' | 'collapse' | 'expand' | 'logout' | 'filter' | 'search' | 'refresh' | 'location' | 'transfer' | 'upload' | 'edit' | 'history' | 'delete' | 'photo' | 'invoice' | 'maintenance' | 'identification' | 'specifications' | 'note' | 'inbox' | 'people'
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
      ) : name === 'search' ? (
        <><circle cx="8.5" cy="8.5" r="4.5" fill="none" /><path d="m12 12 4 4" /></>
      ) : name === 'location' ? (
        <><path d="M16 8.5c0 4.25-6 8-6 8s-6-3.75-6-8a6 6 0 1 1 12 0Z" /><circle cx="10" cy="8.5" r="1.8" /></>
      ) : name === 'transfer' ? (
        <><path d="M4 6h11M12 3l3 3-3 3M16 14H5M8 11l-3 3 3 3" /></>
      ) : name === 'upload' ? (
        <><path d="M10 13V4M6.5 7.5 10 4l3.5 3.5M4 12.5v2A1.5 1.5 0 0 0 5.5 16h9a1.5 1.5 0 0 0 1.5-1.5v-2" /></>
      ) : name === 'edit' ? (
        <><path d="M4.5 13.5 4 16l2.5-.5L15 7a1.4 1.4 0 0 0-2-2L4.5 13.5Z" /><path d="m11.5 6.5 2 2" /></>
      ) : name === 'history' ? (
        <><path d="M4.8 6.5H2.5V4.2" /><path d="M3 6.2A7 7 0 1 1 3.5 14" /><path d="M10 6v4l2.8 1.7" /></>
      ) : name === 'delete' ? (
        <><path d="M4.5 6h11M8 3.5h4M6 6l.7 10h6.6L14 6M8.2 8.5v5M11.8 8.5v5" /></>
      ) : name === 'photo' ? (
        <><rect x="3" y="4" width="14" height="12" rx="1.5" /><circle cx="7" cy="8" r="1.3" /><path d="m4.5 14 3.5-3 2.5 2 2.2-2 2.8 3" /></>
      ) : name === 'invoice' ? (
        <><path d="M5 2.8h6l4 4V17H5Z" /><path d="M11 2.8V7h4M7.5 10h5M7.5 13h5" /></>
      ) : name === 'maintenance' ? (
        <><path d="M4 13.5a6.5 6.5 0 1 1 12-3.5" /><path d="M4 9.5v4h4" /></>
      ) : name === 'identification' ? (
        <><path d="M3.5 9.5V5a1.5 1.5 0 0 1 1.5-1.5h4.5L16.5 10l-6.5 6.5Z" /><circle cx="7" cy="7" r="1" /></>
      ) : name === 'specifications' ? (
        <><path d="M11.2 2.8 5.5 10h4l-.7 7.2 5.7-8h-4Z" /></>
      ) : name === 'note' ? (
        <><path d="M5 3h10v14H5Z" /><path d="M7.5 7h5M7.5 10h5M7.5 13h3" /></>
      ) : name === 'inbox' ? (
        <><path d="M3.5 6.5 5 4h10l1.5 2.5V16h-13Z" /><path d="M3.5 11h3l1.3 2h4.4l1.3-2h3" /></>
      ) : name === 'people' ? (
        <><circle cx="7" cy="7" r="2.4" /><path d="M2.8 16c.3-3 1.7-4.5 4.2-4.5s3.9 1.5 4.2 4.5" /><circle cx="14" cy="7.5" r="1.8" /><path d="M12.6 12c2.7-.5 4.3.8 4.6 3.5" /></>
      ) : (
        <path d="M3.5 5h13M5.5 10h9M8 15h4" />
      )}
    </svg>
  )
}
