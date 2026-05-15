import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import RequestHandler from "../utilities/request_handler";

export type AuthUser =
    | { type: "npm"; username: string; profileUrl: string | null }
    | { type: "anonymous"; username: string };

export type AuthStatus = "idle" | "checking" | "authenticated" | "unauthenticated";

interface AuthContextValue {
    user: AuthUser | null;
    status: AuthStatus;
    loginWithNpm: () => Promise<void>;
    loginAnonymous: (username?: string) => void;
    logout: () => void;
    error: string | null;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "jdm_auth_user";
function persistUser(u: AuthUser | null) {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
}

function loadUser(): AuthUser | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AuthUser;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [status, setStatus] = useState<AuthStatus>("idle");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const saved = loadUser();
        if (saved) {
            setUser(saved);
            setStatus("authenticated");
        } else {
            setStatus("unauthenticated");
        }
    }, []);

    const loginWithNpm = useCallback(async () => {
        setStatus("checking");
        setError(null);
        const res = await RequestHandler.fetchData("GET", "auth/npm-whoami");
        if (res?.success) {
            const data = res.data; 
            const u: AuthUser = {
                type: "npm",
                username: data.username,
                profileUrl: data.profileUrl ?? null,
            };
            setUser(u);
            persistUser(u);
            setStatus("authenticated");
        } else {
            setStatus("unauthenticated");
            setError(
                res?.message ?? "npm not authenticated. Run `npm login` in your terminal first."
            );
        }
    }, []);

    const loginAnonymous = useCallback((username = "anonymous") => {
        const u: AuthUser = {
            type: "anonymous",
            username: username.trim() || "anonymous",
        };
        setUser(u);
        persistUser(u);
        setStatus("authenticated");
        setError(null);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        persistUser(null);
        setStatus("unauthenticated");
        setError(null);
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return (
        <AuthContext.Provider
            value={{ user, status, loginWithNpm, loginAnonymous, logout, error, clearError }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}