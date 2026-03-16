import { useQuery } from '@tanstack/react-query'
import { athensSustCompanyApi, AthensAccessState } from '../services/athensSustCompanyApi'

export const useAthensAccessState = (enabled = true) => {
  return useQuery<AthensAccessState>({
    queryKey: ['athens-access-state'],
    queryFn: () => athensSustCompanyApi.getAccessState(),
    retry: false,
    enabled
  })
}
