import { Mail, Phone, Linkedin, CheckSquare, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTasks } from '../../hooks/useTasks';
import { useFilters } from '../../context/FilterContext';

const taskIcons = {
  email: Mail,
  call: Phone,
  linkedin: Linkedin,
  todo: CheckSquare
};

export default function TaskTracker() {
  const { owner } = useFilters();
  const { data, isLoading } = useTasks(owner);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const tasks = data?.tasks || [];
  const counts = data?.counts || { overdue: 0, today: 0, upcoming: 0 };

  // Group tasks
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overdueTasks = tasks.filter(t =>
    new Date(t.dueAt) < now && t.status !== 'completed'
  );

  const todayTasks = tasks.filter(t => {
    const d = new Date(t.dueAt);
    return d >= today && d < tomorrow;
  });

  const upcomingTasks = tasks.filter(t => {
    const d = new Date(t.dueAt);
    return d >= tomorrow;
  }).slice(0, 5);

  const TaskItem = ({ task, isOverdue = false }) => {
    const Icon = taskIcons[task.type] || CheckSquare;

    return (
      <div className={`flex items-center gap-3 py-2 px-3 rounded-lg ${isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
        <Icon className={`w-4 h-4 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isOverdue ? 'text-red-900' : 'text-gray-900'}`}>
            {task.subject}
          </p>
          {task.contactName && (
            <p className="text-xs text-gray-500">{task.contactName}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 capitalize">{task.owner}</p>
          <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-gray-400'}`}>
            {task.dueAt ? formatDistanceToNow(new Date(task.dueAt), { addSuffix: true }) : '-'}
          </p>
        </div>
      </div>
    );
  };

  const Section = ({ title, count, tasks, isOverdue = false, color = 'gray' }) => {
    if (count === 0) return null;

    const colorClasses = {
      red: 'text-red-600 bg-red-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      blue: 'text-blue-600 bg-blue-100',
      gray: 'text-gray-600 bg-gray-100'
    };

    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          {isOverdue && <AlertCircle className="w-4 h-4 text-red-500" />}
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClasses[color]}`}>
            {count}
          </span>
        </div>
        <div className="space-y-1">
          {tasks.slice(0, 5).map((task, idx) => (
            <TaskItem key={task.id || idx} task={task} isOverdue={isOverdue} />
          ))}
          {tasks.length > 5 && (
            <p className="text-xs text-gray-400 text-center py-1">
              +{tasks.length - 5} more
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h2>

      <Section
        title="Overdue"
        count={counts.overdue}
        tasks={overdueTasks}
        isOverdue={true}
        color="red"
      />

      <Section
        title="Today"
        count={counts.today}
        tasks={todayTasks}
        color="yellow"
      />

      <Section
        title="Upcoming"
        count={counts.upcoming}
        tasks={upcomingTasks}
        color="blue"
      />

      {tasks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No tasks found. Sync HubSpot data to load tasks.
        </div>
      )}
    </div>
  );
}
