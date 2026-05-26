import { useApp } from '../../context/AppContext';
import KanbanColumn from './KanbanColumn';
import type { Status } from '../../types';

const COLUMNS: Status[] = ['To Do', 'In Progress', 'In Review', 'Partially Approved', 'Done'];

export default function KanbanView() {
  const { filteredRequests } = useApp();

  return (
    <div className="flex gap-5 overflow-x-auto pb-6 pt-2 px-6 min-h-full">
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
