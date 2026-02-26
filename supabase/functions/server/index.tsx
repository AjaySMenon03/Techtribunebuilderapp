import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// --- Helpers ---

const supabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );

/**
 * Extract the authenticated user from the JWT.
 *
 * The frontend always sends the Supabase anon key in the Authorization header
 * (so the Edge Function gateway accepts the request) and places the real user
 * access token in the X-User-Token header. We read from X-User-Token first,
 * falling back to Authorization for backwards-compatibility / direct callers.
 */
function getAuthUser(c: any): { id: string } | null {
  const token =
    c.req.header("X-User-Token") ||
    c.req.header("Authorization")?.split(" ")[1];
  if (!token) {
    console.log("[getAuthUser] No user token found");
    return null;
  }
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.log("[getAuthUser] Malformed JWT (not 3 parts)");
      return null;
    }
    // JWT uses base64url — convert to standard base64 before decoding
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    // Supabase user JWTs have role='authenticated' and sub=<user_id>
    // Anon keys have role='anon'; service role keys have role='service_role'
    if (payload.role === "authenticated" && payload.sub) {
      return { id: payload.sub };
    }
    console.log(`[getAuthUser] JWT role is '${payload.role}', not 'authenticated'`);
    return null;
  } catch (e) {
    console.log(`[getAuthUser] Failed to decode JWT: ${e}`);
    return null;
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

// --- Storage bucket init ---

const BUCKET_NAME = "make-607373f0-logos";
const ASSETS_BUCKET = "make-607373f0-assets";

async function ensureBucket() {
  try {
    const sb = supabaseAdmin();
    const { data: buckets } = await sb.storage.listBuckets();
    for (const name of [BUCKET_NAME, ASSETS_BUCKET]) {
      const exists = buckets?.some((b: any) => b.name === name);
      if (!exists) {
        await sb.storage.createBucket(name, { public: false });
        console.log(`Created storage bucket: ${name}`);
      }
    }
  } catch (e) {
    console.log(`Error ensuring buckets: ${e}`);
  }
}

ensureBucket();

// --- Default workspace ---

const DEFAULT_WORKSPACE = {
  name: "Electronikmedia",
  logo_url: null,
  theme: {
    background_color: "#f4efe5",
    card_color: "#e9e0cc",
    text_color: "#000000",
    accent_color: "#000000",
    font_family: "Inter",
    dark_mode_enabled: false,
  },
};

// --- Health ---

app.get("/make-server-607373f0/health", (c) => {
  return c.json({ status: "ok" });
});

// --- Auth: Signup ---

app.post("/make-server-607373f0/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required for signup" }, 400);
    }
    const sb = supabaseAdmin();
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || email.split("@")[0] },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });
    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: `Signup failed: ${error.message}` }, 400);
    }
    return c.json({ user: data.user });
  } catch (e) {
    console.log(`Signup exception: ${e}`);
    return c.json({ error: `Signup exception: ${e}` }, 500);
  }
});

// --- Newsletter CRUD ---

app.get("/make-server-607373f0/newsletters", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    // Return empty list for unauthenticated requests instead of 401
    // (the Supabase Edge Function infra will block truly invalid JWTs
    //  before reaching this code; this handles anon key fallback)
    return c.json({ newsletters: [] });
  }

  try {
    const newsletters = await kv.getByPrefix("newsletter:");
    // Sort by updated_at descending
    newsletters.sort((a: any, b: any) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    return c.json({ newsletters });
  } catch (e) {
    console.log(`Error listing newsletters: ${e}`);
    return c.json({ error: `Failed to list newsletters: ${e}` }, 500);
  }
});

app.get("/make-server-607373f0/newsletters/:id", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized: must be logged in to view newsletter" }, 401);

  try {
    const id = c.req.param("id");
    const newsletter = await kv.get(`newsletter:${id}`);
    if (!newsletter) return c.json({ error: "Newsletter not found" }, 404);
    return c.json({ newsletter });
  } catch (e) {
    console.log(`Error fetching newsletter: ${e}`);
    return c.json({ error: `Failed to fetch newsletter: ${e}` }, 500);
  }
});

