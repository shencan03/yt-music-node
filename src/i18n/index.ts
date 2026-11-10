import { LOCALES } from "./locales.ts";

/** Translates an upstream gettext msgid (e.g. `"singles & eps"`) into the client language. */
export type Translator = (msgid: string) => string;

/**
 * Creates a translator bound to one language.
 *
 * Upstream injects `_` into module globals on every call (`parsers/_utils.py::i18n`), so two clients
 * with different languages interfere with each other. Here every client owns its own translator.
 */
export function createTranslator(language: string): Translator {
  const catalog = LOCALES[language] ?? {};
  return (msgid) => catalog[msgid] ?? msgid;
}
