// vite.config.js
import { defineConfig } from "file:///home/latz/coding/zoom/quiztimer4zoom/node_modules/vite/dist/node/index.js";
import { viteStaticCopy } from "file:///home/latz/coding/zoom/quiztimer4zoom/node_modules/vite-plugin-static-copy/dist/index.js";
import { ViteMinifyPlugin } from "file:///home/latz/coding/zoom/quiztimer4zoom/node_modules/vite-plugin-minify/dist/index.cjs";
import path from "path";
var __vite_injected_original_dirname = "/home/latz/coding/zoom/quiztimer4zoom";
var vite_config_default = defineConfig({
  build: {
    target: "node22",
    rollupOptions: {
      input: "api/index.js",
      output: {
        entryFileNames: `api/[name].js`,
        chunkFileNames: `api/[name].js`,
        assetFileNames: `api/[name].[ext]`
      }
    },
    assetsDir: "api",
    emptyOutDir: true
  },
  assetsInclude: ["**/images/**"],
  framework: "vite",
  plugins: [
    ViteMinifyPlugin({}),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__vite_injected_original_dirname, "quiztimer*"),
          dest: "./"
        },
        {
          src: path.resolve(__vite_injected_original_dirname, "images/*"),
          dest: "./images"
        },
        {
          src: path.resolve(__vite_injected_original_dirname, "scripts/*"),
          dest: "./scripts"
        },
        {
          src: path.resolve(__vite_injected_original_dirname, "api/quiztimer.html"),
          dest: "api/"
        }
      ]
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9sYXR6L2NvZGluZy96b29tL3F1aXp0aW1lcjR6b29tXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9sYXR6L2NvZGluZy96b29tL3F1aXp0aW1lcjR6b29tL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2xhdHovY29kaW5nL3pvb20vcXVpenRpbWVyNHpvb20vdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHsgdml0ZVN0YXRpY0NvcHkgfSBmcm9tICd2aXRlLXBsdWdpbi1zdGF0aWMtY29weSc7XHJcbmltcG9ydCB7IFZpdGVNaW5pZnlQbHVnaW4gfSBmcm9tICd2aXRlLXBsdWdpbi1taW5pZnknO1xyXG5cclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG5cdGJ1aWxkOiB7XHJcblx0XHR0YXJnZXQ6ICdub2RlMjInLFxyXG5cdFx0cm9sbHVwT3B0aW9uczoge1xyXG5cdFx0XHRpbnB1dDogJ2FwaS9pbmRleC5qcycsXHJcblx0XHRcdG91dHB1dDoge1xyXG5cdFx0XHRcdGVudHJ5RmlsZU5hbWVzOiBgYXBpL1tuYW1lXS5qc2AsXHJcblx0XHRcdFx0Y2h1bmtGaWxlTmFtZXM6IGBhcGkvW25hbWVdLmpzYCxcclxuXHRcdFx0XHRhc3NldEZpbGVOYW1lczogYGFwaS9bbmFtZV0uW2V4dF1gLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHRcdGFzc2V0c0RpcjogJ2FwaScsXHJcblx0XHRlbXB0eU91dERpcjogdHJ1ZSxcclxuXHR9LFxyXG5cdGFzc2V0c0luY2x1ZGU6IFsnKiovaW1hZ2VzLyoqJ10sXHJcblx0ZnJhbWV3b3JrOiAndml0ZScsXHJcblxyXG5cdHBsdWdpbnM6IFtcclxuXHRcdFZpdGVNaW5pZnlQbHVnaW4oe30pLFxyXG5cdFx0dml0ZVN0YXRpY0NvcHkoe1xyXG5cdFx0XHR0YXJnZXRzOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0c3JjOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAncXVpenRpbWVyKicpLFxyXG5cdFx0XHRcdFx0ZGVzdDogJy4vJyxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHNyYzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2ltYWdlcy8qJyksXHJcblx0XHRcdFx0XHRkZXN0OiAnLi9pbWFnZXMnLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0c3JjOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc2NyaXB0cy8qJyksXHJcblx0XHRcdFx0XHRkZXN0OiAnLi9zY3JpcHRzJyxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHNyYzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2FwaS9xdWl6dGltZXIuaHRtbCcpLFxyXG5cdFx0XHRcdFx0ZGVzdDogJ2FwaS8nLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF0sXHJcblx0XHR9KSxcclxuXHRdLFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFpUyxTQUFTLG9CQUFvQjtBQUM5VCxTQUFTLHNCQUFzQjtBQUMvQixTQUFTLHdCQUF3QjtBQUVqQyxPQUFPLFVBQVU7QUFKakIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDM0IsT0FBTztBQUFBLElBQ04sUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2QsT0FBTztBQUFBLE1BQ1AsUUFBUTtBQUFBLFFBQ1AsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsTUFDakI7QUFBQSxJQUNEO0FBQUEsSUFDQSxXQUFXO0FBQUEsSUFDWCxhQUFhO0FBQUEsRUFDZDtBQUFBLEVBQ0EsZUFBZSxDQUFDLGNBQWM7QUFBQSxFQUM5QixXQUFXO0FBQUEsRUFFWCxTQUFTO0FBQUEsSUFDUixpQkFBaUIsQ0FBQyxDQUFDO0FBQUEsSUFDbkIsZUFBZTtBQUFBLE1BQ2QsU0FBUztBQUFBLFFBQ1I7QUFBQSxVQUNDLEtBQUssS0FBSyxRQUFRLGtDQUFXLFlBQVk7QUFBQSxVQUN6QyxNQUFNO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxVQUNDLEtBQUssS0FBSyxRQUFRLGtDQUFXLFVBQVU7QUFBQSxVQUN2QyxNQUFNO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxVQUNDLEtBQUssS0FBSyxRQUFRLGtDQUFXLFdBQVc7QUFBQSxVQUN4QyxNQUFNO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxVQUNDLEtBQUssS0FBSyxRQUFRLGtDQUFXLG9CQUFvQjtBQUFBLFVBQ2pELE1BQU07QUFBQSxRQUNQO0FBQUEsTUFDRDtBQUFBLElBQ0QsQ0FBQztBQUFBLEVBQ0Y7QUFDRCxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
