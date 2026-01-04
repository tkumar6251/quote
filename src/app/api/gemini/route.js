
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
