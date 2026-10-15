export const authPaths = {
  login: '/login',
  register: '/register',
  verify: '/verify',
  forgot: '/forgot-password',
  reset: '/reset-password',
} as const;

export type AuthMode = keyof typeof authPaths;

// sentAt: when the last verification code was emailed (ms), for the resend countdown.
export type AuthDraft = {
  email: string;
  code: string;
  token: string;
  message: string;
  sentAt: number;
};
export const emptyAuthDraft: AuthDraft = { email: '', code: '', token: '', message: '', sentAt: 0 };
