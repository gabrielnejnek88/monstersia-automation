// Reexporta constantes compartilhadas
export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Título do app usado no layout
export const APP_TITLE =
  (import.meta as any).env?.VITE_APP_TITLE || "Monsters IA";

// Logo opcional (se quiser usar em algum lugar depois)
export const APP_LOGO =
  (import.meta as any).env?.VITE_APP_LOGO || "/logo.svg";

// Gera a URL de login com base nas envs e no origin atual
export const getLoginUrl = () => {
  let oauthPortalUrl = (import.meta as any).env?.VITE_OAUTH_PORTAL_URL;
  const appId = (import.meta as any).env?.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  if (!oauthPortalUrl || !appId) {
    console.warn(
      "[Login] VITE_OAUTH_PORTAL_URL ou VITE_APP_ID não configurados."
    );
    return "#";
  }

  if (!oauthPortalUrl.startsWith("http")) {
    oauthPortalUrl = `https://${oauthPortalUrl}`;
  }

  const base = oauthPortalUrl.replace(/\/$/, "");
  const url = new URL(`${base}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
