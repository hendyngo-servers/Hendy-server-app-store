export const SECRET_KEYS = [
  "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID", "GITHUB_TOKEN",
  "GITHUB_OWNER", "GITHUB_REPO", "GITHUB_WEBHOOK_SECRET", "R2_BUCKET_NAME", "R2_PUBLIC_BASE_URL",
  "SIGNED_URL_SECRET", "ADMIN_EMAIL_ALLOWLIST", "CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD", "JWT_SECRET",
  "ANDROID_KEYSTORE_B64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD",
  "IOS_CERTIFICATE_B64", "IOS_CERTIFICATE_PASSWORD", "IOS_BUNDLE_ID", "APPLE_TEAM_ID",
  "WINDOWS_PFX_B64", "WINDOWS_PFX_PASSWORD", "MACOS_CERTIFICATE_B64", "MACOS_CERTIFICATE_PASSWORD"
] as const;

export type SecretKey = typeof SECRET_KEYS[number];
export type SecretInput = Partial<Record<SecretKey, string>>;

export const SECRET_METADATA: ReadonlyArray<{ key: SecretKey; label: string; sensitive: boolean; group: string }> = [
  {key:"CLOUDFLARE_ACCOUNT_ID",label:"Cloudflare Account ID",sensitive:false,group:"Cloudflare"},
  {key:"CLOUDFLARE_API_TOKEN",label:"Cloudflare API Token",sensitive:true,group:"Cloudflare"},
  {key:"CLOUDFLARE_ZONE_ID",label:"Cloudflare Zone ID",sensitive:false,group:"Cloudflare"},
  {key:"GITHUB_TOKEN",label:"GitHub Personal Access Token",sensitive:true,group:"GitHub"},
  {key:"GITHUB_OWNER",label:"GitHub Owner/Organization",sensitive:false,group:"GitHub"},
  {key:"GITHUB_REPO",label:"GitHub Repository",sensitive:false,group:"GitHub"},
  {key:"GITHUB_WEBHOOK_SECRET",label:"Webhook Secret",sensitive:true,group:"GitHub"},
  {key:"R2_BUCKET_NAME",label:"R2 Bucket Name",sensitive:false,group:"Storage"},
  {key:"R2_PUBLIC_BASE_URL",label:"Public Base URL (optional)",sensitive:false,group:"Storage"},
  {key:"SIGNED_URL_SECRET",label:"Signed URL HMAC Secret",sensitive:true,group:"Storage"},
  {key:"ADMIN_EMAIL_ALLOWLIST",label:"Admin Email Allowlist",sensitive:true,group:"Access"},
  {key:"CF_ACCESS_TEAM_DOMAIN",label:"Cloudflare Access Team Domain",sensitive:false,group:"Access"},
  {key:"CF_ACCESS_AUD",label:"Cloudflare Access Application AUD",sensitive:false,group:"Access"},
  {key:"JWT_SECRET",label:"Internal JWT Secret (optional)",sensitive:true,group:"Access"},
  {key:"ANDROID_KEYSTORE_B64",label:"Android Keystore Base64",sensitive:true,group:"Signing"},
  {key:"ANDROID_KEYSTORE_PASSWORD",label:"Android Keystore Password",sensitive:true,group:"Signing"},
  {key:"ANDROID_KEY_ALIAS",label:"Android Key Alias",sensitive:false,group:"Signing"},
  {key:"ANDROID_KEY_PASSWORD",label:"Android Key Password",sensitive:true,group:"Signing"},
  {key:"IOS_CERTIFICATE_B64",label:"iOS Certificate/Exported P12 Base64",sensitive:true,group:"Signing"},
  {key:"IOS_CERTIFICATE_PASSWORD",label:"iOS Certificate Password",sensitive:true,group:"Signing"},
  {key:"IOS_BUNDLE_ID",label:"iOS Bundle ID",sensitive:false,group:"Signing"},
  {key:"APPLE_TEAM_ID",label:"Apple Developer Team ID",sensitive:false,group:"Signing"},
  {key:"WINDOWS_PFX_B64",label:"Windows PFX Base64",sensitive:true,group:"Signing"},
  {key:"WINDOWS_PFX_PASSWORD",label:"Windows PFX Password",sensitive:true,group:"Signing"},
  {key:"MACOS_CERTIFICATE_B64",label:"macOS Certificate Base64",sensitive:true,group:"Signing"},
  {key:"MACOS_CERTIFICATE_PASSWORD",label:"macOS Certificate Password",sensitive:true,group:"Signing"}
];
