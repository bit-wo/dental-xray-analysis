export function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toString();
}

export function getConfidenceColor(confidence: number | null | undefined): 'green' | 'amber' | 'red' | 'slate' {
  if (confidence === null || confidence === undefined) return 'slate';
  if (confidence >= 0.7) return 'green';
  if (confidence >= 0.4) return 'amber';
  return 'red';
}

export function getConfidenceBadgeClass(confidence: number | null | undefined): string {
  const color = getConfidenceColor(confidence);
  return `badge-${color}`;
}

export function getStatusBadgeClass(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes('candidate match')) return 'badge-green';
  if (lower.includes('uncertain')) return 'badge-amber';
  if (lower.includes('low-confidence')) return 'badge-red';
  if (lower.includes('no confident')) return 'badge-red';
  return 'badge-slate';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDimensions(width: number, height: number): string {
  return `${width} × ${height} px`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}