import type { Access, CollectionBeforeValidateHook } from 'payload'

/** App users see only their own rows; CMS admins can manage everything. */
export const ownerAccess: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.collection === 'admins') return true
  if (user.collection === 'users') return { owner: { equals: user.id } }
  return false
}

export const signedInAppUser: Access = ({ req: { user } }) =>
  user?.collection === 'users' || user?.collection === 'admins'

/** Server-owned: an app user can only ever create rows they own. */
export const stampOwner: CollectionBeforeValidateHook = ({ data, req, operation, originalDoc }) => {
  if (req.user?.collection !== 'users') return data
  if (operation === 'create') return { ...data, owner: req.user.id }
  // Updates can never reassign ownership: pin it to the stored owner.
  const current = originalDoc?.owner
  const ownerId = typeof current === 'object' && current ? current.id : current
  return { ...data, owner: ownerId ?? req.user.id }
}

export const ownerField = {
  name: 'owner',
  type: 'relationship' as const,
  relationTo: 'users' as const,
  required: true,
  index: true,
  admin: { position: 'sidebar' as const },
}

const isoDay = (v: unknown) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? true : 'Use YYYY-MM-DD'
export const dayValidate = isoDay
