/// <reference types="@panda-wiki/themes/types" />

declare module '@cap.js/widget' {
  interface CapOptions {
    apiEndpoint: string;
  }

  class Cap {
    constructor(options: CapOptions);
    solve(): Promise<{ token: string }>;
  }

  export default Cap;
}

declare module 'react-syntax-highlighter' {
  const SyntaxHighlighter: any;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/hljs' {
  export const anOldHope: any;
}

declare global {
  interface Window {
    _BASE_PATH_?: string;
  }
}

export {};
