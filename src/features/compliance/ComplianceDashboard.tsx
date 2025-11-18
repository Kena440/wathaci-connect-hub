import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, AlertCircle, Mail, MessageSquare, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { AddComplianceTaskModal } from './AddComplianceTaskModal';
import { AddStandardTasksDrawer } from './AddStandardTasksDrawer';

interface ComplianceTask {
  id: string;
  user_id: string;
  template_id: string | null;
  title: string;
  authority: string;
  description: string | null;
  due_date: string;
  frequency: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  remind_via_email: boolean;
  remind_via_sms: boolean;
  remind_via_whatsapp: boolean;
  last_reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ComplianceDashboard = () => {
  const { user } = useAppContext();
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddStandardDrawerOpen, setIsAddStandardDrawerOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('compliance_tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Update overdue status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const updatedTasks = data?.map(task => {
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        if (task.status !== 'COMPLETED' && dueDate < today) {
          return { ...task, status: 'OVERDUE' as const };
        }
        return task;
      }) || [];

      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error fetching compliance tasks:', error);
      toast.error('Failed to load compliance tasks');
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('compliance_tasks')
        .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task marked as completed');
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-red-500 hover:bg-red-600">Overdue</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTasksByCategory = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const overdue = tasks.filter(task => {
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return task.status !== 'COMPLETED' && dueDate < today;
    });

    const upcoming = tasks.filter(task => {
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return task.status !== 'COMPLETED' && dueDate >= today && dueDate <= thirtyDaysFromNow;
    });

    const completed = tasks.filter(task => task.status === 'COMPLETED');

    return { overdue, upcoming, completed };
  };

  const { overdue, upcoming, completed } = getTasksByCategory();

  const renderTaskCard = (task: ComplianceTask) => (
    <Card key={task.id} className="mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              <Calendar className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{task.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">{task.authority}</span> • Due: {formatDate(task.due_date)}
                </p>
                {task.description && (
                  <p className="text-sm text-gray-500 mt-2">{task.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3 ml-8">
              {getStatusBadge(task.status)}
              <div className="flex gap-2 text-gray-500">
                {task.remind_via_email && <Mail className="w-4 h-4" title="Email reminders enabled" />}
                {task.remind_via_sms && <Phone className="w-4 h-4" title="SMS reminders enabled" />}
                {task.remind_via_whatsapp && <MessageSquare className="w-4 h-4" title="WhatsApp reminders enabled" />}
              </div>
            </div>
          </div>
          {task.status !== 'COMPLETED' && (
            <Button
              onClick={() => markAsCompleted(task.id)}
              size="sm"
              className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-green-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading compliance tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-green-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Compliance Hub</h1>
          <p className="text-lg text-gray-600">
            Track ZRA, PACRA, NAPSA and other business compliance tasks in one place.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button
            onClick={() => setIsAddTaskModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Add Compliance Task
          </Button>
          <Button
            onClick={() => setIsAddStandardDrawerOpen(true)}
            variant="outline"
            className="border-orange-600 text-orange-600 hover:bg-orange-50"
          >
            Add Standard Tasks (ZRA / PACRA / NAPSA)
          </Button>
        </div>

        {/* Overdue Tasks */}
        {overdue.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Overdue Tasks ({overdue.length})
              </h2>
            </div>
            {overdue.map(renderTaskCard)}
          </div>
        )}

        {/* Upcoming Tasks */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Upcoming Tasks (Next 30 Days) ({upcoming.length})
              </h2>
            </div>
            {upcoming.map(renderTaskCard)}
          </div>
        )}

        {/* Completed Tasks */}
        {completed.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Completed Tasks ({completed.length})
              </h2>
            </div>
            {completed.map(renderTaskCard)}
          </div>
        )}

        {/* Empty State */}
        {tasks.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No Compliance Tasks Yet</CardTitle>
              <CardDescription>
                Get started by adding your first compliance task or importing standard templates.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Modals */}
        <AddComplianceTaskModal
          open={isAddTaskModalOpen}
          onOpenChange={setIsAddTaskModalOpen}
          onTaskAdded={fetchTasks}
        />

        <AddStandardTasksDrawer
          open={isAddStandardDrawerOpen}
          onOpenChange={setIsAddStandardDrawerOpen}
          onTasksAdded={fetchTasks}
        />
      </div>
    </div>
  );
};
