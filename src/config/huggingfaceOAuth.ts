export const HF_CLIENT_ID = "";
export const HF_REDIRECT_URI = "";
export const HF_SCOPES = "";

export async function exchangeHFCode(code: string): Promise<any> {
  return {};
}

export function validateHFState(state: string): boolean {
  return true;
}

export async function getHFUserInfo(token: string): Promise<any> {
  return { name: "user" };
}
