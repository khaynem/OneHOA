export default function JobTitleField({
  label,
  value,
  onChange,
  required = false,
  inputClassName,
  labelClassName,
  requiredClassName,
  placeholder = 'Enter job title'
}) {
  const currentValue = String(value || '')
  const isNAText = currentValue.trim().toLowerCase() === 'n/a'

  const handleToggleNA = () => {
    if (isNAText) {
      onChange('')
      return
    }

    onChange('N/A')
  }

  return (
    <div>
      <label className={labelClassName}>
        {label} {required ? <span className={requiredClassName}>*</span> : null}
      </label>
      <input
        type="text"
        className={inputClassName}
        value={isNAText ? '' : currentValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder={isNAText ? 'N/A' : placeholder}
        required={required}
        disabled={isNAText}
      />
      <button type="button" onClick={handleToggleNA} style={{ marginTop: '0.5rem', border: 'none', background: 'transparent', color: '#0070C4', fontWeight: 600, padding: 0, cursor: 'pointer', textAlign: 'left' }}>
        {isNAText ? 'Use manual entry' : 'Set as N/A'}
      </button>
    </div>
  )
}
