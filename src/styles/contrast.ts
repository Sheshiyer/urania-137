function channelToLinear(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(color: string): number {
  const value = color.replace(/^#/, '')
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : value

  if (!/^[0-9a-f]{6}$/i.test(expanded)) {
    throw new Error(`Expected a three- or six-digit hex color, received ${color}`)
  }

  const [red, green, blue] = [0, 2, 4].map((offset) =>
    channelToLinear(Number.parseInt(expanded.slice(offset, offset + 2), 16)),
  )

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}
