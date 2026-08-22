import { createContext, useContext, useEffect, useState } from 'react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ds_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('ds_sidebar_collapsed', String(sidebarCollapsed))
    } catch {
      // ignore
    }
  }, [sidebarCollapsed])

  function toggleSidebar() {
    setSidebarCollapsed((v) => !v)
  }

  return (
    <UIContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar,
        mobileSidebarOpen,
        openMobileSidebar: () => setMobileSidebarOpen(true),
        closeMobileSidebar: () => setMobileSidebarOpen(false),
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
