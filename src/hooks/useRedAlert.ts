import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { isRedAlert, getUrgency } from '../utils/deadlineUtils';

export function useRedAlert() {
  const { requests } = useApp();
  return useMemo(() => ({
    redAlertCount: requests.filter(r => isRedAlert(r)).length,
    overdueCount: requests.filter(r => getUrgency(r) === 'overdue').length,
    urgentCount: requests.filter(r => getUrgency(r) === 'urgent').length,
    redAlertRequests: requests.filter(r => isRedAlert(r)),
  }), [requests]);
}
