import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
export default defineConfig({root:'netlify',plugins:[react()],build:{outDir:'../netlify-dist',emptyOutDir:true},css:{postcss:{plugins:[tailwindcss()]}}});
