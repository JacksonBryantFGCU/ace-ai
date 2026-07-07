export const config = {
  title: "Authentication API Explorer",
  defaultExampleId: "register-user",
};

export const apiExamples = [
  {
    id: "register-user",
    label: "Register user",
    method: "POST",
    path: "/auth/register",
    body: {
      email: "sam@example.com",
      password: "Password123!",
      name: "Sam Carter",
    },
  },
  {
    id: "login-user",
    label: "Log in seeded user",
    method: "POST",
    path: "/auth/login",
    body: {
      email: "alex@example.com",
      password: "Password123!",
    },
  },
  {
    id: "current-user",
    label: "Get current user",
    method: "GET",
    path: "/auth/me",
  },
  {
    id: "logout",
    label: "Log out",
    method: "POST",
    path: "/auth/logout",
  },
];
