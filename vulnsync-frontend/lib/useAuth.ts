export function useAuth() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const username =
    typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const displayName =
    typeof window !== "undefined" ? localStorage.getItem("displayName") : null;

  const isAuthenticated = !!token;
  const isAdmin = role === "ADMIN";
  const isUser = role === "USER";

  return {
    token,
    role,
    username,
    displayName,
    isAuthenticated,
    isAdmin,
    isUser,
  };
}
