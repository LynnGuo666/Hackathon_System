package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"hackathon-system/backend/internal/app"
	"hackathon-system/backend/internal/store"
)

func main() {
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "./hackathon.sqlite"
	}
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8080"
	}

	sqliteStore, err := store.NewSQLiteStore(dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer sqliteStore.Close()

	adminToken := os.Getenv("ADMIN_TOKEN")
	service := app.NewService(sqliteStore)
	server := app.NewServer(service, adminToken)
	handler := server.Handler()
	if staticDir := os.Getenv("STATIC_DIR"); staticDir != "" {
		handler = app.WithStaticFrontend(handler, staticDir)
	} else if _, err := os.Stat(filepath.Join("..", "frontend", "out")); err == nil {
		handler = app.WithStaticFrontend(handler, filepath.Join("..", "frontend", "out"))
	}

	log.Printf("hackathon API listening on %s, sqlite=%s", addr, dbPath)
	log.Fatal(http.ListenAndServe(addr, handler))
}
