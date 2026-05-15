import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        variables: { colorPrimary: "hsl(187 100% 50%)" },
        elements: {
          card: "rounded-xl border border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl",
        },
      }}
    />
  );
}
