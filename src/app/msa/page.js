"use client";
import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';

// Provider Info
const PROVIDER = {
    name: "KSP Kraftwagen (OPC) PVT. LTD.",
    address: "Plot No. 12, Sector 5, Dwarka, New Delhi - 110075",
    email: "info@kraftwagenksp.com",
    phone: "8005006933"
};

export default function MSAPage() {
    // --- State ---
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
    const [projectTitle, setProjectTitle] = useState('');

    const [clauses, setClauses] = useState({
        scopeOfServices: 'The Service Provider shall provide software development and related IT services as detailed in individual Statements of Work (SOW).',
        term: 'This Agreement shall commence on the Effective Date and remain valid unless terminated as per Clause 7.',
        intellectualProperty: 'All deliverables shall be the sole property of the Client upon full payment, unless otherwise agreed in writing.',
        confidentiality: 'Both parties agree to maintain confidentiality of all proprietary information.',
        paymentTerms: 'Payments shall be governed by agreed milestones as per the SOW.',
        limitationOfLiability: 'Liability shall be limited to the fees paid in the last 6 months.',
        termination: 'Either party may terminate with 30 days written notice.',
        governingLaw: 'This Agreement shall be governed by Indian law. Courts of New Delhi shall have exclusive jurisdiction.'
    });

    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("docType", "msa");

        try {
            const res = await fetch('/api/analyze-prd', {
                method: 'POST',
                body: formData
            });
            const json = await res.json();

            if (res.ok && json.data) {
                if (json.data.clientName) setClientName(json.data.clientName);
                if (json.data.clientAddress) setClientAddress(json.data.clientAddress);
                if (json.data.effectiveDate) setEffectiveDate(json.data.effectiveDate);
                if (json.data.clauses) setClauses({ ...clauses, ...json.data.clauses });
                alert("✅ Form populated from Agreement!");
            } else {
                alert(`Failed to analyze Agreement: ${json.details || json.error}`);
            }
        } catch (error) {
            console.error(error);
            alert(`Error uploading file: ${error.message}`);
        }
        setLoading(false);
        e.target.value = null; // Reset input
    };

    // --- AI Handlers ---
    const generateClauses = async () => {
        if (!projectTitle) return alert("Please enter a Project Title first.");
        setLoading(true);
        try {
            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectTitle, type: 'msa_clauses' })
            });
            const data = await res.json();
            if (data.output) {
                const parsed = JSON.parse(data.output);
                setClauses(parsed);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    // --- PDF Generation ---
    const generatePDF = async () => {
        const doc = new jsPDF();
        const primaryColor = [30, 30, 30];
        const secondaryColor = [100, 100, 100];
        const lineColor = [220, 220, 220];

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(...primaryColor);
        doc.text(`Master Service Agreement`, 20, 25);

        doc.setFontSize(10);
        doc.text(PROVIDER.name, 190, 25, { align: "right" });
        doc.setTextColor(...secondaryColor);
        doc.text(PROVIDER.email, 190, 30, { align: "right" });
        doc.text(`Effective Date: ${effectiveDate}`, 190, 35, { align: "right" });

        doc.setDrawColor(...lineColor);
        doc.line(20, 45, 190, 45);

        let y = 60;

        // Parties
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.text("PARTIES", 20, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...secondaryColor);

        const partiesIntro = `This Master Service Agreement ("Agreement") is entered into on ${effectiveDate}, by and between:`;
        const splitIntro = doc.splitTextToSize(partiesIntro, 170);
        doc.text(splitIntro, 20, y);
        y += (splitIntro.length * 5) + 5;

        doc.setFont("helvetica", "bold");
        doc.text("SERVICE PROVIDER:", 20, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const providerText = `${PROVIDER.name}, a company incorporated under the laws of India, having its registered office at ${PROVIDER.address} ("Service Provider")`;
        const splitProv = doc.splitTextToSize(providerText, 170);
        doc.text(splitProv, 20, y);
        y += (splitProv.length * 5) + 5;

        doc.setFont("helvetica", "bold");
        doc.text("AND", 20, y);
        y += 5;

        doc.text("CLIENT:", 20, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const clientText = `${clientName || "[Client Name]"}, having its registered office at ${clientAddress || "[Client Address]"} ("Client").`;
        const splitClient = doc.splitTextToSize(clientText, 170);
        doc.text(splitClient, 20, y);
        y += (splitClient.length * 5) + 15;

        // Clauses
        const sections = [
            { title: "1. SCOPE OF SERVICES", content: clauses.scopeOfServices },
            { title: "2. TERM", content: clauses.term },
            { title: "3. INTELLECTUAL PROPERTY", content: clauses.intellectualProperty },
            { title: "4. CONFIDENTIALITY", content: clauses.confidentiality },
            { title: "5. PAYMENT TERMS", content: clauses.paymentTerms },
            { title: "6. LIMITATION OF LIABILITY", content: clauses.limitationOfLiability },
            { title: "7. TERMINATION", content: clauses.termination },
            { title: "8. GOVERNING LAW & JURISDICTION", content: clauses.governingLaw }
        ];

        sections.forEach(s => {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...primaryColor);
            doc.text(s.title, 20, y);
            y += 7;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...secondaryColor);
            const splitContent = doc.splitTextToSize(s.content, 170);
            doc.text(splitContent, 20, y);
            y += (splitContent.length * 5) + 10;
        });

        // Signatures
        if (y > 230) { doc.addPage(); y = 20; }
        y += 20;
        doc.setFontSize(10);
        doc.text("Client Authorized Signatory: ________________________   Date: __________", 20, y);
        y += 15;
        doc.text("Service Provider Authorized Signatory: ________________________   Date: __________", 20, y);

        return doc.output('datauristring');
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const pdf = await generatePDF();
        const w = window.open("");
        w.document.write(`<iframe width='100%' height='100%' src='${pdf}'></iframe>`);
        setLoading(false);
    };

    return (
        <div className="min-h-screen relative font-sans text-slate-800 overflow-x-hidden">
            {/* Aurora Background */}
            <div className="absolute inset-0 -z-20 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-pulse"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 blur-[120px] rounded-full animate-blob"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-200/40 blur-[120px] rounded-full animate-blob animation-delay-2000"></div>

            <div className="w-full px-6 py-12 flex flex-col items-center">
                {/* Navigation */}
                <div className="mb-8 flex flex-wrap justify-center gap-4">
                    <a href="/" className="px-6 py-2 rounded-full bg-white/40 backdrop-blur-md border border-white/60 text-sm font-bold hover:bg-white/60 transition-all">Quotation</a>
                    <a href="/sow" className="px-6 py-2 rounded-full bg-white/40 backdrop-blur-md border border-white/60 text-sm font-bold hover:bg-white/60 transition-all">SOW Generator</a>
                    <button className="px-6 py-2 rounded-full bg-slate-900 text-white text-sm font-bold shadow-lg">MSA Generator</button>
                </div>

                <div className="mb-8">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.docx"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-all border border-indigo-200"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        Upload Document (PDF/DOCX)
                    </button>
                </div>

                <div className="w-full flex flex-col md:flex-row gap-10 items-start">
                    <div className="flex-1 bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-xl p-8 md:p-10 animate-fade-in">
                        <div className="mb-8 border-b border-gray-200/50 pb-6">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Master Service Agreement</h1>
                            <p className="text-slate-500 mt-1">Generate a legally formal Master Service Agreement.</p>
                        </div>

                        <form onSubmit={handleGenerate} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Client Name</label>
                                    <input className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                                        value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client Legal Name" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Effective Date</label>
                                    <input type="date" className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                                        value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Client Address</label>
                                    <input className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                                        value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Full address of the client" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Project/Service Context</label>
                                    <div className="flex gap-2">
                                        <input className="flex-1 bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                                            value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="e.g. Software Development Services" />
                                        <button type="button" onClick={generateClauses} className="whitespace-nowrap px-4 py-2 bg-purple-50 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-100 transition-all">✨ AI Suggest Clauses</button>
                                    </div>
                                </div>
                            </div>

                            {/* Clauses */}
                            <div className="grid grid-cols-1 gap-6">
                                {Object.keys(clauses).map(key => (
                                    <div key={key}>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">{key.replace(/([A-Z])/g, ' $1')}</label>
                                        <textarea className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm min-h-[80px]"
                                            value={clauses[key]} onChange={e => setClauses({ ...clauses, [key]: e.target.value })} />
                                    </div>
                                ))}
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="relative z-10">{loading ? 'Generating...' : 'Preview MSA PDF'}</span>
                            </button>
                        </form>
                    </div>
                </div>

                <style jsx global>{`
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
      `}</style>
            </div>
        </div>
    );
}
