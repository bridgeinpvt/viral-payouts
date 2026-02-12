export function redirectToAuth(page: "login" | "signup") {
  if (typeof window !== "undefined") {
    window.location.href = `/${page}`;
  }
}
