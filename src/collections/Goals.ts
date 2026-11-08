import type { CollectionConfig } from 'payload'
import { dayValidate, ownerAccess, ownerField, signedInAppUser, stampOwner } from './access'

export const Goals: CollectionConfig = {
  slug: 'goals',
  admin: { useAsTitle: 'title', group: 'App data' },
  access: { create: signedInAppUser, read: ownerAccess, update: ownerAccess, delete: ownerAccess },
  hooks: { beforeValidate: [stampOwner] },
  fields: [
    ownerField,
    { name: 'title', type: 'text', required: true },
    { name: 'targetDate', type: 'text', required: true, validate: dayValidate },
    { name: 'startDate', type: 'text', required: true, validate: dayValidate },
    { name: 'targetAmount', type: 'number', min: 0 },
    { name: 'dailyAmount', type: 'number', min: 0, required: true },
    { name: 'tag', type: 'text', maxLength: 40, index: true },
    { name: 'tagColor', type: 'select', defaultValue: 'banana', options: ['banana', 'honey', 'leaf', 'berry', 'peel'] },
    { name: 'description', type: 'textarea' },
    { name: 'summary', type: 'array', fields: [{ name: 'text', type: 'text', required: true }] },
    {
      name: 'items',
      type: 'array',
      admin: { description: 'Extra checkpoints on specific days (daily funding is implied).' },
      fields: [
        { name: 'date', type: 'text', required: true, validate: dayValidate },
        { name: 'label', type: 'text', required: true },
        { name: 'amount', type: 'number', min: 0 },
      ],
    },
    {
      name: 'skipWeekdays',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Sunday', value: '0' },
        { label: 'Monday', value: '1' },
        { label: 'Tuesday', value: '2' },
        { label: 'Wednesday', value: '3' },
        { label: 'Thursday', value: '4' },
        { label: 'Friday', value: '5' },
        { label: 'Saturday', value: '6' },
      ],
      admin: { description: 'Weekdays with no funding.' },
    },
    {
      name: 'excludedDays',
      type: 'array',
      admin: { description: 'Individual days with no funding (holidays, breaks).' },
      fields: [{ name: 'date', type: 'text', required: true, validate: dayValidate }],
    },
    {
      name: 'restoredDays',
      type: 'array',
      admin: { description: 'Days funded even though their weekday is skipped.' },
      fields: [{ name: 'date', type: 'text', required: true, validate: dayValidate }],
    },
    { name: 'status', type: 'select', defaultValue: 'active', options: ['active', 'archived'] },
  ],
}
