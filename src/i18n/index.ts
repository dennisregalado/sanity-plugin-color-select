import {defineLocaleResourceBundle, useTranslation} from 'sanity'

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

