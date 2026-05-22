// Operator identity — single source of truth so the greeting / avatar /
// account menu all read from one place. Auth-derived; pass in a session-like
// shape (name + email) and we'll compute the rest. The unauthenticated
// fallback is intentionally generic ("Operator") — never a real person's name.

export interface Operator {
  readonly fullName: string;
  readonly firstName: string;
  readonly initials: string;
  readonly email: string;
}

export interface SessionLike {
  readonly name?: string | null;
  readonly email?: string | null;
}

export function deriveOperator(user: SessionLike | null | undefined): Operator {
  const email = user?.email ?? '';
  const fullName = user?.name?.trim() || email.split('@')[0] || 'Operator';
  const [firstName] = fullName.split(' ');
  const initials = fullName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || (email[0]?.toUpperCase() ?? 'A');
  return {
    fullName,
    firstName: firstName ?? fullName,
    initials,
    email,
  };
}
