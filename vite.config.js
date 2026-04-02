import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { vpcrTagger } from 'vpcr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), vpcrTagger({
      prefix: "data-ref",
      enabled: true,
      basePath: "src",
      editor: "cursor", // 'cursor' | 'vscode' | 'webstorm'
      include: [".tsx", ".jsx"],
      exclude: ["node_modules", "main.tsx"],
      attributes: ['id', 'name', 'path', 'line', 'file'],
      shouldTag: (componentName, filePath) => {
        return !componentName.startsWith('Internal');
      },
      openInEditor: (filePath, line) => {
        console.log(`Opening ${filePath} at line ${line}`);
      }
    })],
})
