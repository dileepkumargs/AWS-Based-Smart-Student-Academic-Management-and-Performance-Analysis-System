import { createContext, useContext } from "react";
import type { AuthUser } from "@/lib/auth";

export interface AuthContextValue {
    user: AuthUser | null;
    refresh: () => Promise<AuthUser | null>;
}

export const AuthContext = createContext<AuthContextValue>({
    user: null,
    refresh: async () => null
});

export function useAuth() {
    return useContext(AuthContext);
}
