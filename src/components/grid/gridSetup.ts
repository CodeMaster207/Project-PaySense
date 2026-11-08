import {
  CellStyleModule,
  ClientSideRowModelModule,
  CsvExportModule,
  DateFilterModule,
  ModuleRegistry,
  NumberFilterModule,
  PaginationModule,
  QuickFilterModule,
  RowStyleModule,
  TextFilterModule,
  themeQuartz,
} from 'ag-grid-community'

// Only the community features the app uses, to keep the bundle small.
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  PaginationModule,
  CsvExportModule,
  QuickFilterModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  CellStyleModule,
  RowStyleModule,
])

export const paysenseTheme = themeQuartz.withParams({
  accentColor: '#d9a900',
  backgroundColor: '#ffffff',
  foregroundColor: '#33270a',
  headerBackgroundColor: '#fff5bf',
  headerTextColor: '#33270a',
  headerFontWeight: 800,
  borderColor: '#ffec8a',
  oddRowBackgroundColor: '#fffbe6',
  rowHoverColor: '#fff5bf',
  fontFamily: 'var(--font-nunito), ui-sans-serif, system-ui, sans-serif',
  wrapperBorderRadius: 16,
})
