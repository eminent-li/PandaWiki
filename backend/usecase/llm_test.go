package usecase

import (
	"testing"

	"github.com/cloudwego/eino/schema"
)

func TestBuildUserMessageWithImages(t *testing.T) {
	u := &LLMUsecase{}
	msg := u.buildUserMessageWithImages("看下这张图", []string{"/static-file/demo.png"}, "https://demo.example.com")

	if msg.Role != schema.User {
		t.Fatalf("unexpected role: %s", msg.Role)
	}
	if msg.Content != "看下这张图" {
		t.Fatalf("unexpected content: %q", msg.Content)
	}
	if len(msg.UserInputMultiContent) != 2 {
		t.Fatalf("unexpected part count: %d", len(msg.UserInputMultiContent))
	}
	if msg.UserInputMultiContent[0].Type != schema.ChatMessagePartTypeText {
		t.Fatalf("unexpected first part type: %s", msg.UserInputMultiContent[0].Type)
	}
	if msg.UserInputMultiContent[1].Type != schema.ChatMessagePartTypeImageURL {
		t.Fatalf("unexpected second part type: %s", msg.UserInputMultiContent[1].Type)
	}
	if msg.UserInputMultiContent[1].Image == nil || msg.UserInputMultiContent[1].Image.URL == nil {
		t.Fatal("image url should not be nil")
	}
	if got := *msg.UserInputMultiContent[1].Image.URL; got != "https://demo.example.com/static-file/demo.png" {
		t.Fatalf("unexpected image url: %q", got)
	}
}

func TestBuildUserMessageWithImages_ImageOnly(t *testing.T) {
	u := &LLMUsecase{}
	msg := u.buildUserMessageWithImages("", []string{"/static-file/demo.png"}, "https://demo.example.com/")

	if msg.Content != "" {
		t.Fatalf("unexpected content: %q", msg.Content)
	}
	if len(msg.UserInputMultiContent) != 1 {
		t.Fatalf("unexpected part count: %d", len(msg.UserInputMultiContent))
	}
	if msg.UserInputMultiContent[0].Type != schema.ChatMessagePartTypeImageURL {
		t.Fatalf("unexpected part type: %s", msg.UserInputMultiContent[0].Type)
	}
}

func TestBuildAbsoluteStaticFileURL(t *testing.T) {
	tests := []struct {
		name    string
		baseURL string
		path    string
		want    string
	}{
		{name: "absolute path", baseURL: "https://demo.example.com", path: "/static-file/demo.png", want: "https://demo.example.com/static-file/demo.png"},
		{name: "already absolute", baseURL: "https://demo.example.com", path: "https://cdn.example.com/demo.png", want: "https://cdn.example.com/demo.png"},
		{name: "missing base url", path: "/static-file/demo.png", want: "/static-file/demo.png"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := buildAbsoluteStaticFileURL(tt.baseURL, tt.path); got != tt.want {
				t.Fatalf("unexpected url: got %q want %q", got, tt.want)
			}
		})
	}
}
