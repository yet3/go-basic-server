package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/davidbyttow/govips/v2/vips"
)

type Tak struct {
}

func main() {
	vips.Startup(nil)
	defer vips.Shutdown()

	http.Handle("/", http.FileServer(http.Dir("./static/")))

	filesOptimizer := NewFilesOptimizer()

	http.Handle("POST /optimize-files", filesOptimizer)

	fmt.Println("Listening on port 8080")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