app.post("/make-server-607373f0/newsletters", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized: must be logged in to create newsletter" }, 401);

  try {
    const body = await c.req.json();
    const id = generateId();
    const now = new Date().toISOString();

    const newsletter = {
      id,
      title: body.title || "Untitled Newsletter",
      month: body.month || new Date().getMonth() + 1,
      year: body.year || new Date().getFullYear(),
      content_json: body.content_json || { sections: [] },
      theme_config: body.theme_config || null,
      version: 1,
      is_draft: true,
      created_at: now,
      updated_at: now,
      created_by: user.id,
    };

    // Check size (~10MB limit)
    const size = new TextEncoder().encode(JSON.stringify(newsletter)).length;
    if (size > 10 * 1024 * 1024) {
      return c.json({ error: "Newsletter exceeds 10MB size limit" }, 413);
    }

    await kv.set(`newsletter:${id}`, newsletter);
    return c.json({ newsletter }, 201);
  } catch (e) {
    console.log(`Error creating newsletter: ${e}`);
    return c.json({ error: `Failed to create newsletter: ${e}` }, 500);
  }
});

app.put("/make-server-607373f0/newsletters/:id", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized: must be logged in to update newsletter" }, 401);

  try {
    const id = c.req.param("id");
    const existing = await kv.get(`newsletter:${id}`);
    if (!existing) return c.json({ error: "Newsletter not found" }, 404);

    const autoSave = c.req.query("auto_save") === "true";
    const body = await c.req.json();
    const updated = {
      ...existing,
      ...body,
      id, // prevent id override
      updated_at: new Date().toISOString(),
      version: autoSave ? (existing.version || 1) : (existing.version || 0) + 1,
    };

    const size = new TextEncoder().encode(JSON.stringify(updated)).length;
    if (size > 10 * 1024 * 1024) {
      return c.json({ error: "Newsletter exceeds 10MB size limit" }, 413);
    }

    await kv.set(`newsletter:${id}`, updated);
    return c.json({ newsletter: updated });
  } catch (e) {
    console.log(`Error updating newsletter: ${e}`);
    return c.json({ error: `Failed to update newsletter: ${e}` }, 500);
  }
});

