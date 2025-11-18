import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface ComplianceTemplate {
  id: string;
  code: string;
  name: string;
  authority: string;
  description: string | null;
  default_frequency: string;
  default_days_before_due_reminder: number;
  is_active: boolean;
}

interface AddStandardTasksDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTasksAdded: () => void;
}

export const AddStandardTasksDrawer = ({
  open,
  onOpenChange,
  onTasksAdded,
}: AddStandardTasksDrawerProps) => {
  const { user } = useAppContext();
  const [templates, setTemplates] = useState<ComplianceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTaskId, setAddingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('compliance_templates')
        .select('*')
        .eq('is_active', true)
        .order('authority', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load compliance templates');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultDueDate = (frequency: string): string => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    switch (frequency) {
      case 'MONTHLY':
        // Default to last day of current month
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        return lastDayOfMonth.toISOString().split('T')[0];

      case 'ANNUAL':
        // Default to March 31st of next year
        const nextYear = currentYear + 1;
        return `${nextYear}-03-31`;

      case 'QUARTERLY':
        // Default to end of next quarter
        const nextQuarter = Math.floor(currentMonth / 3) + 1;
        const quarterEndMonth = (nextQuarter * 3) % 12;
        const quarterYear = nextQuarter >= 4 ? currentYear + 1 : currentYear;
        const lastDayOfQuarter = new Date(quarterYear, quarterEndMonth, 0);
        return lastDayOfQuarter.toISOString().split('T')[0];

      default:
        // Default to 30 days from today
        const defaultDate = new Date(today);
        defaultDate.setDate(defaultDate.getDate() + 30);
        return defaultDate.toISOString().split('T')[0];
    }
  };

  const getTaskTitle = (template: ComplianceTemplate): string => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.toLocaleDateString('en-US', { month: 'long' });

    switch (template.default_frequency) {
      case 'MONTHLY':
        return `${template.name} – ${currentMonth}`;
      case 'ANNUAL':
        return `${template.name} – ${currentYear}`;
      default:
        return template.name;
    }
  };

  const addTaskFromTemplate = async (template: ComplianceTemplate) => {
    try {
      setAddingTaskId(template.id);

      const dueDate = getDefaultDueDate(template.default_frequency);
      const title = getTaskTitle(template);

      const { error } = await supabase
        .from('compliance_tasks')
        .insert({
          user_id: user?.id,
          template_id: template.id,
          title,
          authority: template.authority,
          description: template.description,
          due_date: dueDate,
          frequency: template.default_frequency,
          status: 'PENDING',
          remind_via_email: true,
          remind_via_sms: false,
          remind_via_whatsapp: false,
        });

      if (error) throw error;

      toast.success(`Added ${template.name}`);
      onTasksAdded();
    } catch (error) {
      console.error('Error adding task from template:', error);
      toast.error('Failed to add task');
    } finally {
      setAddingTaskId(null);
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.authority]) {
      acc[template.authority] = [];
    }
    acc[template.authority].push(template);
    return acc;
  }, {} as Record<string, ComplianceTemplate[]>);

  const getFrequencyBadge = (frequency: string) => {
    const colorMap: Record<string, string> = {
      MONTHLY: 'bg-blue-100 text-blue-800',
      ANNUAL: 'bg-purple-100 text-purple-800',
      QUARTERLY: 'bg-green-100 text-green-800',
      ONE_OFF: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={colorMap[frequency] || 'bg-gray-100 text-gray-800'}>
        {frequency.toLowerCase()}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Standard Compliance Tasks</SheetTitle>
          <SheetDescription>
            Quickly add common compliance tasks from standard templates.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-gray-600">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No templates available.
            </div>
          ) : (
            Object.entries(groupedTemplates).map(([authority, authorityTemplates]) => (
              <div key={authority}>
                <h3 className="text-lg font-semibold mb-3 text-gray-900">{authority}</h3>
                <div className="space-y-3">
                  {authorityTemplates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            {template.description && (
                              <CardDescription className="mt-1">
                                {template.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getFrequencyBadge(template.default_frequency)}
                            <span className="text-xs text-gray-500">
                              {template.default_days_before_due_reminder} day reminder
                            </span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addTaskFromTemplate(template)}
                            disabled={addingTaskId === template.id}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            {addingTaskId === template.id ? (
                              'Adding...'
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
