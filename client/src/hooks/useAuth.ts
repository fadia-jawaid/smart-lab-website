// type User = {
//   name: string;
//   rollNo?: string;
//   department?: string;
//   batch?: string;
//   role?: string;
// };

// export { useAuth } from '../context/AuthContext';

// function getStoredUser(): User | null {
//   if (typeof window === "undefined") return null;

//   const storedUser = localStorage.getItem("user");
//   return storedUser ? JSON.parse(storedUser) : null;
// }

// export function useAuth() {
//   const user = getStoredUser();

//   const login = (token: string, userData: User) => {
//     localStorage.setItem("token", token);
//     localStorage.setItem("user", JSON.stringify(userData));
//   };

//   const logout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//   };

//   return {
//     user,
//     login,
//     logout,
//   };
// }

export { useAuth } from '../context/AuthContext';