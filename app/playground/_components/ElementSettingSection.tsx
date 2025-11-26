import { SwatchBook } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  selectedEl: HTMLElement | null;
  clearSelection: () => void;
};

function ElementSettingSection({ selectedEl, clearSelection }: Props) {
  // Controlled states that reflect the selected element's inline styles
  const [classes, setClasses] = useState<string[]>([]);
  const [newClass, setNewClass] = useState("");
  const [align, setAlign] = useState<string | undefined>(undefined);
  const [fontSize, setFontSize] = useState<string>("24px");
  const [textColor, setTextColor] = useState<string>("#000000");
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [borderRadius, setBorderRadius] = useState<string>("");
  const [padding, setPadding] = useState<string>("");
  const [margin, setMargin] = useState<string>("");

  // Utility to apply a style safely to the selected element
  const applyStyle = (property: string, value: string) => {
    if (!selectedEl) return;
    // @ts-ignore - we're setting inline style property dynamically
    selectedEl.style[property as any] = value;
  };

  // Sync local state from selectedEl when it changes
  useEffect(() => {
    if (!selectedEl) {
      // reset to defaults if nothing selected
      setClasses([]);
      setAlign(undefined);
      setFontSize("24px");
      setTextColor("#000000");
      setBgColor("#ffffff");
      setBorderRadius("");
      setPadding("");
      setMargin("");
      return;
    }

    // read current classes using classList to avoid silly whitespace issues
    setClasses(Array.from(selectedEl.classList));

    // read inline styles (fall back to sensible defaults)
    setAlign(selectedEl.style.textAlign || undefined);
    setFontSize(selectedEl.style.fontSize || "24px");
    setTextColor(selectedEl.style.color || "#000000");
    setBgColor(selectedEl.style.backgroundColor || "#ffffff");
    setBorderRadius(selectedEl.style.borderRadius || "");
    setPadding(selectedEl.style.padding || "");
    setMargin(selectedEl.style.margin || "");

    // observe class changes so the UI stays up to date
    const observer = new MutationObserver((mutations) => {
      // only react once per batch
      const updated = Array.from(selectedEl.classList);
      setClasses(updated);
    });

    observer.observe(selectedEl, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [selectedEl]);

  // when align state changes, apply to element
  useEffect(() => {
    if (!selectedEl) return;
    if (align === undefined) return;
    applyStyle("textAlign", align);
  }, [align, selectedEl]);

  // when style states change, apply them
  useEffect(() => {
    if (!selectedEl) return;
    applyStyle("fontSize", fontSize);
  }, [fontSize, selectedEl]);

  useEffect(() => {
    if (!selectedEl) return;
    applyStyle("color", textColor);
  }, [textColor, selectedEl]);

  useEffect(() => {
    if (!selectedEl) return;
    applyStyle("backgroundColor", bgColor);
  }, [bgColor, selectedEl]);

  useEffect(() => {
    if (!selectedEl) return;
    applyStyle("borderRadius", borderRadius);
  }, [borderRadius, selectedEl]);

  useEffect(() => {
    if (!selectedEl) return;
    applyStyle("padding", padding);
  }, [padding, selectedEl]);

  useEffect(() => {
    if (!selectedEl) return;
    applyStyle("margin", margin);
  }, [margin, selectedEl]);

  // Class management using classList
  const removeClass = (cls: string) => {
    if (!selectedEl) return;
    selectedEl.classList.remove(cls);
    setClasses(Array.from(selectedEl.classList));
  };

  const addClass = () => {
    if (!selectedEl) {
      setNewClass("");
      return;
    }
    const trimmed = newClass.trim();
    if (!trimmed) return;
    if (!selectedEl.classList.contains(trimmed)) {
      selectedEl.classList.add(trimmed);
      setClasses(Array.from(selectedEl.classList));
    }
    setNewClass("");
  };

  return (
    <div className="w-96 shadow p-4 space-y-4 overflow-auto h-[90vh] rounded-xl mt-2 mr-2">
      <h2 className="flex gap-2 items-center font-bold">
        <SwatchBook /> Settings
      </h2>

      {/* Font Size + Text Color inline */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm">Font Size</label>
          <Select value={fontSize} onValueChange={(value) => setFontSize(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Size" />
            </SelectTrigger>
            <SelectContent>
              {[...Array(53)].map((_, index) => {
                const val = `${index + 12}px`;
                return (
                  <SelectItem value={val} key={val}>
                    {val}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm block">Text Color</label>
          <input
            type="color"
            className="w-10 h-10 rounded-lg mt-1"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
          />
        </div>
      </div>

      {/* Text Alignment */}
      <div>
        <label className="text-sm mb-1 block">Text Alignment</label>
        <ToggleGroup
          type="single"
          value={align}
          onValueChange={(v) => setAlign(v || undefined)}
          className="bg-gray-100 rounded-lg p-1 inline-flex w-full justify-between"
        >
          <ToggleGroupItem value="left" className="p-2 rounded hover:bg-gray-200 flex-1">
            <AlignLeft size={20} />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" className="p-2 rounded hover:bg-gray-200 flex-1">
            <AlignCenter size={20} />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" className="p-2 rounded hover:bg-gray-200 flex-1">
            <AlignRight size={20} />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Background Color + Border Radius inline */}
      <div className="flex items-center gap-4">
        <div>
          <label className="text-sm block">Background</label>
          <input
            type="color"
            className="w-10 h-10 rounded-lg mt-1"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="text-sm">Border Radius</label>
          <Input
            type="text"
            placeholder="e.g. 8px"
            value={borderRadius}
            onChange={(e) => setBorderRadius(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Padding */}
      <div>
        <label className="text-sm">Padding</label>
        <Input
          type="text"
          placeholder="e.g. 10px 15px"
          value={padding}
          onChange={(e) => setPadding(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Margin */}
      <div>
        <label className="text-sm">Margin</label>
        <Input
          type="text"
          placeholder="e.g. 10px 15px"
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* === Class Manager === */}
      <div>
        <label className="text-sm font-medium">Classes</label>

        {/* Existing classes as removable chips */}
        <div className="flex flex-wrap gap-2 mt-2">
          {classes.length > 0 ? (
            classes.map((cls) => (
              <span
                key={cls}
                className="flex items-center gap-1 px-2 py-1 text-sm rounded-full bg-gray-100 border"
              >
                {cls}
                <button
                  onClick={() => removeClass(cls)}
                  className="ml-1 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">No classes applied</span>
          )}
        </div>

        {/* Add new class input */}
        <div className="flex gap-2 mt-3">
          <Input value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="Add class..." />
          <Button type="button" onClick={addClass}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ElementSettingSection;