app.delete("/make-server-607373f0/newsletters/:id", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized: must be logged in to delete newsletter" }, 401);

  try {
    const id = c.req.param("id");
    const existing = await kv.get(`newsletter:${id}`);
    if (!existing) return c.json({ error: "Newsletter not found" }, 404);
    await kv.del(`newsletter:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log(`Error deleting newsletter: ${e}`);
    return c.json({ error: `Failed to delete newsletter: ${e}` }, 500);
  }
});

app.post("/make-server-607373f0/newsletters/:id/duplicate", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized: must be logged in to duplicate newsletter" }, 401);

  try {
    const id = c.req.param("id");
    const existing = await kv.get(`newsletter:${id}`);
    if (!existing) return c.json({ error: "Newsletter not found" }, 404);

    const newId = generateId();
    const now = new Date().toISOString();
    const duplicate = {
      ...existing,
      id: newId,
      title: `${existing.title} (Copy)`,
      version: 1,
      is_draft: true,
      created_at: now,
      updated_at: now,
      created_by: user.id,
    };

    await kv.set(`newsletter:${newId}`, duplicate);
    return c.json({ newsletter: duplicate }, 201);
  } catch (e) {
    console.log(`Error duplicating newsletter: ${e}`);
    return c.json({ error: `Failed to duplicate newsletter: ${e}` }, 500);
  }
});

// --- Newsletter Versions ---

app.get("/make-server-607373f0/newsletters/:id/versions", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized: must be logged in to view versions" }, 401);

  try {
    const id = c.req.param("id");
    const versionEntries = await kv.getByPrefix(`version:${id}:`);
    // Sort by createdAt descending (newest first)
    versionEntries.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return c.json({ versions: versionEntries });
  } catch (e) {
    console.log(`Error listing versions for newsletter: ${e}`);
    return c.json({ error: `Failed to list versions: ${e}` }, 500);
  }
});

app.post("/make-server-607373f0/newsletters/:id/versions", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized: must be logged in to create version" }, 401);

  try {
    const newsletterId = c.req.param("id");
    const body = await c.req.json();
    const now = new Date().toISOString();
    const versionId = generateId();

    const snapshot = {
      id: versionId,
      newsletterId,
      version: body.version || 1,
      title: body.title || "Untitled",
      createdAt: now,
      createdBy: body.createdBy || user.id,
      createdByName: body.createdByName || "Unknown",
      sectionsCount: (body.sections || []).length,
      sections: body.sections || [],
    };

    // Check size
    const size = new TextEncoder().encode(JSON.stringify(snapshot)).length;
    if (size > 10 * 1024 * 1024) {
      return c.json({ error: "Version snapshot exceeds 10MB size limit" }, 413);
    }

    await kv.set(`version:${newsletterId}:${versionId}`, snapshot);
    return c.json({ version: snapshot }, 201);
  } catch (e) {
    console.log(`Error creating version snapshot: ${e}`);
    return c.json({ error: `Failed to create version: ${e}` }, 500);
  }
});

app.get("/make-server-607373f0/newsletters/:id/versions/:versionId", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const newsletterId = c.req.param("id");
    const versionId = c.req.param("versionId");
    const version = await kv.get(`version:${newsletterId}:${versionId}`);
    if (!version) return c.json({ error: "Version not found" }, 404);
    return c.json({ version });
  } catch (e) {
    console.log(`Error fetching version: ${e}`);
    return c.json({ error: `Failed to fetch version: ${e}` }, 500);
  }
});

// --- Workspace ---

const WORKSPACE_KEY = "workspace:electronikmedia";

app.get("/make-server-607373f0/workspace", async (c) => {
  // Workspace read is allowed without auth - returns defaults for anon
  const user = await getAuthUser(c);

  try {
    if (!user) {
      // Unauthenticated: return defaults so the app doesn't break
      return c.json({ workspace: DEFAULT_WORKSPACE });
    }
    const workspace = await kv.get(WORKSPACE_KEY);
    if (!workspace) {
      return c.json({ workspace: DEFAULT_WORKSPACE });
    }
    return c.json({ workspace });
  } catch (e) {
    console.log(`Error fetching workspace: ${e}`);
    return c.json({ error: `Failed to fetch workspace: ${e}` }, 500);
  }
});

app.put("/make-server-607373f0/workspace", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized: must be logged in to update workspace" }, 401);

  try {
    const body = await c.req.json();
    const existing = await kv.get(WORKSPACE_KEY);
    const updated = { ...existing, ...body };
    await kv.set(WORKSPACE_KEY, updated);
    return c.json({ workspace: updated });
  } catch (e) {
    console.log(`Error updating workspace: ${e}`);
    return c.json({ error: `Failed to update workspace: ${e}` }, 500);
  }
});

// --- Logo Upload ---

app.post("/make-server-607373f0/upload/logo", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized: must be logged in to upload logo" }, 401);

  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file provided for logo upload" }, 400);
    }

    // Check 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "Logo file exceeds 5MB size limit" }, 413);
    }

    // Ensure bucket exists before uploading
    await ensureBucket();

    const sb = supabaseAdmin();
    const ext = file.name?.split(".").pop() || "png";
    const filePath = `logo-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const { error: uploadError } = await sb.storage
      .from(BUCKET_NAME)
      .upload(filePath, uint8, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.log(`Upload error: ${JSON.stringify(uploadError)}`);
      return c.json({ error: `Logo upload failed: ${uploadError.message}` }, 500);
    }

    const { data: urlData, error: signError } = await sb.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    if (signError) {
      console.log(`Logo signed URL error: ${JSON.stringify(signError)}`);
      return c.json({ error: `Logo signed URL failed: ${signError.message}` }, 500);
    }

    return c.json({ logo_url: urlData?.signedUrl || null, path: filePath });
  } catch (e) {
    console.log(`Logo upload exception: ${e}`);
    return c.json({ error: `Logo upload failed. Please try again.` }, 500);
  }
});

