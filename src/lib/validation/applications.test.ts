import { describe, expect, it } from "vitest";
import { acceptApplicationSchema, applicationSchema } from "./applications";

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_COURSE_ID = "22222222-2222-4222-8222-222222222222";

function validApplication(overrides: Record<string, unknown> = {}) {
  return {
    full_name: "Ayesha Khan",
    email: "ayesha@example.com",
    phone: "+92 300 0000000",
    whatsapp: "",
    country: "Pakistan",
    school: "",
    level: "O",
    course_ids: [COURSE_ID],
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    heard_about: "",
    ...overrides,
  };
}

function firstErrorFor(field: string, input: Record<string, unknown>) {
  const parsed = applicationSchema.safeParse(input);
  if (parsed.success) return null;
  return parsed.error.issues.find((issue) => issue.path.join(".") === field)?.message ?? null;
}

describe("applicationSchema", () => {
  it("accepts a minimal valid application", () => {
    const parsed = applicationSchema.safeParse(validApplication());
    expect(parsed.success).toBe(true);
  });

  it("turns blank optional fields into null", () => {
    const parsed = applicationSchema.parse(validApplication());
    expect(parsed.whatsapp).toBeNull();
    expect(parsed.school).toBeNull();
    expect(parsed.guardian_name).toBeNull();
    expect(parsed.guardian_phone).toBeNull();
    expect(parsed.guardian_email).toBeNull();
    expect(parsed.heard_about).toBeNull();
  });

  it("trims the required fields", () => {
    const parsed = applicationSchema.parse(
      validApplication({ full_name: "  Ayesha Khan  ", email: "  ayesha@example.com  " }),
    );
    expect(parsed.full_name).toBe("Ayesha Khan");
    expect(parsed.email).toBe("ayesha@example.com");
  });

  it("keeps optional fields that were filled in", () => {
    const parsed = applicationSchema.parse(
      validApplication({ whatsapp: " +92 300 1111111 ", heard_about: " A friend " }),
    );
    expect(parsed.whatsapp).toBe("+92 300 1111111");
    expect(parsed.heard_about).toBe("A friend");
  });

  it("requires a full name", () => {
    expect(firstErrorFor("full_name", validApplication({ full_name: "   " }))).toBe(
      "Full name is required",
    );
  });

  it("requires a phone number", () => {
    expect(firstErrorFor("phone", validApplication({ phone: "" }))).toBe(
      "Phone number is required",
    );
  });

  it.each(["not-an-email", "missing@tld", "@example.com", ""])(
    "rejects the invalid email %o",
    (email) => {
      expect(firstErrorFor("email", validApplication({ email }))).toBeTruthy();
    },
  );

  it("rejects a guardian email that is present but invalid", () => {
    expect(firstErrorFor("guardian_email", validApplication({ guardian_email: "nope" }))).toBe(
      "Enter a valid email address",
    );
  });

  it("accepts an absent guardian email", () => {
    expect(applicationSchema.parse(validApplication({ guardian_email: "" })).guardian_email).toBeNull();
  });

  it("requires a country from the shared list", () => {
    expect(firstErrorFor("country", validApplication({ country: "Wakanda" }))).toBe(
      "Choose a country from the list",
    );
    expect(firstErrorFor("country", validApplication({ country: "" }))).toBe("Country is required");
    expect(applicationSchema.safeParse(validApplication({ country: "United Kingdom" })).success).toBe(
      true,
    );
  });

  it("requires a level of O or A", () => {
    expect(firstErrorFor("level", validApplication({ level: "AS" }))).toBe(
      "Choose O Level or A Level",
    );
    expect(applicationSchema.safeParse(validApplication({ level: "A" })).success).toBe(true);
  });

  it("requires at least one course", () => {
    expect(firstErrorFor("course_ids", validApplication({ course_ids: [] }))).toBe(
      "Choose at least one course",
    );
  });

  it("accepts several courses", () => {
    const parsed = applicationSchema.parse(
      validApplication({ course_ids: [COURSE_ID, OTHER_COURSE_ID] }),
    );
    expect(parsed.course_ids).toEqual([COURSE_ID, OTHER_COURSE_ID]);
  });

  it("rejects a course id that is not a uuid", () => {
    expect(applicationSchema.safeParse(validApplication({ course_ids: ["nope"] })).success).toBe(
      false,
    );
  });

  it("enforces the database length limits", () => {
    expect(firstErrorFor("full_name", validApplication({ full_name: "a".repeat(201) }))).toBe(
      "Full name must be 200 characters or fewer",
    );
    expect(firstErrorFor("heard_about", validApplication({ heard_about: "a".repeat(501) }))).toBe(
      "This must be 500 characters or fewer",
    );
    expect(
      firstErrorFor("email", validApplication({ email: `${"a".repeat(250)}@example.com` })),
    ).toBe("Email must be 255 characters or fewer");
  });
});

describe("acceptApplicationSchema", () => {
  const valid = { course_ids: [COURSE_ID], batch_id: "", password: "temp-pass-1" };

  it("accepts no batch as null", () => {
    expect(acceptApplicationSchema.parse(valid).batch_id).toBeNull();
  });

  it("keeps a chosen batch", () => {
    const parsed = acceptApplicationSchema.parse({ ...valid, batch_id: OTHER_COURSE_ID });
    expect(parsed.batch_id).toBe(OTHER_COURSE_ID);
  });

  it("requires at least one course", () => {
    const parsed = acceptApplicationSchema.safeParse({ ...valid, course_ids: [] });
    expect(parsed.success).toBe(false);
  });

  it("rejects a password below the minimum length", () => {
    const parsed = acceptApplicationSchema.safeParse({ ...valid, password: "short" });
    expect(parsed.success).toBe(false);
  });
});
