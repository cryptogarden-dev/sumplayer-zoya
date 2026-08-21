/**
 * Formatter tanggal Bahasa Indonesia (R24 - lokalisasi).
 */
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatTanggalIndonesia(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return dateFormatter.format(value);
}

export function formatTanggalWaktuIndonesia(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return dateTimeFormatter.format(value);
}
