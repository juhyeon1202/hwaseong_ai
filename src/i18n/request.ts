import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const locales = ["ko", "en", "zh", "ja"] as const;
export type AppLocale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requestedLocale = cookieStore.get("app_locale")?.value;
  const locale = locales.includes(requestedLocale as AppLocale)
    ? (requestedLocale as AppLocale)
    : "ko";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
