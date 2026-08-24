"use client";

import { apiPath } from "@/lib/basePath";
import { useEffect, useState } from "react";
import { Loader2, Settings as SettingsIcon, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SettingsClient() {
  const [currentUrl, setCurrentUrl] = useState<string | null | undefined>(undefined);
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(apiPath("/api/admin/ngrok-url"))
      .then((res) => res.json())
      .then((data) => setCurrentUrl(data.url ?? null))
      .catch(() => setCurrentUrl(null));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const res = await fetch(apiPath("/api/admin/ngrok-url"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Couldn't save that URL.");
        return;
      }

      setCurrentUrl(urlInput.trim());
      setUrlInput("");
      setSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <SettingsIcon className="text-accent" size={24} />
          Settings
        </h1>
        <p className="mt-1 text-foreground-muted">
          Point the app at your notebook&apos;s current ngrok URL.
        </p>
      </div>

      <Card className="p-6">
        <span className="text-xs uppercase tracking-wider text-foreground-muted">
          Currently registered
        </span>
        <p className="mt-2 font-mono text-sm">
          {currentUrl === undefined ? (
            <span className="text-foreground-muted">Loading…</span>
          ) : currentUrl ? (
            currentUrl
          ) : (
            <span className="text-foreground-muted">Not registered yet</span>
          )}
        </p>
      </Card>

      <Card className="p-6">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="New ngrok URL"
            type="url"
            required
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://xxxx.ngrok-free.dev"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {saved && (
            <p className="flex items-center gap-1.5 text-sm text-accent">
              <CheckCircle2 size={15} /> Saved. New requests will use this URL immediately.
            </p>
          )}
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving…
              </>
            ) : (
              "Save URL"
            )}
          </Button>
        </form>
      </Card>

      <p className="text-sm text-foreground-muted">
        Every time the notebook restarts, ngrok hands out a new free-tier URL. Run the cell that
        prints <code className="text-accent">🌐 PUBLIC API URL</code>, copy it here, and every
        subsequent request from this app uses it automatically — no restart or redeploy needed. If
        the app is deployed somewhere Colab can reach directly (e.g. Vercel), you can instead set{" "}
        <code className="text-accent">APP_BASE_URL</code> in the notebook so it registers itself
        automatically — see{" "}
        <code className="text-accent">notebook-integration/register_ngrok_url.py</code>.
      </p>

    </div>
  );
}
