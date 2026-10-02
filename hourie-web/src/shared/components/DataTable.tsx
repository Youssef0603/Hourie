import type { ReactNode } from 'react'

type DataTableProps = {
  children: ReactNode
  className?: string
  ariaLabel: string
}

export function DataTable({ children, className = '', ariaLabel }: DataTableProps) {
  return <div className="equipment-table-wrap"><table className={`equipment-table ${className}`.trim()} aria-label={ariaLabel}>{children}</table></div>
}
