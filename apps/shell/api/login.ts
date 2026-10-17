import { proxyAccountPage } from '../src/accountProxy'

export const config = { runtime: 'edge' }
export default function handler(request: Request): Promise<Response> {
  return proxyAccountPage(request, 'login')
}
