// Both candidates are rendered for kvn's decision. A is the review default.
export const accountCopyOptions = {
  A: {
    heading: "One account. All of Suvana.",
    description: "Use one Suvana account for Learn, Communicate and Recognize. Alerts works without an account.",
    login: { title: "Sign in to Suvana", subtitle: "Continue with your Suvana account." },
    register: { title: "Create your Suvana account", subtitle: "One account for Learn, Communicate and Recognize." },
  },
  B: {
    heading: "Welcome to Suvana.",
    description: "Your Suvana account is shared by Learn, Communicate and Recognize. You can use Alerts without signing in.",
    login: { title: "Welcome back", subtitle: "Sign in to your Suvana account to continue." },
    register: { title: "Join Suvana", subtitle: "Create an account for Learn, Communicate and Recognize." },
  },
} as const;

export const accountCopy = accountCopyOptions.A;
