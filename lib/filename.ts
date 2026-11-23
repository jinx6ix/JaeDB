export function sanitizeFilename(value: string): string {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function clientPropertyFilename(clientName: string, propertyName: string, extension: string): string {
  const client = sanitizeFilename(clientName || 'client');
  const property = sanitizeFilename(propertyName || 'property');
  return `${client}_${property}${extension}`;
}
