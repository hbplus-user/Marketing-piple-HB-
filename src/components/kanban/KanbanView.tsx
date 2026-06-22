import { useApp } from '../../context/AppContext';
import KanbanColumn from './KanbanColumn';
import type { Status } from '../../types';

const COLUMNS: Status[] = ['Brief Approval', 'Design Progress', 'Design Review', 'Approved', 'Done', 'Posted'];

export default function KanbanView() {
  const { filteredRequests } = useApp();

  return (
    <div
      className="flex gap-5 overflow-x-auto pb-8 pt-4 px-6 min-h-full"
      style={{
        background: 'linear-gradient(160deg, #f5f2e9 0%, #ede0d0 100%)',
      }}
    >
      {COLUMNS.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          requests={filteredRequests.filter(r => r.status === status)}
        />
      ))}
    </div>
  );
}
