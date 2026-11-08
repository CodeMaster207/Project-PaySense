import path from 'path'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
import { fileURLToPath } from 'url'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { Goals } from './collections/Goals'
import { Entries } from './collections/Entries'
import { Subscriptions } from './collections/Subscriptions'
import { Jobs } from './collections/Jobs'
import { PaymentRequests } from './collections/PaymentRequests'
import { Tasks } from './collections/Tasks'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// A postgres:// URL (Render) uses Postgres. Anything else keeps the zero-setup local SQLite file.
const databaseUri = process.env.DATABASE_URI ?? 'file:./payload.db'
const usePostgres = /^postgres(ql)?:\/\//.test(databaseUri)

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET ?? 'dev-secret-change-me-in-production',
  db: usePostgres
    ? postgresAdapter({
        pool: { connectionString: databaseUri },
        // In production Payload does not create tables itself; it applies these migrations on startup.
        prodMigrations: migrations,
      })
    : sqliteAdapter({ client: { url: databaseUri } }),
  editor: lexicalEditor({}),
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: 'activity', width: 'full' },
        { widgetSlug: 'collections', width: 'full' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { 'en': adminLanguage },
  },
  collections: [Admins, Media, Folders, Tags, Users, Goals, Entries, Subscriptions, Jobs, PaymentRequests, Tasks],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },
  plugins: [],
})
