import type { AppShellRootProps } from '../types'
import { Breadcrumbs } from './Breadcrumbs'
import { Content } from './Content'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { SidebarInset, SidebarProvider } from './ui/sidebar'

function Root({ children }: AppShellRootProps) {
  return <SidebarProvider className="h-dvh min-h-0 overflow-hidden">{children}</SidebarProvider>
}

function Main({ children }: AppShellRootProps) {
  return <SidebarInset className="min-h-0 overflow-hidden">{children}</SidebarInset>
}

export const AppShell = { Root, Sidebar, Header, Breadcrumbs, Content, Main }
