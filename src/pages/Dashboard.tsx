import { useApp } from '../context/AppContext';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';
import ViewTabs from '../components/layout/ViewTabs';
import KanbanView from '../components/kanban/KanbanView';
import CalendarView from '../components/calendar/CalendarView';
import GanttView from '../components/gantt/GanttView';
import RedAlertView from '../components/redalert/RedAlertView';
import MyTasksView from '../components/mytasks/MyTasksView';
import NewRequestModal from '../components/modals/NewRequestModal';
import ApprovalQueueModal from '../components/modals/ApprovalQueueModal';
import DesignerTaskModal from '../components/modals/DesignerTaskModal';
import ReviewFeedbackModal from '../components/modals/ReviewFeedbackModal';
import FinalApprovalModal from '../components/modals/FinalApprovalModal';
import EditPostDateModal from '../components/modals/EditPostDateModal';
import BackupRestoreModal from '../components/modals/BackupRestoreModal';
import EditTaskModal from '../components/modals/EditTaskModal';
import ManageTeamModal from '../components/modals/ManageTeamModal';

export default function Dashboard() {
  const { activeView, activeModal } = useApp();

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        {['kanban', 'calendar', 'gantt'].includes(activeView) && <ViewTabs />}
        <main className="flex-1 overflow-auto">
          {activeView === 'kanban'    && <KanbanView />}
          {activeView === 'calendar' && <CalendarView />}
          {activeView === 'gantt'    && <GanttView />}
          {activeView === 'redalert' && <RedAlertView />}
          {activeView === 'mytasks'  && <MyTasksView />}
        </main>
      </div>

      {/* Modals */}
      <NewRequestModal
        open={activeModal?.type === 'new-request'}
      />
      <ApprovalQueueModal
        open={activeModal?.type === 'approval-queue'}
      />
      <DesignerTaskModal
        open={activeModal?.type === 'designer-task'}
        requestId={activeModal?.requestId}
      />
      <ReviewFeedbackModal
        open={activeModal?.type === 'review-feedback'}
        requestId={activeModal?.requestId}
      />
      <FinalApprovalModal
        open={activeModal?.type === 'final-approval'}
        requestId={activeModal?.requestId}
      />
      <EditPostDateModal
        open={activeModal?.type === 'edit-post-date'}
        requestId={activeModal?.requestId}
      />
      <BackupRestoreModal
        open={activeModal?.type === 'backup-restore'}
      />
      <EditTaskModal
        open={activeModal?.type === 'edit-task'}
        requestId={activeModal?.requestId}
      />
      <ManageTeamModal
        open={activeModal?.type === 'manage-team'}
      />

    </div>
  );
}
