import { getRequestConfig } from "next-intl/server";
import messages from "../../messages/en.json";

// The site is English only; next-intl is kept so all text stays in messages/en.json.
export default getRequestConfig(async () => ({
  locale: "en",
  messages,
  timeZone: "Asia/Kolkata",
}));
