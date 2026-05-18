/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_DEPLOY_SHA?: string;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}

interface Window {
  __SITE_RUNTIME__?: import('./lib/siteRuntime').ReturnType<
    typeof import('./lib/siteRuntime').generateRuntimePayload
  >;
}
