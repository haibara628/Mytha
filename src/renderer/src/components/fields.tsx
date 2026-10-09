export function TextField({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange(v: string): void
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 4
}: {
  label: string
  value: string
  onChange(v: string): void
  rows?: number
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

export function ListField({
  label,
  value,
  onChange
}: {
  label: string
  value: string[]
  onChange(v: string[]): void
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea
        value={value.join('\n')}
        rows={3}
        onChange={(e) => onChange(e.target.value.split('\n'))}
      />
    </label>
  )
}
