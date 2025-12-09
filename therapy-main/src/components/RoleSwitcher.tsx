import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Users, Stethoscope } from 'lucide-react';

export function RoleSwitcher() {
  const { user, setUserRole } = useUser();
  const navigate = useNavigate();

  const switchRole = () => {
    const newRole = user.role === 'patient' ? 'therapist' : 'patient';
    setUserRole(newRole);
    navigate(newRole === 'patient' ? '/' : '/therapist');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={switchRole}
      className="gap-2"
    >
      {user.role === 'patient' ? (
        <>
          <Stethoscope className="w-4 h-4" />
          <span>Switch to Therapist</span>
        </>
      ) : (
        <>
          <Users className="w-4 h-4" />
          <span>Switch to Patient</span>
        </>
      )}
    </Button>
  );
}
