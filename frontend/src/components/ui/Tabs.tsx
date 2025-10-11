import React from 'react'

interface TabsProps {
  children: React.ReactNode
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

interface TabsTriggerProps {
  children: React.ReactNode
  value: string
  className?: string
}

interface TabsContentProps {
  children: React.ReactNode
  value: string
  className?: string
}

const TabsContext = React.createContext<{
  activeTab: string
  setActiveTab: (value: string) => void
}>({
  activeTab: '',
  setActiveTab: () => {}
})

export const Tabs: React.FC<TabsProps> = ({ children, defaultValue = '', value, onValueChange, className = '' }) => {
  const [internalActiveTab, setInternalActiveTab] = React.useState(defaultValue)
  const activeTab = value !== undefined ? value : internalActiveTab
  
  const setActiveTab = (newValue: string) => {
    if (value === undefined) {
      setInternalActiveTab(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex space-x-1 ${className}`}>
      {children}
    </div>
  )
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ children, value, className = '' }) => {
  const { activeTab, setActiveTab } = React.useContext(TabsContext)
  const isActive = activeTab === value

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-blue-500 text-white'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export const TabsContent: React.FC<TabsContentProps> = ({ children, value, className = '' }) => {
  const { activeTab } = React.useContext(TabsContext)

  if (activeTab !== value) return null

  return (
    <div className={className}>
      {children}
    </div>
  )
}