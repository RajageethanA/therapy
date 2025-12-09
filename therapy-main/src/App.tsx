import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { UserProvider } from "@/contexts/UserContext";
import { Layout } from "@/components/Layout";
import RoleGuard from '@/components/RoleGuard';

// Patient Pages
import PatientDashboard from "./pages/patient/Dashboard";
import PHQ9 from "./pages/patient/PHQ9";
import Therapists from "./pages/patient/Therapists";
import Sessions from "./pages/patient/Sessions";
import AIPlan from "./pages/patient/AIPlan";

// Therapist Pages
import TherapistDashboard from "./pages/therapist/Dashboard";
import Slots from "./pages/therapist/Slots";
import TherapistSessions from "./pages/therapist/Sessions";
import Profile from "./pages/therapist/Profile";
import TherapistNotes from "./pages/therapist/Notes";

import NotFound from "./pages/NotFound";
import RoleBasedRedirect from "./components/RoleBasedRedirect";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

const queryClient = new QueryClient();

const LayoutWrapper = ({ children }: { children: React.ReactNode }) => (
  <Layout>{children}</Layout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <UserProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Auth Routes (without Layout) */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Root route - redirect based on role */}
              <Route path="/" element={<RoleBasedRedirect />} />

              {/* Patient Routes */}
              <Route path="/dashboard" element={
                <RoleGuard allowedRoles={["patient"]}>
                  <LayoutWrapper><PatientDashboard /></LayoutWrapper>
                </RoleGuard>
              } />
              <Route path="/phq9" element={<RoleGuard allowedRoles={["patient"]}><LayoutWrapper><PHQ9 /></LayoutWrapper></RoleGuard>} />
              <Route path="/therapists" element={<RoleGuard allowedRoles={["patient"]}><LayoutWrapper><Therapists /></LayoutWrapper></RoleGuard>} />
              <Route path="/sessions" element={<RoleGuard allowedRoles={["patient"]}><LayoutWrapper><Sessions /></LayoutWrapper></RoleGuard>} />
              <Route path="/ai-plan" element={<RoleGuard allowedRoles={["patient"]}><LayoutWrapper><AIPlan /></LayoutWrapper></RoleGuard>} />

              {/* Therapist Routes - therapist-only */}
              <Route path="/therapist" element={<RoleGuard allowedRoles={["therapist"]}><LayoutWrapper><TherapistDashboard /></LayoutWrapper></RoleGuard>} />
              <Route path="/therapist/slots" element={<RoleGuard allowedRoles={["therapist"]}><LayoutWrapper><Slots /></LayoutWrapper></RoleGuard>} />
              <Route path="/therapist/sessions" element={<RoleGuard allowedRoles={["therapist"]}><LayoutWrapper><TherapistSessions /></LayoutWrapper></RoleGuard>} />
              <Route path="/therapist/profile" element={<RoleGuard allowedRoles={["therapist"]}><LayoutWrapper><Profile /></LayoutWrapper></RoleGuard>} />
              <Route path="/therapist/notes" element={<RoleGuard allowedRoles={["therapist"]}><LayoutWrapper><TherapistNotes /></LayoutWrapper></RoleGuard>} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UserProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
