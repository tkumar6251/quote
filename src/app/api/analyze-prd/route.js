
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const docType = formData.get("docType") || "prd"; // prd, sow, msa

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = "";

    // Extract Text based on MIME type
    console.log("Analyzing file type:", file.type);

    if (file.type === "application/pdf") {
      console.log("Loading pdf-parse...");
      // Dynamic import to handle CJS/ESM interop
      const pdfModule = await import("pdf-parse");
      const pdf = typeof pdfModule.default === "function" ? pdfModule.default : pdfModule;
      console.log("pdfModule type:", typeof pdfModule, "pdf is function:", typeof pdf);
      console.log("Parsing PDF buffer...");
      const data = await pdf(buffer);
      extractedText = data.text;
      console.log("PDF Parsed. Text length:", extractedText.length);
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      console.log("Parsing DOCX...");
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
      console.log("DOCX Parsed.");
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Use PDF or DOCX." },
        { status: 400 }
      );
    }

    // Gemini Analysis
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Gemini API Key exists:", !!apiKey);

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API Key missing" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    console.log("Sending prompt to Gemini...");

    let prompt = "";
    if (docType === "sow") {
      prompt = `
        Act as a Senior Project Manager. Analyze this Statement of Work (SOW) or requirement document:
        "${extractedText.slice(0, 20000)}"
        Extract the following details for an SOW form. Return ONLY valid JSON:
        {
          "clientName": "Client Company Name",
          "clientEmail": "client@email.com (if found)",
          "projectTitle": "Professional Project Title",
          "overview": "Professional project overview summary (50-80 words)",
          "deliverables": ["Deliverable 1", "Deliverable 2", ...],
          "milestones": [
            { "title": "Milestone Name", "date": "Estimated Date or TBD", "amount": "Amount if found or 0" }
          ],
          "supportTerms": "Summary of support and warranty terms (one paragraph)"
        }
      `;
    } else if (docType === "msa") {
      prompt = `
        Act as a Legal Consultant. Analyze this Master Service Agreement (MSA) or contract:
        "${extractedText.slice(0, 20000)}"
        Extract the following details for an MSA form. Return ONLY valid JSON:
        {
          "clientName": "Client Legal Name",
          "clientAddress": "Client Office Address",
          "effectiveDate": "YYYY-MM-DD",
          "clauses": {
            "scopeOfServices": "Detailed scope of services clause",
            "term": "Term and duration clause",
            "intellectualProperty": "IP ownership and rights clause",
            "confidentiality": "Confidentiality and non-disclosure clause",
            "paymentTerms": "Payment and billing milestones clause",
            "limitationOfLiability": "Liability limits and exclusions clause",
            "termination": "Termination rights and notice period",
            "governingLaw": "Governing law and jurisdiction clause"
          }
        }
      `;
    } else {
      prompt = `
      Act as a Senior Technical Architect. Analyze this Project Requirement Document (PRD) text:

      "${extractedText.slice(0, 20000)}" 
      
      (Text truncated if too long)

      Extract and infer the following details to populate a quotation form. 
      Return ONLY valid JSON with this exact structure:

      {
        "projectTitle": "Short, professional title (e.g. E-Commerce Mobile App)",
        "scope": "A professional, concise project scope summary (60-80 words). Focus on key phases (Design, Dev, Deploy).",
        "modules": [
          { "title": "Module Name", "details": "Brief feature list" },
          { "title": "Module Name", "details": "Brief feature list" }
        ],
        "techStack": {
          "frontend": "e.g. React Native",
          "backend": "e.g. Node.js",
          "database": "e.g. PostgreSQL",
          "mobile": "e.g. iOS/Android",
          "hosting": "e.g. AWS"
        }
      }
    `;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Cleanup Markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return NextResponse.json({ data: JSON.parse(text) });

  } catch (error) {
    console.error("PRD Analysis Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze document", details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
