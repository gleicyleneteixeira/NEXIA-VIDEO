export function sanitizeHashtags(hashtags: string[] | string): string {
  if (!hashtags) return '';

  let list: string[] = [];

  if (Array.isArray(hashtags)) {
    list = hashtags;
  } else if (typeof hashtags === 'string') {
    // Separa por espaço ou vírgula
    list = hashtags.split(/[\s,]+/);
  }

  const cleanTags = list
    .map(tag => tag.trim())
    .filter(Boolean)
    .map(tag => {
      // 1. Remove TODOS os '#' do início da palavra
      const wordWithoutHash = tag.replace(/^#+/, '');
      // 2. Retorna com apenas um '#'
      return `#${wordWithoutHash}`;
    });

  // Retorna as hashtags separadas por espaço simples
  return Array.from(new Set(cleanTags)).join(' ');
}
