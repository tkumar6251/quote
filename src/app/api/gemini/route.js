
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { projectTitle, type } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API Key missing" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let prompt = "";
        if (type === 'scope') {
            prompt = `Act as a Senior Project Manager at a top dev agency. Write a compelling, professional "Project Scope" for a software proposal titled "${projectTitle}". 
      Include 3 key phases: Design/Prototyping, Development, and Deployment. 
      Focus on delivering a scalable, user-centric solution that drives business growth. 
      Keep it between 60-80 words. Professional tone.`;
        } else if (type === 'modules') {
            prompt = `Generate a JSON array of 4-5 key modules for a software project titled "${projectTitle}". 
      Format: [{"title": "Module Name", "details": "Brief features"}]. 
      Do NOT include markdown formatting or backticks. Return ONLY the raw JSON.`;
        } else if (type === 'sow_overview') {
            prompt = `Act as a Senior Project Manager. Write a professional "Project Overview" for a Statement of Work (SOW) titled "${projectTitle}". 
      Describe the project goals and high-level objectives clearly. 
      Keep it between 80-100 words. Professional and authoritative tone.`;
        } else if (type === 'sow_deliverables') {
            prompt = `Generate a JSON array of 5-6 key deliverables for a Statement of Work (SOW) titled "${projectTitle}". 
      Format: [{"item": "Deliverable Name", "description": "What will be delivered"}]. 
      Do NOT include markdown formatting or backticks. Return ONLY the raw JSON.`;
        } else if (type === 'sow_milestones') {
            prompt = `Generate a JSON array of 4-5 project milestones for a Statement of Work (SOW) titled "${projectTitle}". 
      Format: [{"milestone": "Phase/Event", "timeline": "e.g. Week 4", "criteria": "Success criteria"}]. 
      Do NOT include markdown formatting or backticks. Return ONLY the raw JSON.`;
        } else if (type === 'msa_clauses') {
            prompt = `Generate a JSON object containing standard Master Service Agreement (MSA) clauses for a software project titled "${projectTitle}".
      Include the following keys: "governingLaw" (string), "disputeResolution" (string), "termination" (string), "confidentiality" (string), "liability" (string). 
      Make the content professional, standard, and legally formal.
      Do NOT include markdown formatting or backticks. Return ONLY the raw JSON.`;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up if Gemini adds markdown code blocks
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return NextResponse.json({ output: text });

    } catch (error) {
        console.error("Gemini Error:", error);
        return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
    }
}
