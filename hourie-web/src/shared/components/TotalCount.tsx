export function TotalCount({
  value,
  label,
  loading = false,
}: {
  value: number | null | undefined;
  label: string;
  loading?: boolean;
}) {
  return (
    <div className="total-count" aria-live="polite">
      <strong>{loading || value == null ? "—" : value}</strong>
      <span>{label}</span>
    </div>
  );
}
