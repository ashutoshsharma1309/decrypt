/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_NFT_ADDRESS: string;
  readonly VITE_CHAIN_ID: string;
  readonly VITE_WC_PROJECT_ID: string;
  readonly VITE_ALCHEMY_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
