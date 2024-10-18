package main

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"log"

	"net/http"

	"github.com/davidbyttow/govips/v2/vips"
)

const REQ_BODY_SIZE = 50 << 20

type FilesOptimizer struct {
	http.Handler
}

func NewFilesOptimizer() *FilesOptimizer {
	return &FilesOptimizer{}
}

type Item struct {
	Id       string
	Bytes    []byte
	Name     string
	GoalType string
}

type ItemResult struct {
	bytes    []byte
	fileName string
	fileType string
}

func exportItem(item Item, ch chan<- ItemResult, w http.ResponseWriter) {
	image, err := vips.NewImageFromBuffer(item.Bytes)
	if err != nil {
		http.Error(w, "Error creating image buffer", http.StatusInternalServerError)
		return
	}

	var params *vips.ExportParams
	var fileExt string
	switch item.GoalType {
	case "image/png":
		params = vips.NewDefaultPNGExportParams()
		fileExt = "png"
		break
	case "image/jpeg":
		params = vips.NewDefaultJPEGExportParams()
		fileExt = "jpg"
		break
	case "image/webp":
		params = vips.NewDefaultWEBPExportParams()
		fileExt = "webp"
		break
	default:
		params = vips.NewDefaultExportParams()
	}

	imgBytes, _, err := image.Export(params)

	if err != nil {
		http.Error(w, "Error exporting image", http.StatusInternalServerError)
		return
	}

	ch <- ItemResult{
		bytes:    imgBytes,
		fileName: fmt.Sprintf("%s.%s", item.Name, fileExt),
		fileType: item.GoalType,
	}
}

func (fo *FilesOptimizer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, REQ_BODY_SIZE)

	var items []Item

	err := json.NewDecoder(r.Body).Decode(&items)

	if err != nil {
		log.Fatalln(err)
	}

	itemsCh := make(chan ItemResult, len(items))
	defer close(itemsCh)

	for _, item := range items {
		go exportItem(item, itemsCh, w)
	}

	zipWriter := zip.NewWriter(w)
	defer zipWriter.Close()

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", "optimized.zip"))

	for range items {
		result := <-itemsCh
		writer, err := zipWriter.Create(result.fileName)

		if err != nil {
			http.Error(w, "Error creating zip entry", http.StatusInternalServerError)
			return
		}

		_, err = writer.Write(result.bytes)
		if err != nil {
			http.Error(w, "Error writing file to zip", http.StatusInternalServerError)
			return
		}
	}
}
