import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Header from "@/components/layout/Header";
import { Toaster } from "react-hot-toast";
import { AuthContext } from "@/lib/auth-context";
import type { AuthUser } from "@/lib/auth";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [validatedPath, setValidatedPath] = useState("");
  const isPublicRoute = router.pathname === "/login" || router.pathname === "/login/[role]";

  const refresh = useCallback(async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) {
      setUser(null);
      return null;
    }
    const data = await response.json() as { user: AuthUser };
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    if (!router.isReady || isPublicRoute) {
      return;
    }

    let active = true;
    async function validateRoute() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (active) {
            setUser(null);
            void router.replace("/login");
          }
          return;
        }
        const data = await response.json() as { user: AuthUser };
        const authenticatedUser = data.user;
        if (!active) return;
        setUser(authenticatedUser);
        if (authenticatedUser.mustChangePassword && router.pathname !== "/change-password") {
          void router.replace("/change-password");
          return;
        }
        if (authenticatedUser.role === "STUDENT" &&
            !["/student/dashboard", "/change-password"].includes(router.pathname)) {
          void router.replace("/student/dashboard");
          return;
        }
        if (authenticatedUser.role === "FACULTY" &&
            !["/", "/faculty", "/faculty/[id]", "/faculty/dashboard", "/faculty/enrollments", "/students", "/students/[id]", "/courses", "/courses/[id]", "/enrollments", "/change-password"].includes(router.pathname)) {
          void router.replace("/faculty/dashboard");
          return;
        }
        setValidatedPath(router.pathname);
      } catch (error) {
        console.error("Unable to validate the current session:", error);
        if (active) void router.replace("/login");
      }
    }
    void validateRoute();

    return () => {
      active = false;
    };
  }, [isPublicRoute, refresh, router, router.isReady, router.pathname]);

  const authValue = useMemo(() => ({ user, refresh }), [refresh, user]);
  const canRender = isPublicRoute || (user !== null && validatedPath === router.pathname);

  return (
    <AuthContext.Provider value={authValue}>
      <div className="flex min-h-screen bg-white">
        <div className="flex-1 bg-gray-50">
          {!isPublicRoute && canRender && <Header />}
          {canRender ? (
            <Component {...pageProps} />
          ) : (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center" role="status" aria-label="Checking your session">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            </div>
          )}
          <Toaster position="bottom-right" toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: 'white',
              },
            },
          }} />
        </div>
      </div>
    </AuthContext.Provider>
  );
}
