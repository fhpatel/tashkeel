"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, Languages, Image as ImageIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [transcribedText, setTranscribedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setTranscribedText("");
      setTranslatedText("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxFiles: 1,
  });

  const handleTranscribe = async () => {
    if (!image) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription failed");

      const data = await response.json();
      setTranscribedText(data.text);
      toast({
        title: "Success",
        description: "Text has been transcribed successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to transcribe the image",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!transcribedText) return;

    setIsTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: transcribedText }),
      });

      if (!response.ok) throw new Error("Translation failed");

      const data = await response.json();
      setTranslatedText(data.translation);
      toast({
        title: "Success",
        description: "Text has been translated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to translate the text",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Arabic OCR & Translation</h1>
          <p className="text-muted-foreground">
            Upload an image containing Arabic text to transcribe and translate it
          </p>
        </div>

        <Card className="p-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
          >
            <input {...getInputProps()} />
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Drag & drop an image here, or click to select
            </p>
          </div>

          {preview && (
            <div className="mt-6 space-y-4">
              <img
                src={preview}
                alt="Preview"
                className="mx-auto max-h-[300px] rounded-lg object-contain"
              />
              <Button
                onClick={handleTranscribe}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Transcribe Text
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>

        {transcribedText && (
          <Card className="p-8 space-y-4">
            <h2 className="text-2xl font-semibold">Transcribed Text</h2>
            <p className="text-xl font-arabic leading-relaxed text-right" dir="rtl">
              {transcribedText}
            </p>
            <Separator className="my-4" />
            <Button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="w-full"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Languages className="mr-2 h-4 w-4" />
                  Translate to English
                </>
              )}
            </Button>
          </Card>
        )}

        {translatedText && (
          <Card className="p-8 space-y-4">
            <h2 className="text-2xl font-semibold">English Translation</h2>
            <p className="text-lg leading-relaxed">{translatedText}</p>
          </Card>
        )}
      </div>
    </main>
  );
}