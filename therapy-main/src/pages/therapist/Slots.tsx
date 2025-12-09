import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { Plus, Clock, Trash2, AlertCircle } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useTherapistSlots } from '@/hooks/useTherapistSlots';
import { format } from 'date-fns';

export default function Slots() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const { user } = useUser();
  const { slots, addSlot, removeSlot, loading } = useTherapistSlots(user?.id, date);

  // Debug user data
  useEffect(() => {
    console.log('User data:', user);
    console.log('Date:', date);
    console.log('Current slots:', slots);
  }, [user, date, slots]);

  const timeOptions = [
    '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  const handleAddSlot = async () => {
    if (!startTime || !endTime) {
      alert('Please select both start and end times.');
      return;
    }

    if (!user?.id) {
      alert('User not authenticated. Please log in again.');
      return;
    }

    if (!date) {
      alert('Please select a date first.');
      return;
    }
    
    console.log('Adding slot with:', { startTime, endTime, date, userId: user?.id });
    
    setAdding(true);
    try {
      const timeRange = `${startTime} - ${endTime}`;
      console.log('Calling addSlot with timeRange:', timeRange);
      await addSlot(timeRange);
      console.log('Slot added successfully');
      setIsAddDialogOpen(false);
      setStartTime('');
      setEndTime('');
      alert('Time slot added successfully!');
    } catch (e: any) {
      console.error('Error adding slot:', e);
      const errorMessage = e?.message || 'Failed to add slot. Please try again.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveSlot = async (slotId: string) => {
    if (confirm('Are you sure you want to remove this time slot?')) {
      try {
        await removeSlot(slotId);
      } catch (e) {
        console.error('Error removing slot:', e);
        alert('Failed to remove slot. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Manage Availability</h1>
        <p className="text-muted-foreground text-lg">Set your available time slots</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Select a date to manage slots</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border pointer-events-auto"
              disabled={(date) => date < new Date()}
            />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Available Slots</CardTitle>
                <CardDescription>
                  {date ? format(date, 'PPP') : 'Select a date'} ({slots.length} slots)
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                className="gap-2" 
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add Slot
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Clock className="w-4 h-4 animate-spin mr-2" />
                Loading slots...
              </div>
            ) : (
              <div className="space-y-2">
                {slots.map(slot => (
                  <div 
                    key={slot.id} 
                    className="p-3 rounded-lg border border-border/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{slot.timeRange}</span>
                      {slot.isBooked ? (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Booked
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Available
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive" 
                      onClick={() => handleRemoveSlot(slot.id)}
                      disabled={slot.isBooked}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {slots.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <p className="text-sm">No slots available for this date</p>
                    <p className="text-xs">Click "Add Slot" to create availability</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Slot Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Time Slot</DialogTitle>
            <DialogDescription>
              Create a new available time slot for {date ? format(date, 'PPP') : 'the selected date'}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Time</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">End Time</label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem 
                      key={time} 
                      value={time}
                      disabled={startTime && time <= startTime}
                    >
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setStartTime('');
                setEndTime('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSlot}
              disabled={!startTime || !endTime || adding}
            >
              {adding ? 'Adding...' : 'Add Slot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