// --- Asset Upload ---

app.post("/make-server-607373f0/upload/asset", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized: must be logged in to upload asset" }, 401);

  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file provided for asset upload" }, 400);
    }

    // Check 5MB limit for assets
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "Asset file exceeds 5MB size limit" }, 413);
    }

    // Ensure bucket exists before uploading
    await ensureBucket();

    const sb = supabaseAdmin();
    const ext = file.name?.split(".").pop() || "jpg";
    const filePath = `asset-${Date.now()}-${generateId().slice(0, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const { error: uploadError } = await sb.storage
      .from(ASSETS_BUCKET)
      .upload(filePath, uint8, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.log(`Asset upload storage error: ${JSON.stringify(uploadError)}`);
      return c.json({ error: `Asset upload failed: ${uploadError.message}` }, 500);
    }

    const { data: urlData, error: signError } = await sb.storage
      .from(ASSETS_BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    if (signError) {
      console.log(`Asset signed URL error: ${JSON.stringify(signError)}`);
      return c.json({ error: `Asset signed URL failed: ${signError.message}` }, 500);
    }

    return c.json({ url: urlData?.signedUrl || null, path: filePath });
  } catch (e) {
    console.log(`Asset upload exception: ${e}`);
    return c.json({ error: `Asset upload failed. Please try again.` }, 500);
  }
});

// --- Render A4 endpoint ---
// Accepts newsletter HTML payload and returns it rendered for capture.
// This endpoint serves as a standalone rendering target. In production,
// pair with a headless browser (Puppeteer) for server-side PNG/JPG/PDF generation.
// Currently, A4 exports are handled client-side via html-to-image + jsPDF.

app.post("/make-server-607373f0/render/a4", async (c) => {
  try {
    const body = await c.req.json();
    const { html, css, title } = body;

    if (!html) {
      return c.json({ error: "HTML content is required for A4 render" }, 400);
    }

    // Return a complete HTML page suitable for headless browser capture
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=595px, initial-scale=1.0" />
  <title>${title || "Newsletter"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 595px; background: white; }
    ${css || ""}
  </style>
</head>
<body>
${html}
</body>
</html>`;

    return new Response(fullHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.log(`Render A4 error: ${e}`);
    return c.json({ error: `Failed to render A4: ${e}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// Profile Generator – Asset Library, Templates & Profiles
// ─────────────────────────────────────────────────────────

const PG_BUCKET = "make-607373f0-pg";

// Ensure the PG bucket exists on startup
(async () => {
  try {
    const sb = supabaseAdmin();
    const { data: buckets } = await sb.storage.listBuckets();
    if (!buckets?.some((b: any) => b.name === PG_BUCKET)) {
      await sb.storage.createBucket(PG_BUCKET, { public: false });
      console.log(`Created PG bucket: ${PG_BUCKET}`);
    }
  } catch (e) {
    console.log(`PG bucket init error: ${e}`);
  }
})();

// --- PG Assets ---

app.get("/make-server-607373f0/pg/assets", async (c) => {
  try {
    const assets = await kv.getByPrefix("pg-asset:");
    assets.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return c.json({ assets });
  } catch (e) {
    console.log(`PG list assets error: ${e}`);
    return c.json({ error: `Failed to list assets: ${e}` }, 500);
  }
});

app.post("/make-server-607373f0/pg/assets", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    const meta = body["meta"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file provided" }, 400);
    }
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File exceeds 5MB limit" }, 413);
    }

    const parsed = typeof meta === "string" ? JSON.parse(meta) : {};
    const sb = supabaseAdmin();
    const ext = file.name?.split(".").pop() || "png";
    const filePath = `pg-asset-${Date.now()}-${generateId().slice(0, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const { error: uploadError } = await sb.storage
      .from(PG_BUCKET)
      .upload(filePath, uint8, {
        contentType: file.type || "image/png",
        upsert: true,
      });
    if (uploadError) {
      console.log(`PG asset upload error: ${JSON.stringify(uploadError)}`);
      return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);
    }

    const { data: urlData } = await sb.storage
      .from(PG_BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    const id = generateId();
    const asset = {
      id,
      name: parsed.name || file.name || "Untitled",
      type: parsed.type || "foreground",
      category: parsed.category || "Other",
      tags: parsed.tags || [],
      url: urlData?.signedUrl || "",
      storagePath: filePath,
      width: parsed.width || 0,
      height: parsed.height || 0,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };
    await kv.set(`pg-asset:${id}`, asset);
    return c.json({ asset }, 201);
  } catch (e) {
    console.log(`PG create asset error: ${e}`);
    return c.json({ error: `Failed to create asset: ${e}` }, 500);
  }
});

app.put("/make-server-607373f0/pg/assets/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const id = c.req.param("id");
    const existing = await kv.get(`pg-asset:${id}`);
    if (!existing) return c.json({ error: "Asset not found" }, 404);
    const body = await c.req.json();
    const updated = { ...existing, ...body, id };
    await kv.set(`pg-asset:${id}`, updated);
    return c.json({ asset: updated });
  } catch (e) {
    console.log(`PG update asset error: ${e}`);
    return c.json({ error: `Failed to update asset: ${e}` }, 500);
  }
});

