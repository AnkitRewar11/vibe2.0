"use client";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import WebPageTools from "./WebPageTools";
import ElementSettingSection from "./ElementSettingSection";
import ImageSettingSection from "./ImageSettingSection";
import { OnSaveContext } from "@/context/OnSaveContex";
import axios from "axios";
import { toast } from "sonner";
import { useParams, useSearchParams } from "next/navigation";

/**
 * Helper: decode common escaped responses from AI
 */
function decodeGeneratedCode(input?: string) {
  if (!input) return "";

  let s = input.trim();

  // if it's a JSON-quoted string, try parse
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed === "string") s = parsed;
    } catch { }
  }

  // if it's a JSON object with an html property, try extract
  if (s.startsWith("{") && s.endsWith("}")) {
    try {
      const obj = JSON.parse(s);
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === "string" && obj[k].includes("<")) {
          s = obj[k];
          break;
        }
      }
    } catch { }
  }

  // unescape common sequences
  s = s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'");
  s = s.replace(/\\\//g, "/");

  // remove triple backticks if present
  if (s.includes("```")) s = s.replace(/```(?:html)?/g, "");

  return s.trim();
}

type Props = {
  generatedCode: string;
};

export default function WebSiteDesign({ generatedCode }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [selectedScreenSize, setSelectedScreenSize] = useState<"web" | "mobile">("web");
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const { onSaveData, setOnSaveData } = useContext(OnSaveContext) ?? {};
  const params = useSearchParams();
  const { projectId } = useParams() as { projectId?: string };
  const frameId = params?.get("frameId") ?? "";

  // decode once per generatedCode change
  const decodedHTML = useMemo(() => decodeGeneratedCode(generatedCode), [generatedCode]);

  // Initialize iframe shell once (loads CDN scripts/styles into iframe)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument;
      if (!doc) return;

      doc.open();
      doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>AI Website Preview</title>

  <!-- Tailwind CDN -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Flowbite -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.css" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.js"></script>

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">

  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

  <!-- AOS -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js"></script>

  <!-- GSAP -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>

  <!-- Lottie -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.11.2/lottie.min.js"></script>

  <!-- Swiper -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js"></script>

  <!-- Tippy.js -->
  <link rel="stylesheet" href="https://unpkg.com/tippy.js@6/dist/tippy.css" />
  <script src="https://unpkg.com/@popperjs/core@2"></script>
  <script src="https://unpkg.com/tippy.js@6"></script>

  <style>
    html,body{height:100%;margin:0;padding:0;font-family:Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial;color:#111}
  </style>
</head>
<body id="root" class="bg-white text-gray-900"></body>
</html>`);
      doc.close();
      // runs only once on mount
      console.log("iframe shell written");
    } catch (err) {
      console.error("Failed to write iframe shell:", err);
    }
  }, []);

  // Helper: wait-for-root then inject
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return;

    const contentToInject = decodedHTML || "<div style='padding:24px'>No preview available</div>";

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 200; // ~6 seconds with 30ms retry

    const tryInject = () => {
      if (cancelled) return;
      attempts++;
      const root = doc.getElementById("root");
      if (!root) {
        if (attempts > maxAttempts) {
          console.error("iframe root not found after retries; aborting injection.");
          // fallback: try to set body if present
          if (doc.body) {
            try {
              doc.body.innerHTML = contentToInject;
              console.log("Injected into body as fallback (no #root).");
            } catch (e) {
              console.error("Fallback body injection failed:", e);
            }
          }
          return;
        }
        // wait then retry
        return setTimeout(tryInject, 30);
      }

      try {
        // If injected content is a full HTML string (contains <html>), try to extract body content
        let htmlToSet = contentToInject;
        if (/^\s*<!doctype/i.test(contentToInject) || /<html[\s\S]*>/i.test(contentToInject)) {
          try {
            const parser = new DOMParser();
            const parsed = parser.parseFromString(contentToInject, "text/html");
            const parsedRoot = parsed.getElementById("root");
            if (parsedRoot) {
              htmlToSet = parsedRoot.innerHTML;
            } else {
              htmlToSet = parsed.body?.innerHTML ?? contentToInject;
            }
          } catch (err) {
            console.warn("DOMParser failed inside iframe injection, using raw content", err);
            htmlToSet = contentToInject;
          }
        }

        root.innerHTML = htmlToSet;
        console.log("Injected HTML into iframe #root (len:", String(htmlToSet.length) + ")");
      } catch (e) {
        console.error("Failed to inject HTML into iframe:", e);
      }

      // try to init some common libs inside iframe if available
      try {
        if ((win as any).AOS && typeof (win as any).AOS.init === "function") {
          (win as any).AOS.init();
        }
      } catch (e) {
        // ignore
      }
    };

    // start trying
    tryInject();

    return () => {
      cancelled = true;
    };
  }, [decodedHTML]);

  // --- in-iframe interactive selection/editing ---
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return;

    let hoverEl: HTMLElement | null = null;
    let selectedEl: HTMLElement | null = null;

    const isEditableElement = (el: HTMLElement | null) => {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (["html", "head", "body", "script", "style", "link", "meta"].includes(tag)) return false;
      if (el.closest && el.closest("[data-no-edit]")) return false;
      return true;
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (selectedEl) return;
      const target = e.target as HTMLElement;
      if (!isEditableElement(target)) return;
      if (hoverEl && hoverEl !== target) {
        hoverEl.style.outline = "";
      }
      hoverEl = target;
      hoverEl.style.outline = "2px dotted blue";
    };

    const handleMouseOut = () => {
      if (selectedEl) return;
      if (hoverEl) {
        hoverEl.style.outline = "";
        hoverEl = null;
      }
    };

    const onSelectedBlur = () => {
      if (selectedEl) {
        selectedEl.style.outline = "";
        selectedEl.removeAttribute("contenteditable");
        selectedEl.removeEventListener("blur", onSelectedBlur);
        selectedEl = null;
      }
    };

    const handleClick = (e: MouseEvent) => {
      // allow ctrl/cmd clicks to open links naturally
      if ((e as any).metaKey || (e as any).ctrlKey) return;

      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (!isEditableElement(target)) return;

      if (selectedEl && selectedEl !== target) {
        selectedEl.style.outline = "";
        selectedEl.removeAttribute("contenteditable");
        selectedEl.removeEventListener("blur", onSelectedBlur);
      }

      selectedEl = target;
      selectedEl.style.outline = "2px solid red";
      selectedEl.setAttribute("contenteditable", "true");
      setSelectedElement(selectedEl);

      // move caret to end
      const range = doc.createRange();
      range.selectNodeContents(selectedEl);
      range.collapse(false);
      const sel = (win as any).getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      selectedEl.addEventListener("blur", onSelectedBlur);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedEl) {
        selectedEl.style.outline = "";
        selectedEl.removeAttribute("contenteditable");
        selectedEl.removeEventListener("blur", onSelectedBlur);
        selectedEl = null;
      }
    };

    doc.body?.addEventListener("mouseover", handleMouseOver);
    doc.body?.addEventListener("mouseout", handleMouseOut);
    doc.body?.addEventListener("click", handleClick);
    win.addEventListener("keydown", handleKeyDown as any);

    return () => {
      doc.body?.removeEventListener("mouseover", handleMouseOver);
      doc.body?.removeEventListener("mouseout", handleMouseOut);
      doc.body?.removeEventListener("click", handleClick);
      win.removeEventListener("keydown", handleKeyDown as any);
      if (selectedEl) selectedEl.removeEventListener("blur", onSelectedBlur);
      if (hoverEl) {
        hoverEl.style.outline = "";
        hoverEl = null;
      }
    };
  }, [decodedHTML]);

  // compute iframe style based on selectedScreenSize
  const iframeStyle: React.CSSProperties =
    selectedScreenSize === "web"
      ? { width: "100%", height: 600 }
      : { width: 390, height: 800 };

  // Run save when onSaveData flips to true. Then reset it to false to avoid repeats.
  useEffect(() => {
    if (!onSaveData) return;
    onSaveCode();
    if (typeof setOnSaveData === "function") {
      // reset trigger
      setOnSaveData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSaveData]);

  const onSaveCode = async () => {
    if (!iframeRef.current) {
      console.warn("No iframe to save from.");
      toast.error("Preview not loaded.");
      return;
    }

    try {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (!iframeDoc) {
        toast.error("Unable to access preview document.");
        return;
      }

      const cloneDoc = iframeDoc.documentElement.cloneNode(true) as HTMLElement;

      // Remove outlines/cursors to get clean HTML
      const AllEls = cloneDoc.querySelectorAll<HTMLElement>("*");
      AllEls.forEach((el) => {
        try {
          el.style.outline = "";
          el.style.cursor = "";
        } catch (e) {
          // ignore
        }
      });

      const html = cloneDoc.outerHTML;
      console.log("HTML to save length:", html.length);

      const payloadCode = generatedCode ?? html;

      if (!payloadCode) {
        console.warn("No design code available to save.");
        toast.error("Nothing to save.");
        return;
      }
      if (!frameId || !projectId) {
        console.warn("Save skipped: missing frameId or projectId", { frameId, projectId });
        toast.error("Save failed: missing frame or project information.");
        return;
      }

      // send to API
      const res = await axios.put(
        "/api/frame",
        { designCode: html, frameId, projectId },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("SaveGeneratedCode result:", res.data);
      toast.success("Website is Ready!");
    } catch (err: any) {
      console.error("SaveGeneratedCode failed:", err?.response?.data ?? err?.message ?? err);
      toast.error("Save failed. Check console for details.");
    }
  };

  return (
    <div className="flex gap-2 w-full">
      <div className="p-5 w-full flex flex-col gap-4 items-center">
        <iframe
          ref={iframeRef}
          title="Website Preview"
          style={{
            ...iframeStyle,
            border: "2px solid rgba(0,0,0,0.06)",
            borderRadius: 12,
          }}
          // sandbox: keep allow-same-origin if you need contentDocument access in dev; consider tightening in prod.
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        />
        <div className="w-full max-w-4xl">
          <WebPageTools
            selectedScreenSize={selectedScreenSize}
            setSelectedScreenSize={(v: "web" | "mobile") => setSelectedScreenSize(v)}
            generatedCode={generatedCode}
          />
        </div>
      </div>

      {selectedElement?.tagName === "IMG" ? (
        // @ts-ignore
        <ImageSettingSection selectedEl={selectedElement} />
      ) : selectedElement ? (
        <ElementSettingSection selectedEl={selectedElement} clearSelection={() => setSelectedElement(null)} />
      ) : null}
    </div>
  );
}
