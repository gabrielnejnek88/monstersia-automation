export const getLoginUrl = () => {
  let oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  // Se não tiver URL de portal configurada, só não quebra a tela
  if (!oauthPortalUrl || !appId) {
    console.warn("[Login] VITE_OAUTH_PORTAL_URL ou VITE_APP_ID não configurados.");
    return "#";
  }

  // Garante que tem https://
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
