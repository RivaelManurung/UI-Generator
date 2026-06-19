"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { getAccessToken, clearSession } from "@/lib/api/auth";
import { authService } from "@/lib/services/auth-service";
import { cn } from "@/lib/utils";

const registerSchema = z
  .object({
    name: z.string().min(2, "Please enter your full name"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(1, "Please confirm your password"),
    terms: z
      .boolean()
      .refine((value) => value === true, "You must accept the terms to continue"),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

const perks = [
  "12 demo credits, no card required",
  "One seeded workspace ready to explore",
  "Cancel or upgrade anytime",
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const token = getAccessToken();
      if (!token) {
        if (active) setCheckingSession(false);
        return;
      }

      try {
        await authService.getCurrentUser();
        if (active) {
          router.replace("/app");
        }
      } catch {
        if (active) {
          clearSession();
          setCheckingSession(false);
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "", terms: false },
  });

  async function onSubmit(values: RegisterValues) {
    setSubmitError(null);
    try {
      await authService.register(values.name, values.email, values.password);
      router.push("/app");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Registration failed");
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Checking session" />
      </main>
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Brand />
          <Button asChild size="sm" variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <Reveal className="w-full max-w-sm">
            <Card className="border-border shadow-brand-sm">
              <CardHeader>
                <CardTitle className="text-2xl tracking-normal">Create your account</CardTitle>
                <CardDescription>
                  Start with 12 demo credits and a seeded workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      autoComplete="name"
                      id="name"
                      placeholder="Rivael Manurung"
                      {...register("name")}
                      aria-invalid={Boolean(errors.name)}
                    />
                    {errors.name ? (
                      <p className="text-xs font-medium text-destructive">
                        {errors.name.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      autoComplete="email"
                      id="email"
                      placeholder="you@example.com"
                      type="email"
                      {...register("email")}
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email ? (
                      <p className="text-xs font-medium text-destructive">
                        {errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        autoComplete="new-password"
                        className="pr-10"
                        id="password"
                        placeholder="At least 8 characters"
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        aria-invalid={Boolean(errors.password)}
                      />
                      <button
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setShowPassword((value) => !value)}
                        type="button"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    {errors.password ? (
                      <p className="text-xs font-medium text-destructive">
                        {errors.password.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <Input
                      autoComplete="new-password"
                      id="confirm"
                      placeholder="Re-enter your password"
                      type={showPassword ? "text" : "password"}
                      {...register("confirm")}
                      aria-invalid={Boolean(errors.confirm)}
                    />
                    {errors.confirm ? (
                      <p className="text-xs font-medium text-destructive">
                        {errors.confirm.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={acceptedTerms}
                        className="mt-0.5"
                        id="terms"
                        onCheckedChange={(checked) => {
                          const value = checked === true;
                          setAcceptedTerms(value);
                          setValue("terms", value, { shouldValidate: false });
                          if (value) clearErrors("terms");
                        }}
                      />
                      <Label
                        className="text-sm font-normal leading-snug text-muted-foreground"
                        htmlFor="terms"
                      >
                        I agree to the{" "}
                        <Link className="font-medium text-primary hover:underline" href="/register">
                          Terms
                        </Link>{" "}
                        and{" "}
                        <Link className="font-medium text-primary hover:underline" href="/register">
                          Privacy Policy
                        </Link>
                        .
                      </Label>
                    </div>
                    {errors.terms ? (
                      <p className="text-xs font-medium text-destructive">
                        {errors.terms.message}
                      </p>
                    ) : null}
                  </div>

                  <Button className="w-full" disabled={isSubmitting} type="submit">
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                    {isSubmitting ? "Creating account..." : "Create account"}
                  </Button>
                  {submitError ? (
                    <p className="text-xs font-medium text-destructive">{submitError}</p>
                  ) : null}
                </form>

                <div className="relative my-5">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    or continue with
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button disabled type="button" variant="outline">
                    <GoogleIcon className="size-4" />
                    Google
                  </Button>
                  <Button disabled type="button" variant="outline">
                    <GithubIcon className="size-4" />
                    GitHub
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="justify-center">
                <p className="text-sm text-muted-foreground">
                  Already registered?{" "}
                  <Link className="font-semibold text-primary hover:underline" href="/login">
                    Log in
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </Reveal>
        </div>
      </div>

      <AuthAside />
    </main>
  );
}

function AuthAside() {
  return (
    <aside className="landing-hero relative hidden overflow-hidden border-l border-landing-border lg:block">
      <div className="glow pointer-events-none absolute inset-x-0 top-0 h-96 opacity-70" />
      <Reveal className="relative flex h-full flex-col justify-center px-12 py-16">
        <span className="landing-pill inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-medium tracking-normal">
          <CheckCircle2 className="size-3.5 text-planetary" aria-hidden="true" />
          Free to start
        </span>
        <h2 className="mt-6 max-w-md text-balance text-3xl font-bold leading-[1.12] tracking-normal">
          Go from data model to live dashboard in minutes.
        </h2>
        <p className="landing-text-soft mt-4 max-w-md text-balance leading-7">
          Join teams building schema-first dashboards with DashboardCraft: validated, component-ready, and
          production-shaped.
        </p>
        <RevealGroup className="mt-8 grid gap-4">
          {perks.map((item) => (
            <RevealItem key={item}>
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-planetary" aria-hidden="true" />
                <span className="text-galaxy/90">{item}</span>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Reveal>
    </aside>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(className)} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}
