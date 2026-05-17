export function clampDragHeight(
  startHeight: number,
  deltaY: number,
  minHeight: number,
): number {
  const next = startHeight + deltaY;
  return next < minHeight ? minHeight : next;
}
