export type ToyRecordAction =
  | "url"
  | "text"
  | "app"
  | "email"
  | "phone"
  | "sms"
  | "geo"
  | "contact"
  | "calendar";

export interface ToyRecordFieldDefinition {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "email" | "url" | "tel" | "textarea" | "datetime-local";
  optional?: boolean;
}

export interface ToyRecordActionDefinition {
  id: ToyRecordAction;
  label: string;
  description: string;
  fields: ToyRecordFieldDefinition[];
}

export interface ToyRecordWriteRequest {
  action: ToyRecordAction;
  fields: Record<string, string>;
}

const ACTIONS: ToyRecordActionDefinition[] = [
  {
    id: "url",
    label: "Open Website",
    description: "Open a normal web page when the wand is tapped.",
    fields: [
      {
        key: "url",
        label: "Website URL",
        placeholder: "https://example.org/magic",
        type: "url",
      },
    ],
  },
  {
    id: "text",
    label: "Show Message",
    description: "Display a short magical note on compatible devices.",
    fields: [
      {
        key: "text",
        label: "Message",
        placeholder: "The wand chooses you.",
        type: "textarea",
      },
    ],
  },
  {
    id: "app",
    label: "Open App Link",
    description: "Launch a custom deep link like spotify:, discord:, or app://.",
    fields: [
      {
        key: "uri",
        label: "App URI",
        placeholder: "spotify:playlist:37i9dQZF1DX4WYpdgoIcn6",
      },
    ],
  },
  {
    id: "email",
    label: "Compose Email",
    description: "Prepare an email to a chosen address with subject and body.",
    fields: [
      {
        key: "to",
        label: "To",
        placeholder: "owlpost@example.org",
        type: "email",
      },
      {
        key: "subject",
        label: "Subject",
        placeholder: "Message from my magic wand",
        optional: true,
      },
      {
        key: "body",
        label: "Body",
        placeholder: "Hello from the hunt!",
        type: "textarea",
        optional: true,
      },
    ],
  },
  {
    id: "phone",
    label: "Call Number",
    description: "Dial a phone number directly from the tap.",
    fields: [
      {
        key: "number",
        label: "Phone number",
        placeholder: "+45 12 34 56 78",
        type: "tel",
      },
    ],
  },
  {
    id: "sms",
    label: "Text Message",
    description: "Open a text message draft to a chosen number.",
    fields: [
      {
        key: "number",
        label: "Phone number",
        placeholder: "+45 12 34 56 78",
        type: "tel",
      },
      {
        key: "body",
        label: "Message",
        placeholder: "Meet me at the next magic spot!",
        type: "textarea",
        optional: true,
      },
    ],
  },
  {
    id: "geo",
    label: "Open Map Pin",
    description: "Jump to coordinates in a mapping app.",
    fields: [
      {
        key: "latitude",
        label: "Latitude",
        placeholder: "55.6761",
      },
      {
        key: "longitude",
        label: "Longitude",
        placeholder: "12.5683",
      },
      {
        key: "label",
        label: "Place label",
        placeholder: "Secret meetup point",
        optional: true,
      },
    ],
  },
  {
    id: "contact",
    label: "Share Contact",
    description: "Write a vCard so the wand can share a person or project contact.",
    fields: [
      {
        key: "name",
        label: "Name",
        placeholder: "Luna Spellcaster",
      },
      {
        key: "phone",
        label: "Phone",
        placeholder: "+45 12 34 56 78",
        type: "tel",
        optional: true,
      },
      {
        key: "email",
        label: "Email",
        placeholder: "luna@example.org",
        type: "email",
        optional: true,
      },
      {
        key: "organization",
        label: "Organization",
        placeholder: "Tryllestavsprojekt",
        optional: true,
      },
      {
        key: "url",
        label: "Website",
        placeholder: "https://example.org",
        type: "url",
        optional: true,
      },
      {
        key: "note",
        label: "Note",
        placeholder: "Guardian contact for lost wand.",
        type: "textarea",
        optional: true,
      },
    ],
  },
  {
    id: "calendar",
    label: "Calendar Event",
    description: "Create a calendar invitation from the wand.",
    fields: [
      {
        key: "title",
        label: "Event title",
        placeholder: "Treasure hunt meetup",
      },
      {
        key: "start",
        label: "Starts",
        placeholder: "",
        type: "datetime-local",
      },
      {
        key: "end",
        label: "Ends",
        placeholder: "",
        type: "datetime-local",
      },
      {
        key: "location",
        label: "Location",
        placeholder: "City fountain",
        optional: true,
      },
      {
        key: "description",
        label: "Description",
        placeholder: "Bring your wand and your sharpest clues.",
        type: "textarea",
        optional: true,
      },
    ],
  },
];

export const TOYBOX_ACTIONS = ACTIONS;

function getTrimmedField(
  fields: Record<string, string>,
  key: string,
  required = false,
): string {
  const value = (fields[key] ?? "").trim();
  if (required && !value) {
    throw new Error("Please fill in all required fields.");
  }
  return value;
}

function requireHttpUrl(raw: string): string {
  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Please enter a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL must start with http:// or https://");
  }

  return parsed.toString();
}

function requireAbsoluteUri(raw: string): string {
  const value = raw.trim();

  if (!/^[A-Za-z][A-Za-z\d+.-]*:/.test(value)) {
    throw new Error("Please enter a valid app URI like spotify: or app://");
  }

  return value;
}

