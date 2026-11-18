export function useAuth() {
  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const username =
    typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const displayName =
    typeof window !== "undefined" ? localStorage.getItem("displayName") : null;

  // Настоящая аутентификация — по HttpOnly-куке на бэкенде; здесь лишь
  // профиль для UI. Если кука истекла, первый же запрос вернёт 401.
  const isAuthenticated = !!username;
  const isAdmin = role === "ADMIN";
  const isUser = role === "USER";

  return {
    role,
    username,
    displayName,
    isAuthenticated,
    isAdmin,
    isUser,
  };
}
