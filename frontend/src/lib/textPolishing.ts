export function polishResponse(text: string): string {
    if (!text) return '';
    // Basic cleanup - remove excessive whitespace
    return text.trim();
}
