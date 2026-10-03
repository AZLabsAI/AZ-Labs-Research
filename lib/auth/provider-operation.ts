import type { ResearchAccess } from './platform-access'

export async function approvedResearchOperation<T>(
  authorize: () => Promise<ResearchAccess>,
  providerOperation: () => Promise<T>,
): Promise<T> {
  await authorize()
  return providerOperation()
}
