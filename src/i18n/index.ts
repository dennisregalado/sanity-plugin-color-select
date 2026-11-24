import {defineLocaleResourceBundle, useTranslation, type ValidationContext} from 'sanity'

import type {ColorSelectLocaleResourceKeys} from './resources'

/**
 * The i18n namespace of this plugin's UI strings. Add a `defineLocaleResourceBundle` for it to
 * translate the field into another Studio locale.
 *
 * @public
 */
export const colorSelectLocaleNamespace = 'color-select'

/** The English (US) strings, loaded on first use. Registered by the plugin. */
export const colorSelectUsEnglishLocaleBundle = defineLocaleResourceBundle({
  locale: 'en-US',
  namespace: colorSelectLocaleNamespace,
  resources: () => import('./resources'),
})

type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'

/** A key as passed to `t`: plural keys without their `_one` / `_other` suffix. */
type TranslationKey = ColorSelectLocaleResourceKeys extends infer K
  ? K extends `${infer Base}_${PluralSuffix}`
    ? Base
    : K
  : never

export type ColorSelectTranslate = (
  key: TranslationKey,
  values?: Record<string, string | number>,
) => string

/** `useTranslation` for the `color-select` namespace, with its keys checked by TypeScript. */
export function useColorSelectTranslation(): {t: ColorSelectTranslate} {
  const {t} = useTranslation(colorSelectLocaleNamespace)
  // Same function, narrower signature (react-i18next keeps it stable between renders).
  return {t: t as unknown as ColorSelectTranslate}
}

/**
 * Translates a validation message. Validation runs outside React, so it gets the workspace's
 * `i18n` from the validation context instead. That can be missing, or lack this namespace (the
 * CLI's `sanity documents validate` only loads Studio's own `validation` strings), so a key that
 * doesn't resolve falls back to the English string.
 */
export async function translateValidation(
  i18n: ValidationContext['i18n'] | undefined,
  key: TranslationKey,
): Promise<string> {
  const fullKey = `${colorSelectLocaleNamespace}:${key}`
  if (i18n) {
    try {
      await i18n.loadNamespaces([colorSelectLocaleNamespace])
      const text: unknown = i18n.t(fullKey)
      // i18next returns the key itself when it finds no string.
      if (typeof text === 'string' && text && text !== key && text !== fullKey) return text
    } catch {
      // Fall back to English below.
    }
  }
  const {default: english} = await import('./resources')
  return english[key as ColorSelectLocaleResourceKeys]
}
