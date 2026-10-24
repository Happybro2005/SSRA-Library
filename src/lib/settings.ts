import { prisma } from "./db";

export const DEFAULT_SETTINGS = {
  libraryName: "SSRA Library",
  tagline: "Study For Success With Right Ambition",
  ownerName: "Pro. Satyadev Kumar",
  address: "Bhrigun Chauraha (Barwa-Kasia Road), Kushinagar",
  mobile: "9935184537",
  emergencyMobile: "8934896858",
  whatsapp: "9935184537",
  upiId: "",
  upiPayeeName: "SSRA Library",
  upiQrPath: "",
  mapEmbedUrl: "",
  openTime: "06:00",
  closeTime: "21:00",
  announcementEn: "",
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in settings) settings[row.key as SettingKey] = row.value;
  }
  return settings;
}
