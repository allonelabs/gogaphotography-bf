// Cookie name shared between /api/pinterest/oauth/start (sets it) and
// /api/pinterest/oauth/callback (verifies it) for the OAuth `state` CSRF
// check.
export const PINTEREST_OAUTH_STATE_COOKIE = "gp_pinterest_oauth_state";
