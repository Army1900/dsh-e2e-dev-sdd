/**
 * Pure helpers behind the manual import editor.
 *
 * The editor is a DOM surface, so its text transforms live here where they can be unit tested:
 * splitting pasted Markdown into work items, inserting structure templates, and applying the
 * small Markdown toolbar to a textarea selection.
 */
export type ManualKind = 'requirement' | 'defect' | 'other';
export interface MarkdownSection {
    title: string;
    body: string;
}
/** Structure templates offered by the editor; they are ordinary Markdown so they stay editable. */
export declare function manualTemplate(kind: ManualKind): string;
/**
 * Split pasted Markdown into sections.
 *
 * Uses `##` headings when present, falls back to `#`, and finally to blank-line-separated blocks
 * whose first line becomes the title. That covers the two ways people paste notes: headed docs
 * and quick bullet lists.
 */
export declare function splitMarkdownSections(text: string): MarkdownSection[];
export type MarkdownCommand = 'h2' | 'bold' | 'list' | 'check' | 'code' | 'table';
/**
 * Apply one toolbar action to `value`/selection. Block commands prefix the current line; inline
 * commands wrap the selection (or insert a placeholder) and keep a useful cursor position.
 */
export declare function applyMarkdownCommand(value: string, selectionStart: number, selectionEnd: number, command: MarkdownCommand): {
    value: string;
    selectionStart: number;
    selectionEnd: number;
};
/** Suggested external key for one child item; blank stays blank so the host can assign one. */
export declare function itemKeySuggestion(rootKey: string, index: number): string;
