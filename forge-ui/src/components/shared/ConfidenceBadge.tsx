/**
 * ConfidenceBadge — a DetectedField's confidence. Semantic signal colors:
 * high=green, medium=amber, low=red, unknown=purple (insufficient evidence).
 */
export function confidenceClass(confidence: string): string {
  switch (confidence) {
    case 'high':   return 'bg-pass'     // green
    case 'medium': return 'bg-flaky'    // amber
    case 'low':    return 'bg-fail'     // red
    default:       return 'bg-unknown'  // purple — insufficient evidence
  }
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
      <span className={`inline-block h-2 w-2 rounded-full ${confidenceClass(confidence)}`} />
      {confidence}
    </span>
  )
}
