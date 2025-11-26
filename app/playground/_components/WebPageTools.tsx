// WebPageTools.tsx (REPLACE your existing file with this)
import { Button } from "@/components/ui/button";
import { Code2Icon, CodeIcon, Download, Monitor, SquareArrowOutUpRight, TabletSmartphone } from "lucide-react";
import React, { useEffect, useState } from "react";
import ViewCodeBlock from "./ViewCodeBlock";

const SHELL = `<!DOCTYPE html>
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

  <style>html,body{height:100%;margin:0;padding:0;font-family:Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial;color:#111}</style>
</head>
<body id="root" class="bg-white text-gray-900">
{CODE_PLACEHOLDER}
</body>
</html>`;

/** Lightweight decoder — same idea as in WebsiteDesign */
function decodeGeneratedCode(input?: string) {
    if (!input) return "";

    let s = input.trim();

    // if it's a JSON-quoted string, try parse
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        try {
            const parsed = JSON.parse(s);
            if (typeof parsed === "string") s = parsed;
        } catch {
            // ignore
        }
    }

    // if it's a JSON object with an html-like property, extract it
    if (s.startsWith("{") && s.endsWith("}")) {
        try {
            const obj = JSON.parse(s);
            for (const k of Object.keys(obj)) {
                if (typeof obj[k] === "string" && obj[k].includes("<")) {
                    s = obj[k];
                    break;
                }
            }
        } catch {
            // ignore
        }
    }

    // unescape common sequences: \\n -> newline, \\" -> ", \\' -> '
    s = s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'");
    s = s.replace(/\\\//g, "/");

    // remove code fences ```html or ```
    s = s.replace(/```(?:html)?/g, "");

    return s.trim();
}

function WebPageTools({ selectedScreenSize, setSelectedScreenSize, generatedCode,
}: {
    selectedScreenSize: "web" | "mobile";
    setSelectedScreenSize: (v: "web" | "mobile") => void;
    generatedCode: string;
}) {
    // <-- MOVED INSIDE FUNCTION (fixes syntax error)
    const [finalCode, setFinalCode] = useState<string | undefined>();

    useEffect(() => {
        // use SHELL and replace placeholder with decoded/generated code
        const decoded = decodeGeneratedCode(generatedCode);
        const cleanCode = SHELL.replace('{CODE_PLACEHOLDER}', decoded);
        setFinalCode(cleanCode);
    }, [generatedCode]);

    const downloadCode = () => {
        if (!finalCode) return;
        const blob = new Blob([finalCode ?? ''], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'index.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const ViewInNewTab = () => {
        if (!finalCode) return;

        // 1) decode/unescape the generatedCode safely (kept for parity; finalCode already built)
        const decoded = decodeGeneratedCode(generatedCode);

        // 2) If decoded already looks like a full document, use it directly; otherwise insert into shell
        const looksLikeFullDoc = /<!doctype|<html|<head/i.test(decoded);
        const fullHtml = looksLikeFullDoc ? decoded : SHELL.replace("{CODE_PLACEHOLDER}", decoded);

        // 3) Create blob and open in new tab
        const blob = new Blob([finalCode ?? ''], { type: "text/html" });
        const url = URL.createObjectURL(blob);

        const newWin = window.open(url, "_blank", "noopener,noreferrer");

        // revoke after short delay so browser could load the blob
        setTimeout(() => {
            try {
                URL.revokeObjectURL(url);
            } catch {
                // ignore
            }
        }, 1500);

        // If popup blocked, still revoke later
        if (!newWin) {
            setTimeout(() => {
                try {
                    URL.revokeObjectURL(url);
                } catch { }
            }, 3000);
        }
    };

    return (
        <div className="p-2 shadow rounded-xl w-full flex items-center justify-between">
            <div className="flex gap-2">
                <Button
                    variant={"ghost"}
                    className={selectedScreenSize === "web" ? "border border-primary" : ""}
                    onClick={() => setSelectedScreenSize("web")}
                >
                    <Monitor />
                </Button>
                <Button
                    variant={"ghost"}
                    className={selectedScreenSize === "mobile" ? "border border-primary" : ""}
                    onClick={() => setSelectedScreenSize("mobile")}
                >
                    <TabletSmartphone />
                </Button>
            </div>
            <div className="flex gap-2">
                <Button variant={"outline"} onClick={() => ViewInNewTab()}> View <SquareArrowOutUpRight /></Button>
                <ViewCodeBlock code={finalCode}>
                    <Button>Code<Code2Icon /></Button>
                </ViewCodeBlock>

                <Button onClick={downloadCode}>Download<Download /></Button>
            </div>
        </div>
    );
}

export default WebPageTools;
