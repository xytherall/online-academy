"use client";

import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { buildPublicAssetUrl } from "@/lib/settings";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_LOGO_MIME_TYPES, MAX_LOGO_FILE_BYTES } from "@/lib/validation/settings";
import { removeLogo, updateLogo } from "./actions";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function LogoUploader({ logoPath: initialLogoPath }: { logoPath: string | null }) {
  const [logoPath, setLogoPath] = useState(initialLogoPath);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setSuccess(false);

    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type)) {
      setError("Logo must be a PNG, JPG or WEBP image.");
      return;
    }
    if (file.size > MAX_LOGO_FILE_BYTES) {
      setError("Logo must be 2 MB or smaller.");
      return;
    }

    const extension = EXTENSION_BY_MIME[file.type] ?? "png";
    const path = `academy-logo.${extension}`;

    setIsPending(true);
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("public-assets")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setIsPending(false);
      setError("Could not upload the logo. Please try again.");
      return;
    }

    const result = await updateLogo(path);
    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setLogoPath(path);
    setSuccess(true);
  }

  async function handleRemove() {
    setError(null);
    setSuccess(false);
    setIsPending(true);
    const result = await removeLogo();
    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setLogoPath(null);
  }

  return (
    <div className="space-y-3">
      <Label>Logo</Label>
      {logoPath ? (
        // eslint-disable-next-line @next/next/no-img-element -- public bucket asset, no remote-pattern config needed
        <img
          src={buildPublicAssetUrl(logoPath)}
          alt="Academy logo"
          className="h-16 w-16 rounded border border-border object-contain"
        />
      ) : (
        <p className="text-sm text-muted-foreground">No logo uploaded yet.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={isPending} onClick={() => inputRef.current?.click()}>
          {logoPath ? "Replace logo" : "Upload logo"}
        </Button>
        {logoPath ? (
          <Button type="button" variant="ghost" disabled={isPending} onClick={handleRemove}>
            Remove logo
          </Button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_LOGO_MIME_TYPES.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert>
          <AlertDescription>Logo saved.</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
