import { downloadAuthenticatedFile } from './api/http'

/**
 * Opens a stored document in a new tab.
 *
 * The tab is opened synchronously inside the click so browsers never treat it
 * as a blocked popup; the session cookie authenticates the request.
 */
export function openDocument(path: string): boolean {
  const url = new URL(path, window.location.origin)
  url.searchParams.set('preview', '1')
  const tab = window.open(url.toString(), '_blank')
  if (tab) tab.opener = null
  return tab !== null
}

export function downloadDocument(path: string, filename: string): Promise<void> {
  return downloadAuthenticatedFile(path, filename)
}
