export const APP_NAME = "Township Connect";

export const CODE_LENGTH = 6;

// Portal paths. App paths (/elder/, /volunteer/) come from @sdh/auth.
export const PATHS = {
  signIn: "/",
  signUp: "/sign-up",
  signUpDetails: "/sign-up/details",
  signUpVerify: "/sign-up/verify",
  finish: "/finish",
  forgot: "/forgot",
  reset: "/reset",
  account: "/account",
  accountName: "/account/name",
  accountEmail: "/account/email",
  accountEmailVerify: "/account/email/verify",
  accountPassword: "/account/password",
} as const;

export const ROLE_LABEL = {
  elder: "Elderly",
  volunteer: "Youth",
  coordinator: "Coordinator",
} as const;

export const NOTICE = {
  confirmedSignIn: "Your email is confirmed. Sign in to finish setting up.",
  passwordReset: "Your password is changed. Please sign in.",
  passwordChanged: "Your password is changed.",
  nameChanged: "Your name is changed.",
  emailChanged: "Your email is changed. Use your new email to sign in next time.",
} as const;

export const FIELD_COPY = {
  needName: "Please type your name.",
  needEmail: "Please type your email.",
  needPassword: "Please type your password.",
  needCode: "Please type the 6-digit code from your email.",
  needArea: "Please choose where you live.",
  needRole: "Please choose who this account is for.",
  passwordRules: "Please make a password that follows all three rules.",
  passwordMismatch: "The two passwords are not the same. Please type them again.",
  sameEmail: "That is already your email. Please type a different one.",
  codeSent: "We sent you a new code.",
} as const;
