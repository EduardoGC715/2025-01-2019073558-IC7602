export interface JwtPayload {
  user?: string;
  domain?: string;
  apiKey?: string;
  sessionId: string;
  type: "user" | "apiKey";
}
