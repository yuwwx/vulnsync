import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// false на сервере и до завершения гидратации, true — после.
// Заменяет паттерн «setMounted(true) в useEffect», запрещённый правилом
// react-hooks/set-state-in-effect. Нужен для рендера данных из localStorage
// (см. lib/useAuth), которые отсутствуют на сервере.
export function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
