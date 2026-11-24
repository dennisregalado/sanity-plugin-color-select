import {EditIcon} from '@sanity/icons/Edit'
import {EllipsisHorizontalIcon} from '@sanity/icons/EllipsisHorizontal'
import {LaunchIcon} from '@sanity/icons/Launch'
import {TrashIcon} from '@sanity/icons/Trash'
import {UnlinkIcon} from '@sanity/icons/Unlink'
import {Badge, Box, Button, Card, Flex, Text} from '@sanity/ui'
import {Menu, MenuButton, MenuDivider, MenuItem} from '@sanity/ui/menu'
import {Tooltip} from '@sanity/ui/tooltip'
import {type JSX, type ReactNode, useCallback, useEffect, useId} from 'react'
import {
  type Path,
  SanityDefaultPreview,
  SearchResultItemPreview,
  useEditState,
  usePerspective,
  useSchema,
} from 'sanity'
import {usePaneRouter} from 'sanity/structure'

import type {StoredColor} from './color'
import {ColorSwatch} from './presets'

/** `deleted`: the preset has no published or draft document (references are weak). */
export type LiveColor = {id: string; color: StoredColor; deleted: boolean}

/**
 * Reports the live color of the referenced preset. Rendered only while a field has a reference,
 * so empty fields don't listen to a document.
 *
 * Reads the *published* preset, like the preset list and the copy taken at pick time: frontends
 * only ever see published presets, so an unpublished draft edit doesn't flag every field that uses
 * the preset as out of date (or show a color no frontend will get).
 */
export function ReferencedPreset({
  id,
  type,
  onColor,
}: {
  id: string
  type: string
  onColor: (live: LiveColor) => void
}): null {
  const state = useEditState(id, type)
  const doc = state.published as {color?: StoredColor} | null
  const color = doc?.color ?? null
  const deleted = state.ready && !state.published && !state.draft && !state.version
  useEffect(() => onColor({id, color, deleted}), [id, color, deleted, onColor])
  return null
}

const insetClip = {clipPath: 'inset(3px round 2px)'}

/** Like the compact preview, for a preset that's gone: the field's own swatch and CSS. */
function StoredPreview({css}: {css: string | null}) {
  return (
    <Flex align="center" gap={2} padding={1} style={{minWidth: 0}}>
      <Box style={{width: 25, height: 25, flex: 'none'}}>
        {css && <ColorSwatch color={css} size="100%" />}
      </Box>
      <Box flex={1} style={{minWidth: 0}}>
        <Text size={1} weight="medium" textOverflow="ellipsis" muted={!css}>
          {css ?? 'No color'}
        </Text>
      </Box>
    </Flex>
  )
}

/**
 * Preset reference, shown like a native reference input (and the link picker's): the preset's
 * preview, a "Preset changed" warning with Update when `value` is out of date, and an actions menu.
 * A deleted preset shows the stored color instead, a "Preset deleted" warning and Unlink.
 */
export function PresetReference({
  documentId,
  documentType,
  path,
  readOnly,
  outdated,
  deleted,
  storedCss,
  onUpdate,
  onReplace,
  onUnlink,
  onRemove,
}: {
  documentId: string
  documentType: string
  path: Path
  readOnly?: boolean
  /** The preset's color changed since it was copied to `value`: the two colors, as text. */
  outdated?: {stored: string | null; current: string} | null
  /** The preset was deleted; the row shows `storedCss`, the field's own color. */
  deleted?: boolean
  storedCss?: string | null
  onUpdate: () => void
  onReplace: () => void
  onUnlink: () => void
  onRemove: () => void
}): JSX.Element {
  const schemaType = useSchema().get(documentType)
  const perspective = usePerspective()
  const {ReferenceChildLink, handleEditReference} = usePaneRouter()
  const menuId = useId()
  const openPreset = useCallback(
    () =>
      handleEditReference({
        parentRefPath: path,
        id: documentId,
        type: documentType,
        template: {id: documentType},
      }),
    [documentId, documentType, handleEditReference, path],
  )

  const preview: ReactNode = schemaType ? (
    <SearchResultItemPreview
      documentId={documentId}
      documentType={documentType}
      layout="compact"
      perspective={perspective.perspectiveStack}
      schemaType={schemaType}
      showBadge={false}
    />
  ) : (
    <Box style={{width: '100%'}}>
      <SanityDefaultPreview isPlaceholder layout="compact" />
    </Box>
  )

  return (
    <Card border radius={2} overflow="hidden">
      <Flex align="center" style={{height: 33}}>
        <Box flex={1} style={{minWidth: 0}}>
          {deleted ? (
            <StoredPreview css={storedCss ?? null} />
          ) : (
            <ReferenceChildLink
              documentId={documentId}
              documentType={documentType}
              parentRefPath={path}
            >
              <Button as="span" mode="bleed" padding={0} width="fill" style={insetClip}>
                {preview}
              </Button>
            </ReferenceChildLink>
          )}
        </Box>
        {deleted && (
          <Flex align="center" gap={1} paddingLeft={2} style={{flex: 'none'}}>
            <Tooltip
              animate
              portal
              placement="top"
              content={
                <Box style={{maxWidth: 260}}>
                  <Text size={1}>
                    {storedCss
                      ? `This preset was deleted. Frontends still get the stored color, ${storedCss}.`
                      : 'This preset was deleted, and this field stores no color.'}
                  </Text>
                </Box>
              }
            >
              {/* Focusable, so keyboard users can read the tooltip too. */}
              <Badge tone="caution" tabIndex={0}>
                Preset deleted
              </Badge>
            </Tooltip>
            <Button
              mode="bleed"
              tone="primary"
              fontSize={1}
              padding={2}
              text="Unlink"
              disabled={readOnly}
              style={insetClip}
              onClick={onUnlink}
            />
          </Flex>
        )}
        {outdated && !deleted && (
          <Flex align="center" gap={1} paddingLeft={2} style={{flex: 'none'}}>
            <Tooltip
              animate
              portal
              placement="top"
              content={
                <Text size={1}>
                  {outdated.stored
                    ? `The preset is now ${outdated.current}; this field still stores ${outdated.stored}.`
                    : `The preset is now ${outdated.current}; this field stores no color yet.`}
                </Text>
              }
            >
              <Text size={1} muted>
                Preset changed
              </Text>
            </Tooltip>
            {!readOnly && (
              <Button
                mode="bleed"
                tone="primary"
                fontSize={1}
                padding={2}
                text="Update"
                style={insetClip}
                onClick={onUpdate}
              />
            )}
          </Flex>
        )}
        <MenuButton
          id={menuId}
          button={
            <Button
              aria-label="Preset actions"
              data-preset-menu=""
              icon={EllipsisHorizontalIcon}
              mode="bleed"
              style={insetClip}
            />
          }
          menu={
            <Menu>
              <MenuItem icon={EditIcon} text="Replace" disabled={readOnly} onClick={onReplace} />
              <MenuItem
                icon={UnlinkIcon}
                text="Unlink from preset"
                disabled={readOnly}
                onClick={onUnlink}
              />
              {!deleted && <MenuItem icon={LaunchIcon} text="Open preset" onClick={openPreset} />}
              <MenuDivider />
              <MenuItem
                icon={TrashIcon}
                text="Remove"
                tone="critical"
                disabled={readOnly}
                onClick={onRemove}
              />
            </Menu>
          }
          popover={{portal: true, placement: 'bottom-end', fallbackPlacements: ['top-end']}}
        />
      </Flex>
    </Card>
  )
}
