export interface JsonPreviewOptions {
    escapeHtml(value: string): string;
    sanitizeHtml(value: string): string;
    expanded: ReadonlySet<string>;
}
export declare function looksLikeHtml(value: string): boolean;
export declare function jsonPreviewHtml(value: unknown, options: JsonPreviewOptions): string;
