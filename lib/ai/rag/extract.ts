// Text extraction per page/slide for PDF and PPT/PPTX (BE-4.5). Owner: BE.
import "server-only";
import type { ResourceType } from "@/contracts/resources";
import { PDFParse } from "pdf-parse";
import { OfficeParser, type OfficeContentNode } from "officeparser";

export interface ExtractedPage {
  /** 1-based page (PDF) or slide (PPT/PPTX). */
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  pageCount: number;
  pages: ExtractedPage[];
}

function extractNodeText(node: OfficeContentNode): string {
  const parts: string[] = [];
  if (node.text && typeof node.text === "string") {
    parts.push(node.text);
  }
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      const childText = extractNodeText(child);
      if (childText) parts.push(childText);
    }
  }
  return parts.join("\n").trim();
}

async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const pages: ExtractedPage[] = [];

    if (result.pages && result.pages.length > 0) {
      for (const page of result.pages) {
        const text = (page.text ?? "").trim();
        if (text) {
          pages.push({ pageNumber: page.num, text });
        }
      }
    } else if (result.text && result.text.trim()) {
      pages.push({ pageNumber: 1, text: result.text.trim() });
    }

    return {
      pageCount: result.total || pages.length || 1,
      pages,
    };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractOffice(buffer: Buffer): Promise<ExtractedDocument> {
  const ast = await OfficeParser.parseOffice(buffer, { ignoreNotes: false });
  const pages: ExtractedPage[] = [];

  const slideNodes = (ast.content ?? []).filter((node) => node.type === "slide");
  if (slideNodes.length > 0) {
    for (let i = 0; i < slideNodes.length; i++) {
      const slide = slideNodes[i];
      const text = extractNodeText(slide);
      if (text) {
        pages.push({ pageNumber: i + 1, text });
      }
    }
    return {
      pageCount: slideNodes.length,
      pages,
    };
  }

  const wholeText = (ast.content ?? []).map(extractNodeText).filter(Boolean).join("\n\n").trim();
  if (wholeText) {
    pages.push({ pageNumber: 1, text: wholeText });
  }

  return {
    pageCount: pages.length || 1,
    pages,
  };
}

export async function extractDocumentText(
  buffer: Buffer,
  type: ResourceType,
): Promise<ExtractedDocument> {
  if (type === "pdf") {
    return extractPdf(buffer);
  }
  if (type === "ppt" || type === "pptx") {
    return extractOffice(buffer);
  }
  throw new Error(`Unsupported resource type: ${type}`);
}
