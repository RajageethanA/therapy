import { Home, ClipboardList, Users, Calendar, Brain, Clock, FileText, User, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

const patientNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'PHQ-9 Assessment', url: '/phq9', icon: ClipboardList },
  { title: 'Find Therapists', url: '/therapists', icon: Users },
  { title: 'My Sessions', url: '/sessions', icon: Calendar },
  { title: 'AI Self-Care Plan', url: '/ai-plan', icon: Brain },
];

const therapistNavItems = [
  { title: 'Dashboard', url: '/therapist', icon: Home },
  { title: 'Manage Slots', url: '/therapist/slots', icon: Clock },
  { title: 'Sessions', url: '/therapist/sessions', icon: Calendar },
  { title: 'Notes', url: '/therapist/notes', icon: FileText },
  { title: 'Profile', url: '/therapist/profile', icon: User },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  const navItems = user.role === 'patient' ? patientNavItems : therapistNavItems;

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarContent className="mt-4">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            {open && (
              <div>
                <h2 className="font-bold text-lg">Camino</h2>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{open ? 'Navigation' : ''}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/dashboard' || item.url === '/therapist'}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-sm"
                    >
                      <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <Button
          variant="ghost"
          size={open ? "default" : "icon"}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full justify-start gap-3"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {open && <span>Toggle Theme</span>}
        </Button>
        
        {open && (
          <>
            <Button variant="ghost" size="default" className="w-full justify-start gap-3">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Button>
            <Button variant="ghost" size="default" className="w-full justify-start gap-3 text-destructive hover:text-destructive" onClick={async () => { await logout(); navigate('/login'); }}>
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </Button>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
