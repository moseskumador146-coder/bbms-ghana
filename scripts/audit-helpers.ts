export function facilityCodeFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase()
  }
  return name.slice(0, 3).toUpperCase()
}
