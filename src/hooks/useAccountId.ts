import { useAuth } from "@/contexts/AuthContext";

export function useAccountId() {
  const { profile } = useAuth();
  return profile?.account_id ?? null;
}
