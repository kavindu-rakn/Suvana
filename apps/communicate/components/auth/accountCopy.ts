// Both candidates were rendered; kvn chose B on 18 Oct.
export const accountCopyOptions = {
  A: {
    heading: "One account. All of Suvana.",
    description: "Use one Suvana account for Learn, Communicate and Recognize. Alerts works without an account.",
    login: { title: "Sign in to Suvana", subtitle: "Continue with your Suvana account." },
    register: { title: "Create your Suvana account", subtitle: "One account for Learn, Communicate and Recognize." },
  },
  B: {
    heading: "Welcome to Suvana.",
    description: "Join Suvana to enhance your experience",
    login: { title: "Welcome back", subtitle: "Log in to your Suvana account to continue." },
    register: { title: "Join Suvana", subtitle: "Create an account to enhance your experience." },
  },
} as const;

export const accountCopy = accountCopyOptions.B;
