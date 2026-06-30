interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Se você tiver outras variáveis no futuro, adicione-as aqui embaixo:
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}