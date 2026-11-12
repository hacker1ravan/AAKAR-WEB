// The "couriers" setting has one courier per line. Add a tracking link after a bar to get automatic links:
//   Delhivery | https://example.com/track?awb={awb}
// (Copy the link from your courier's tracking page and replace the number with {awb}.)
export type Courier = { name: string; template: string };

export function parseCouriers(text: string): Courier[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("|");
      return i === -1 ? { name: l, template: "" } : { name: l.slice(0, i).trim(), template: l.slice(i + 1).trim() };
    })
    .filter((c) => c.name);
}

export function trackingLink(couriersText: string, courier: string, awb: string) {
  const c = parseCouriers(couriersText).find((x) => x.name.toLowerCase() === courier.trim().toLowerCase());
  if (!c?.template || !awb.trim() || !/^https?:\/\//.test(c.template)) return "";
  return c.template.replace(/\{awb\}/g, encodeURIComponent(awb.trim()));
}

// Used by the settings form: every link must be https and contain {awb}
export function couriersProblem(text: string) {
  for (const c of parseCouriers(text)) {
    if (c.template && (!/^https:\/\//.test(c.template) || !c.template.includes("{awb}")))
      return `${c.name}: the tracking link must start with https:// and contain {awb}`;
  }
  return "";
}
