declare module 'cookie-parser';
declare module 'disposable-email-domains' {
  const disposableEmailDomains:
    | string[]
    | { default?: string[]; domains?: string[] };
  export default disposableEmailDomains;
}
