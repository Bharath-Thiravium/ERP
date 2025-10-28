import React from 'react'

interface Column {
  key: string
  header: string
  render?: (item: any) => React.ReactNode
}

interface DataTableProps {
  data: any[]
  columns: Column[]
  emptyMessage?: string
  selectable?: boolean
  selectedRows?: string[]
  onSelectionChange?: (selected: string[]) => void
  rowSelectable?: (item: any) => boolean
  loading?: boolean
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  emptyMessage = 'No data available',
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  rowSelectable,
  loading = false
}) => {
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      const selectableIds = data
        .filter(item => !rowSelectable || rowSelectable(item))
        .map(item => item.id)
      onSelectionChange(selectableIds)
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      onSelectionChange([...selectedRows, id])
    } else {
      onSelectionChange(selectedRows.filter(rowId => rowId !== id))
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {selectable && (
              <th className="text-left p-3">
                <input
                  type="checkbox"
                  checked={selectedRows.length === data.filter(item => !rowSelectable || rowSelectable(item)).length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded"
                />
              </th>
            )}
            {columns.map((column) => (
              <th key={column.key} className="text-left p-3 font-semibold text-gray-900 dark:text-white">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.id || index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
              {selectable && (
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(item.id)}
                    onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                    disabled={rowSelectable && !rowSelectable(item)}
                    className="rounded"
                  />
                </td>
              )}
              {columns.map((column) => (
                <td key={column.key} className="p-3">
                  {column.render ? column.render(item) : item[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}