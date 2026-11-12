export const inr = (paise: number) =>
  "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const discountPct = (price: number, compare: number) =>
  compare > price ? Math.round(((compare - price) / compare) * 100) : 0;

// Dates are always shown in Indian time, whatever time zone the server or the visitor's device uses.
const TZ = "Asia/Kolkata";
export const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("en-IN", { timeZone: TZ });
export const fmtDateTime = (d: Date | string) => new Date(d).toLocaleString("en-IN", { timeZone: TZ });
