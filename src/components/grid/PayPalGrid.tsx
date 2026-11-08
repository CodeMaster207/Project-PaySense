'use client'

import { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridApi } from 'ag-grid-community'
import { prettyDay, rm } from '@/lib/dates'
import { paysenseTheme } from './gridSetup'

export type GridRow = {
  key: string
  date: string
  business: string
  amount: number
  tag: string
  txnId: string
  original: string
}

const asDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function PayPalGrid({ rows, search, printing, onReady }: { rows: GridRow[]; search: string; printing: boolean; onReady: (api: GridApi) => void }) {
  const columns = useMemo<ColDef<GridRow>[]>(
    () => [
      {
        field: 'date',
        headerName: 'Date',
        width: 150,
        sort: 'desc',
        valueFormatter: (p) => (p.value ? prettyDay(p.value) : '-'),
        filter: 'agDateColumnFilter',
        filterParams: {
          comparator: (filterDate: Date, cell: string) => {
            if (!cell) return -1
            const c = asDate(cell).getTime()
            const f = filterDate.getTime()
            return c === f ? 0 : c < f ? -1 : 1
          },
        },
      },
      {
        field: 'business',
        headerName: 'Business',
        flex: 2,
        minWidth: 200,
        filter: 'agTextColumnFilter',
        cellRenderer: (p: { data?: GridRow }) =>
          p.data ? (
            <span className="font-semibold">
              {p.data.business}
              <span className="ml-2 rounded-full bg-banana-100 px-2 text-xs font-normal">{p.data.tag}</span>
            </span>
          ) : null,
      },
      {
        field: 'txnId',
        headerName: 'Transaction ID',
        flex: 1,
        minWidth: 170,
        filter: 'agTextColumnFilter',
        valueFormatter: (p) => p.value || '-',
        cellClass: 'font-mono text-xs text-peel-700',
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 170,
        type: 'rightAligned',
        filter: 'agNumberColumnFilter',
        cellRenderer: (p: { data?: GridRow }) =>
          p.data ? (
            <span className={`block text-right font-bold leading-tight ${p.data.amount < 0 ? 'text-berry-500' : 'text-leaf-700'}`}>
              {p.data.amount < 0 ? '-' : '+'}
              {rm(Math.abs(p.data.amount))}
              {p.data.original && <span className="block text-xs font-semibold text-peel-500">{p.data.original}</span>}
            </span>
          ) : null,
        valueFormatter: (p) => `${p.value < 0 ? '-' : '+'}${rm(Math.abs(p.value))}`,
      },
    ],
    [],
  )

  return (
    <AgGridReact<GridRow>
      theme={paysenseTheme}
      rowData={rows}
      columnDefs={columns}
      defaultColDef={{ sortable: true, resizable: true }}
      getRowId={(p) => p.data.key}
      quickFilterText={search}
      pagination={!printing}
      paginationPageSize={10}
      paginationPageSizeSelector={[10, 25, 50]}
      rowHeight={52}
      domLayout={printing ? 'print' : 'autoHeight'}
      onGridReady={(e) => onReady(e.api)}
      overlayNoRowsTemplate="No PayPal records yet. Press Resync to import."
    />
  )
}
