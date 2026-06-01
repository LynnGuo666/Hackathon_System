package app

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func WithStaticFrontend(api http.Handler, dir string) http.Handler {
	files := http.FileServer(http.Dir(dir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			api.ServeHTTP(w, r)
			return
		}
		path := filepath.Join(dir, filepath.Clean(r.URL.Path))
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			files.ServeHTTP(w, r)
			return
		}
		indexPath := filepath.Join(dir, strings.Trim(r.URL.Path, "/"), "index.html")
		if info, err := os.Stat(indexPath); err == nil && !info.IsDir() {
			http.ServeFile(w, r, indexPath)
			return
		}
		http.ServeFile(w, r, filepath.Join(dir, "index.html"))
	})
}
