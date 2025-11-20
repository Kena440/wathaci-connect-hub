import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { withSupportContact } from '@/lib/supportEmail';

interface AddComplianceTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskAdded: () => void;
}

export const AddComplianceTaskModal = ({
  open,
  onOpenChange,
  onTaskAdded,
}: AddComplianceTaskModalProps) => {
  const { user } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    authority: 'ZRA',
    description: '',
    dueDate: '',
    remindViaEmail: true,
    remindViaSms: false,
    remindViaWhatsapp: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error(withSupportContact('Please enter a task title'));
      return;
    }

    if (!formData.dueDate) {
      toast.error(withSupportContact('Please select a due date'));
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('compliance_tasks')
        .insert({
          user_id: user?.id,
          template_id: null,
          title: formData.title.trim(),
          authority: formData.authority,
          description: formData.description.trim() || null,
          due_date: formData.dueDate,
          frequency: 'ONE_OFF',
          status: 'PENDING',
          remind_via_email: formData.remindViaEmail,
          remind_via_sms: formData.remindViaSms,
          remind_via_whatsapp: formData.remindViaWhatsapp,
        });

      if (error) throw error;

      toast.success('Compliance task added successfully');
      
      // Reset form
      setFormData({
        title: '',
        authority: 'ZRA',
        description: '',
        dueDate: '',
        remindViaEmail: true,
        remindViaSms: false,
        remindViaWhatsapp: false,
      });

      onOpenChange(false);
      onTaskAdded();
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error(withSupportContact('Failed to add compliance task'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Compliance Task</DialogTitle>
          <DialogDescription>
            Create a custom compliance task to track important deadlines.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., File Q1 Tax Return"
                required
              />
            </div>

            {/* Authority */}
            <div className="grid gap-2">
              <Label htmlFor="authority">
                Authority <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.authority}
                onValueChange={(value) => setFormData({ ...formData, authority: value })}
              >
                <SelectTrigger id="authority">
                  <SelectValue placeholder="Select authority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZRA">ZRA (Zambia Revenue Authority)</SelectItem>
                  <SelectItem value="PACRA">PACRA (Patents & Companies Registration)</SelectItem>
                  <SelectItem value="NAPSA">NAPSA (National Pension Scheme)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="grid gap-2">
              <Label htmlFor="dueDate">
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add any additional details about this task..."
                rows={3}
              />
            </div>

            {/* Reminder Preferences */}
            <div className="grid gap-3">
              <Label>Reminder Channels</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remindViaEmail"
                  checked={formData.remindViaEmail}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, remindViaEmail: checked as boolean })
                  }
                />
                <label
                  htmlFor="remindViaEmail"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Email reminders
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remindViaSms"
                  checked={formData.remindViaSms}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, remindViaSms: checked as boolean })
                  }
                />
                <label
                  htmlFor="remindViaSms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  SMS reminders
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remindViaWhatsapp"
                  checked={formData.remindViaWhatsapp}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, remindViaWhatsapp: checked as boolean })
                  }
                />
                <label
                  htmlFor="remindViaWhatsapp"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  WhatsApp reminders
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              {loading ? 'Adding...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
