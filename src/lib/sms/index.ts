export interface SmsProvider {
  sendOtp(mobile: string, code: string): Promise<void>;
}

class ConsoleSms implements SmsProvider {
  async sendOtp(mobile: string, code: string) {
    console.log(`\n[SMS:console] OTP for ${mobile}: ${code}\n`);
  }
}

/** MSG91 OTP API. Requires a DLT-approved template whose OTP variable is ##OTP##. */
class Msg91Sms implements SmsProvider {
  constructor(private authKey: string, private templateId: string) {}

  async sendOtp(mobile: string, code: string) {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", this.templateId);
    url.searchParams.set("mobile", `91${mobile}`);
    url.searchParams.set("otp", code);
    const res = await fetch(url, { method: "POST", headers: { authkey: this.authKey } });
    if (!res.ok) throw new Error(`MSG91 error ${res.status}: ${await res.text()}`);
  }
}

export function getSmsProvider(): SmsProvider {
  if (process.env.SMS_PROVIDER === "msg91") {
    const key = process.env.MSG91_AUTH_KEY;
    const template = process.env.MSG91_TEMPLATE_ID;
    if (!key || !template) throw new Error("MSG91_AUTH_KEY and MSG91_TEMPLATE_ID must be set");
    return new Msg91Sms(key, template);
  }
  return new ConsoleSms();
}
