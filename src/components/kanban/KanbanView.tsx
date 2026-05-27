import { useApp } from '../../context/AppContext';
import KanbanColumn from './KanbanColumn';
import type { Status } from '../../types';

const COLUMNS: Status[] = ['To Do', 'In Progress', 'In Review', 'Partially Approved', 'Done'];

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