app.delete("/make-server-607373f0/pg/assets/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const id = c.req.param("id");
    const existing = await kv.get(`pg-asset:${id}`);
    if (!existing) return c.json({ error: "Asset not found" }, 404);

    // Remove from storage
    if (existing.storagePath) {
      const sb = supabaseAdmin();
      await sb.storage.from(PG_BUCKET).remove([existing.storagePath]);
    }
    await kv.del(`pg-asset:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log(`PG delete asset error: ${e}`);
    return c.json({ error: `Failed to delete asset: ${e}` }, 500);
  }
});

// --- PG Templates ---

app.get("/make-server-607373f0/pg/templates", async (c) => {
  try {
    const templates = await kv.getByPrefix("pg-template:");
    templates.sort(
      (a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return c.json({ templates });
  } catch (e) {
    console.log(`PG list templates error: ${e}`);
    return c.json({ error: `Failed to list templates: ${e}` }, 500);
  }
});

app.get("/make-server-607373f0/pg/templates/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const template = await kv.get(`pg-template:${id}`);
    if (!template) return c.json({ error: "Template not found" }, 404);
    return c.json({ template });
  } catch (e) {
    console.log(`PG get template error: ${e}`);
    return c.json({ error: `Failed to get template: ${e}` }, 500);
  }
});

app.post("/make-server-607373f0/pg/templates", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const body = await c.req.json();
    const id = generateId();
    const now = new Date().toISOString();
    const template = {
      id,
      name: body.name || "Untitled Template",
      description: body.description || "",
      category: body.category || "Custom",
      thumbnailUrl: body.thumbnailUrl || null,
      canvasConfig: body.canvasConfig || {
        width: 400,
        height: 500,
        zoom: 1,
        gridSize: 10,
        showGrid: true,
        showSafeMargin: true,
        safeMargin: 20,
        snapToGrid: true,
      },
      layers: body.layers || [],
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      isSystem: body.isSystem ?? false,
    };
    await kv.set(`pg-template:${id}`, template);
    return c.json({ template }, 201);
  } catch (e) {
    console.log(`PG create template error: ${e}`);
    return c.json({ error: `Failed to create template: ${e}` }, 500);
  }
});

app.put("/make-server-607373f0/pg/templates/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const id = c.req.param("id");
    const existing = await kv.get(`pg-template:${id}`);
    if (!existing) return c.json({ error: "Template not found" }, 404);
    const body = await c.req.json();
    const updated = {
      ...existing,
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`pg-template:${id}`, updated);
    return c.json({ template: updated });
  } catch (e) {
    console.log(`PG update template error: ${e}`);
    return c.json({ error: `Failed to update template: ${e}` }, 500);
  }
});

app.delete("/make-server-607373f0/pg/templates/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const id = c.req.param("id");
    await kv.del(`pg-template:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log(`PG delete template error: ${e}`);
    return c.json({ error: `Failed to delete template: ${e}` }, 500);
  }
});