function normalizePhoneNumber(raw: string): string {
  const cleaned = raw.replace(/[()\s-]/g, "");
  if (!/^\+?[0-9]+$/.test(cleaned)) {
    throw new Error("Please enter a valid phone number.");
  }
  return cleaned;
}

function requireEmail(raw: string): string {
  const value = raw.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("Please enter a valid email address.");
  }
  return value;
}

function requireCoordinate(raw: string, name: string): string {
  const value = raw.trim();
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`Please enter a valid ${name}.`);
  }

  return numberValue.toString();
}

function encodeTextPayload(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function escapeICalText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcsDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Please choose valid calendar dates.");
  }

  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildMailtoUri(
  to: string,
  subject: string,
  body: string,
): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);

  const query = params.toString();
  return `mailto:${encodeURIComponent(to)}${query ? `?${query}` : ""}`;
}

function buildSmsUri(number: string, body: string): string {
  const query = body ? `?body=${encodeURIComponent(body)}` : "";
  return `sms:${number}${query}`;
}

function buildGeoUri(latitude: string, longitude: string, label: string): string {
  const coordinates = `${latitude},${longitude}`;

  if (!label) {
    return `geo:${coordinates}`;
  }

  return `geo:${coordinates}?q=${encodeURIComponent(`${coordinates} (${label})`)}`;
}

function buildVCard(fields: Record<string, string>): ArrayBuffer {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(getTrimmedField(fields, "name", true))}`,
  ];

  const phone = getTrimmedField(fields, "phone");
  const email = getTrimmedField(fields, "email");
  const organization = getTrimmedField(fields, "organization");
  const url = getTrimmedField(fields, "url");
  const note = getTrimmedField(fields, "note");

  if (phone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCardValue(normalizePhoneNumber(phone))}`);
  }
  if (email) {
    lines.push(`EMAIL:${escapeVCardValue(requireEmail(email))}`);
  }
  if (organization) {
    lines.push(`ORG:${escapeVCardValue(organization)}`);
  }
  if (url) {
    lines.push(`URL:${escapeVCardValue(requireHttpUrl(url))}`);
  }
  if (note) {
    lines.push(`NOTE:${escapeVCardValue(note)}`);
  }

  lines.push("END:VCARD");
  return encodeTextPayload(lines.join("\r\n"));
}

function buildCalendarInvite(fields: Record<string, string>): ArrayBuffer {
  const title = getTrimmedField(fields, "title", true);
  const start = getTrimmedField(fields, "start", true);
  const end = getTrimmedField(fields, "end", true);
  const location = getTrimmedField(fields, "location");
  const description = getTrimmedField(fields, "description");

  const startIso = new Date(start);
  const endIso = new Date(end);
  if (Number.isNaN(startIso.getTime()) || Number.isNaN(endIso.getTime())) {
    throw new Error("Please choose valid calendar dates.");
  }
  if (endIso <= startIso) {
    throw new Error("Calendar end time must be after the start time.");
  }

  const stamp = toIcsDateTime(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tryllestavsprojekt//Toybox//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@tryllestavsprojekt`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsDateTime(start)}`,
    `DTEND:${toIcsDateTime(end)}`,
    `SUMMARY:${escapeICalText(title)}`,
  ];

  if (location) {
    lines.push(`LOCATION:${escapeICalText(location)}`);
  }
  if (description) {
    lines.push(`DESCRIPTION:${escapeICalText(description)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return encodeTextPayload(lines.join("\r\n"));
}

export function createEmptyToyRecordFields(
  action: ToyRecordAction,
): Record<string, string> {
  const definition = ACTIONS.find((entry) => entry.id === action);
  if (!definition) {
    return {};
  }

  return Object.fromEntries(definition.fields.map((field) => [field.key, ""]));
}

export function buildToyRecord(request: ToyRecordWriteRequest): NDEFRecordInit {
  switch (request.action) {
    case "url":
      return {
        recordType: "url",
        data: requireHttpUrl(getTrimmedField(request.fields, "url", true)),
      };
    case "text":
      return {
        recordType: "text",
        data: getTrimmedField(request.fields, "text", true),
      };
    case "app":
      return {
        recordType: "url",
        data: requireAbsoluteUri(getTrimmedField(request.fields, "uri", true)),
      };
    case "email": {
      const to = requireEmail(getTrimmedField(request.fields, "to", true));
      const subject = getTrimmedField(request.fields, "subject");
      const body = getTrimmedField(request.fields, "body");
      return {
        recordType: "url",
        data: buildMailtoUri(to, subject, body),
      };
    }
    case "phone":
      return {
        recordType: "url",
        data: `tel:${normalizePhoneNumber(
          getTrimmedField(request.fields, "number", true),
        )}`,
      };
    case "sms":
      return {
        recordType: "url",
        data: buildSmsUri(
          normalizePhoneNumber(getTrimmedField(request.fields, "number", true)),
          getTrimmedField(request.fields, "body"),
        ),
      };
    case "geo":
      return {
        recordType: "url",
        data: buildGeoUri(
          requireCoordinate(getTrimmedField(request.fields, "latitude", true), "latitude"),
          requireCoordinate(
            getTrimmedField(request.fields, "longitude", true),
            "longitude",
          ),
          getTrimmedField(request.fields, "label"),
        ),
      };
    case "contact":
      return {
        recordType: "mime",
        mediaType: "text/vcard",
        data: buildVCard(request.fields),
      };
    case "calendar":
      return {
        recordType: "mime",
        mediaType: "text/calendar",
        data: buildCalendarInvite(request.fields),
      };
    default:
      throw new Error("Unsupported record 1 action.");
  }
}
