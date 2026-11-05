import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

interface LoginPageProps {
  apiUrl: string;
  loading: boolean;
  error: string;
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginPage({ apiUrl, loading, error, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onLogin(email, password);
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark">D<span>F</span></div>
          <div className="brand-copy"><strong>dynamicfix</strong><small>ENTERPRISE</small></div>
        </div>
        <span className="eyebrow">SECURE WORKSPACE</span>
        <h1>Welcome back</h1>
        <p>Sign in to your DynamicFix ERP workspace.</p>
        <form className="login-form" onSubmit={submit}>
          <label className="form-field">
            <span>Work email</span>
            <input autoComplete="username" autoFocus required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="button button-primary login-submit" disabled={loading} type="submit">
            {loading ? <><span className="loading-spinner" /> Signing in...</> : <>Sign in <ArrowRight size={16} /></>}
          </button>
        </form>
        <div className="login-security"><LockKeyhole size={14} /><span>Protected by your organization’s access controls</span></div>
        <div className="login-api-url">Connected API: <span>{apiUrl}</span></div>
      </section>
    </main>
  );
}