app.post("/make-server-607373f0/pg/templates/:id/duplicate", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const id = c.req.param("id");
    const existing = await kv.get(`pg-template:${id}`);
    if (!existing) return c.json({ error: "Template not found" }, 404);

    const newId = generateId();
    const now = new Date().toISOString();
    const dup = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`,
      isSystem: false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    await kv.set(`pg-template:${newId}`, dup);
    return c.json({ template: dup }, 201);
  } catch (e) {
    console.log(`PG duplicate template error: ${e}`);
    return c.json({ error: `Failed to duplicate template: ${e}` }, 500);
  }
});

// --- PG Profiles ---

app.get("/make-server-607373f0/pg/profiles", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ profiles: [] });

  try {
    const profiles = await kv.getByPrefix("pg-profile:");
    // Filter to user's own profiles
    const mine = profiles.filter((p: any) => p.createdBy === user.id);
    mine.sort(
      (a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return c.json({ profiles: mine });
  } catch (e) {
    console.log(`PG list profiles error: ${e}`);
    return c.json({ error: `Failed to list profiles: ${e}` }, 500);
  }
});

app.get("/make-server-607373f0/pg/profiles/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const id = c.req.param("id");
    const profile = await kv.get(`pg-profile:${id}`);
    if (!profile) return c.json({ error: "Profile not found" }, 404);
    return c.json({ profile });
  } catch (e) {
    console.log(`PG get profile error: ${e}`);
    return c.json({ error: `Failed to get profile: ${e}` }, 500);
  }
});

app.post("/make-server-607373f0/pg/profiles", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const body = await c.req.json();
    const id = generateId();
    const now = new Date().toISOString();
    const profile = {
      id,
      name: body.name || "Untitled Profile",
      templateId: body.templateId || null,
      canvasConfig: body.canvasConfig,
      layers: body.layers || [],
      thumbnailUrl: body.thumbnailUrl || null,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    await kv.set(`pg-profile:${id}`, profile);
    return c.json({ profile }, 201);
  } catch (e) {
    console.log(`PG create profile error: ${e}`);
    return c.json({ error: `Failed to create profile: ${e}` }, 500);
  }
});

app.put("/make-server-607373f0/pg/profiles/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const id = c.req.param("id");
    const existing = await kv.get(`pg-profile:${id}`);
    if (!existing) return c.json({ error: "Profile not found" }, 404);
    const body = await c.req.json();
    const updated = {
      ...existing,
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`pg-profile:${id}`, updated);
    return c.json({ profile: updated });
  } catch (e) {
    console.log(`PG update profile error: ${e}`);
    return c.json({ error: `Failed to update profile: ${e}` }, 500);
  }
});

app.delete("/make-server-607373f0/pg/profiles/:id", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const id = c.req.param("id");
    await kv.del(`pg-profile:${id}`);
    return c.json({ success: true });
  } catch (e) {
    console.log(`PG delete profile error: ${e}`);
    return c.json({ error: `Failed to delete profile: ${e}` }, 500);
  }
});

app.post("/make-server-607373f0/pg/upload", async (c) => {
  const user = getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file provided" }, 400);
    }
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File exceeds 5MB" }, 413);
    }

    const sb = supabaseAdmin();
    // Ensure bucket
    const { data: buckets } = await sb.storage.listBuckets();
    if (!buckets?.some((b: any) => b.name === PG_BUCKET)) {
      await sb.storage.createBucket(PG_BUCKET, { public: false });
    }

    const ext = file.name?.split(".").pop() || "png";
    const filePath = `pg-upload-${Date.now()}-${generateId().slice(0, 8)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const { error: uploadError } = await sb.storage
      .from(PG_BUCKET)
      .upload(filePath, uint8, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (uploadError) {
      return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);
    }

    const { data: urlData } = await sb.storage
      .from(PG_BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    return c.json({ url: urlData?.signedUrl || "", path: filePath });
  } catch (e) {
    console.log(`PG upload error: ${e}`);
    return c.json({ error: `Upload failed: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);