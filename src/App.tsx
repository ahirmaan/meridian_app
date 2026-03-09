import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ChatPage from "./pages/ChatPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { supabase, supabaseEnabled } from "./lib/supabase";

/* ===========================
   Auth Listener
   Handles global auth changes
=========================== */
function AuthListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabaseEnabled || !supabase) return;

    const { data } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (_event === "PASSWORD_RECOVERY") {
          navigate("/reset-password", { replace: true });
          return;
        }

        // Don't redirect to /chat if this is a password recovery flow
        // Supabase fires SIGNED_IN before PASSWORD_RECOVERY
        const isRecoveryFlow =
          window.location.hash.includes("type=recovery") ||
          window.location.pathname === "/reset-password";

        if (session && !isRecoveryFlow) {
          if (window.location.pathname !== "/chat") {
            navigate("/chat", { replace: true });
          }
        }
      }
    );

    return () => {
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}

/* ===========================
   Protected Route
   Prevents race condition
=========================== */
type ProtectedRouteProps = {
  children: React.ReactElement;
};

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      if (!supabaseEnabled || !supabase) {
        navigate("/login", { replace: true });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login", { replace: true });
      } else {
        setAuthorized(true);
      }

      setLoading(false);
    };

    checkSession();
  }, [navigate]);

  if (loading) return <div />;

  if (!authorized) return null;

  return children;
}

/* ===========================
   App
=========================== */
export default function App() {
  return (
    <Router>
      <AuthListener />
      <div className="dark">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
      <Analytics />
    </Router>
  );
}