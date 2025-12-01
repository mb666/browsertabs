import numbro from 'numbro'

export function formatAgo(value, nowTimestamp) {
  if (!value || !nowTimestamp) {
    return '-'
  }
  const diffMs = nowTimestamp - value
  if (diffMs < 0) {
    return '0ms ago'
  }
  if (diffMs < 1000) {
    return `${diffMs}ms ago`
  }
  if (diffMs < 60_000) {
    return `${Math.round(diffMs / 1000)}s ago`
  }
  const minutes = Math.floor(diffMs / 60_000)
  const seconds = Math.round((diffMs % 60_000) / 1000)
  return `${minutes}m ${seconds}s ago`
}

export function formatLastPing(value) {
  if (!value) {
    return '-'
  }
  const formatted = numbro(value).format({ mantissa: 0, thousandSeparated: true })
  return `${formatted}ms`
}
