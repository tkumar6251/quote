"use client";
import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';

// Provider Info
const PROVIDER = {
    name: "KSP Kraftwagen (OPC) PVT. LTD.",
    email: "info@kraftwagenksp.com",
    phone: "8005006933"
};

export default function SOWPage() {
    // --- State ---
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [projectTitle, setProjectTitle] = useState('');
    const [overview, setOverview] = useState('');

    const [deliverables, setDeliverables] = useState([]);
    const [milestones, setMilestones] = useState([]);

    const [acceptanceCriteria, setAcceptanceCriteria] = useState('All deliverables must be approved by the client within 5 business days of submission.');
    const [terms, setTerms] = useState({ advance: 40, completion: 40, delivery: 20 });
    const percentages = Array.from({ length: 21 }, (_, i) => i * 5);
    const [supportTerms, setSupportTerms] = useState('Standard 3-month support and warranty for bug fixes and critical maintenance.');

    // --- AI Handlers ---
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("docType", "sow");

        try {
            const res = await fetch('/api/analyze-prd', {
                method: 'POST',
                body: formData
            });
            const json = await res.json();

            if (res.ok && json.data) {
                if (json.data.clientName) setClientName(json.data.clientName);
                if (json.data.clientEmail) setClientEmail(json.data.clientEmail);
                if (json.data.projectTitle) setProjectTitle(json.data.projectTitle);
                if (json.data.overview) setOverview(json.data.overview);
                if (Array.isArray(json.data.deliverables)) setDeliverables(json.data.deliverables);
                if (Array.isArray(json.data.milestones)) setMilestones(json.data.milestones);
                if (json.data.supportTerms) setSupportTerms(json.data.supportTerms);
                alert("✅ Form populated from Document!");
            } else {
                alert(`Failed to analyze Document: ${json.details || json.error}`);
            }
        } catch (error) {
            console.error(error);
            alert(`Error uploading file: ${error.message}`);
        }
        setLoading(false);
        e.target.value = null; // Reset input
    };

    const generateOverview = async () => {
        if (!projectTitle) return alert("Please enter a Project Title first.");
        setLoading(true);
        try {
            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectTitle, type: 'sow_overview' })
            });
            const data = await res.json();
            if (data.output) setOverview(data.output);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const generateDeliverables = async () => {
        if (!projectTitle) return alert("Please enter a Project Title first.");
        setLoading(true);
        try {
            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectTitle, type: 'sow_deliverables' })
            });
            const data = await res.json();
            if (data.output) {
                const parsed = JSON.parse(data.output);
                if (Array.isArray(parsed)) setDeliverables(parsed);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const generateMilestones = async () => {
        if (!projectTitle) return alert("Please enter a Project Title first.");
        setLoading(true);
        try {
            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectTitle, type: 'sow_milestones' })
            });
            const data = await res.json();
            if (data.output) {
                const parsed = JSON.parse(data.output);
                if (Array.isArray(parsed)) setMilestones(parsed);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    // --- PDF Generation ---
    const getImageBase64 = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.setAttribute('crossOrigin', 'anonymous');
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
        });
    };

    const generatePDF = async () => {
        const doc = new jsPDF();
        const date = new Date();



        const primaryColor = [30, 30, 30];
        const secondaryColor = [100, 100, 100];
        const lineColor = [220, 220, 220];

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(...primaryColor);
        doc.text(`Statement of Work`, 20, 25);

        doc.setFontSize(10);
        doc.text(PROVIDER.name, 190, 25, { align: "right" });
        doc.setTextColor(...secondaryColor);
        doc.text(PROVIDER.email, 190, 30, { align: "right" });
        doc.text(PROVIDER.phone, 190, 35, { align: "right" });
        doc.text(`Date: ${date.toLocaleDateString('en-GB')}`, 190, 45, { align: "right" });

        // Project Title
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text(projectTitle.toUpperCase(), 20, 55);
        if (clientName) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Agreement with ${clientName}`, 20, 60);
        }

        doc.setDrawColor(...lineColor);
        doc.line(20, 65, 190, 65);

        let y = 75;

        // Overview
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Project Overview", 20, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...secondaryColor);
        const splitOverview = doc.splitTextToSize(overview, 170);
        doc.text(splitOverview, 20, y);
        y += (splitOverview.length * 5) + 10;

        // Deliverables
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("Key Deliverables", 20, y);
        y += 8;
        deliverables.forEach((d) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(`• ${d.item}`, 20, y);
            y += 5;
            doc.setFont("helvetica", "normal");
            const splitDesc = doc.splitTextToSize(d.description, 160);
            doc.text(splitDesc, 25, y);
            y += (splitDesc.length * 5) + 3;
        });
        y += 10;

        // Milestones
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("Timeline & Milestones", 20, y);
        y += 8;
        milestones.forEach((m) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold");
            doc.text(`${m.milestone} (${m.timeline})`, 20, y);
            y += 5;
            doc.setFont("helvetica", "normal");
            const splitCrit = doc.splitTextToSize(`Criteria: ${m.criteria}`, 160);
            doc.text(splitCrit, 25, y);
            y += (splitCrit.length * 5) + 5;
        });
        y += 10;

        // Terms
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("Payment Terms", 20, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        const termsText = `${terms.advance}% Advance, ${terms.completion}% on Completion, ${terms.delivery}% on Delivery`;
        doc.text(termsText, 20, y);
        y += 15;

        doc.setFont("helvetica", "bold");
        doc.text("Acceptance Criteria", 20, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        const splitAcc = doc.splitTextToSize(acceptanceCriteria, 170);
        doc.text(splitAcc, 20, y);
        y += (splitAcc.length * 5) + 15;

        // Support & Warranty
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("6. Support & Warranty", 20, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        const splitSupport = doc.splitTextToSize(supportTerms, 170);
        doc.text(splitSupport, 20, y);
        y += (splitSupport.length * 5) + 25;

        // Signatures
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("Authorized Signatures:", 20, y);
        y += 20;

        // Provider Signature
        doc.setFontSize(10);
        doc.text("Client Authorized Signatory: ________________________   Date: __________", 20, y);
        y += 15;
        doc.text("Service Provider Authorized Signatory: ________________________   Date: __________", 20, y);

        return doc.output('datauristring');
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const pdf = await generatePDF();
            const w = window.open("");
            w.document.write(`<iframe width='100%' height='100%' src='${pdf}'></iframe>`);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleSendEmail = async () => {
        if (!clientEmail) return alert("Please enter a Client Email.");
        setLoading(true);
        try {
            const pdfDataUri = await generatePDF();
            const res = await fetch('/api/send-quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: clientEmail, pdfBase64: pdfDataUri })
            });
            if (res.ok) alert("✅ SOW sent successfully!");
            else alert("Failed to send SOW.");
        } catch (e) { console.error(e); }
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
                    <button className="px-6 py-2 rounded-full bg-slate-900 text-white text-sm font-bold shadow-lg">SOW Generator</button>
                    <a href="/msa" className="px-6 py-2 rounded-full bg-white/40 backdrop-blur-md border border-white/60 text-sm font-bold hover:bg-white/60 transition-all">MSA Generator</a>
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
                        <div className="mb-8 border-b border-gray-200/50 pb-6 flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-800">Statement of Work</h1>
                                <p className="text-slate-500 mt-1">Define project deliverables and timelines professionally.</p>
                            </div>
                        </div>

                        <form onSubmit={handleGenerate} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Client Name</label>
                                    <input className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                                        value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client Name" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Client Email</label>
                                    <input className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                                        value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@company.com" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Project Title</label>
                                    <input className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                                        value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="Project Title" />
                                </div>
                            </div>

                            {/* Overview */}
                            <div>
                                <div className="flex justify-between items-center mb-2 ml-1">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Overview</label>
                                    <button type="button" onClick={generateOverview} className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors">✨ AI Generate</button>
                                </div>
                                <textarea className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium min-h-[120px]"
                                    value={overview} onChange={e => setOverview(e.target.value)} />
                            </div>

                            {/* Deliverables */}
                            <div className="bg-slate-50/50 rounded-2xl p-6 border border-white/60">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deliverables</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={generateDeliverables} className="text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors">✨ AI Suggest</button>
                                        <button type="button" onClick={() => setDeliverables([...deliverables, { item: '', description: '' }])} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">+ Add</button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {deliverables.map((d, i) => (
                                        <div key={i} className="flex flex-col gap-2 p-4 bg-white/60 rounded-xl border border-white/60">
                                            <div className="flex gap-2">
                                                <input className="flex-1 bg-transparent border-none font-bold text-sm outline-none" value={d.item} onChange={e => {
                                                    const newD = [...deliverables]; newD[i].item = e.target.value; setDeliverables(newD);
                                                }} placeholder="Deliverable Item" />
                                                <button type="button" onClick={() => setDeliverables(deliverables.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">&times;</button>
                                            </div>
                                            <textarea className="w-full bg-transparent border-none text-xs outline-none text-slate-500" value={d.description} onChange={e => {
                                                const newD = [...deliverables]; newD[i].description = e.target.value; setDeliverables(newD);
                                            }} placeholder="Description..." />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Milestones */}
                            <div className="bg-slate-50/50 rounded-2xl p-6 border border-white/60">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestones & Timeline</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={generateMilestones} className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors">✨ AI Suggest</button>
                                        <button type="button" onClick={() => setMilestones([...milestones, { milestone: '', timeline: '', criteria: '' }])} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">+ Add</button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {milestones.map((m, i) => (
                                        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-white/60 rounded-xl border border-white/60">
                                            <input className="bg-transparent border-none font-bold text-sm outline-none" value={m.milestone} onChange={e => {
                                                const newM = [...milestones]; newM[i].milestone = e.target.value; setMilestones(newM);
                                            }} placeholder="Milestone" />
                                            <input className="bg-transparent border-none text-sm outline-none text-blue-600 font-medium" value={m.timeline} onChange={e => {
                                                const newM = [...milestones]; newM[i].timeline = e.target.value; setMilestones(newM);
                                            }} placeholder="Timeline (e.g. Week 4)" />
                                            <div className="flex gap-2">
                                                <input className="flex-1 bg-transparent border-none text-sm outline-none text-slate-500" value={m.criteria} onChange={e => {
                                                    const newM = [...milestones]; newM[i].criteria = e.target.value; setMilestones(newM);
                                                }} placeholder="Criteria" />
                                                <button type="button" onClick={() => setMilestones(milestones.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">&times;</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Terms & Criteria */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Milestones</label>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-white/60 px-3 py-2 rounded-lg border border-white/60 shadow-sm">
                                            <span className="text-xs font-bold text-blue-600">Advance</span>
                                            <select className="bg-transparent font-bold outline-none text-right cursor-pointer text-sm" value={terms.advance} onChange={e => setTerms({ ...terms, advance: Number(e.target.value) })}>
                                                {percentages.map(p => {
                                                    const wouldExceed = (p + Number(terms.completion) + Number(terms.delivery)) > 100;
                                                    return <option key={p} value={p} disabled={wouldExceed && p !== Number(terms.advance)}>{p}%</option>
                                                })}
                                            </select>
                                        </div>
                                        <div className="flex justify-between items-center bg-white/60 px-3 py-2 rounded-lg border border-white/60 shadow-sm">
                                            <span className="text-xs font-bold text-purple-600">Completion</span>
                                            <select className="bg-transparent font-bold outline-none text-right cursor-pointer text-sm" value={terms.completion} onChange={e => setTerms({ ...terms, completion: Number(e.target.value) })}>
                                                {percentages.map(p => {
                                                    const wouldExceed = (p + Number(terms.advance) + Number(terms.delivery)) > 100;
                                                    return <option key={p} value={p} disabled={wouldExceed && p !== Number(terms.completion)}>{p}%</option>
                                                })}
                                            </select>
                                        </div>
                                        <div className="flex justify-between items-center bg-white/60 px-3 py-2 rounded-lg border border-white/60 shadow-sm">
                                            <span className="text-xs font-bold text-teal-600">Delivery</span>
                                            <select className="bg-transparent font-bold outline-none text-right cursor-pointer text-sm" value={terms.delivery} onChange={e => setTerms({ ...terms, delivery: Number(e.target.value) })}>
                                                {percentages.map(p => {
                                                    const wouldExceed = (p + Number(terms.advance) + Number(terms.completion)) > 100;
                                                    return <option key={p} value={p} disabled={wouldExceed && p !== Number(terms.delivery)}>{p}%</option>
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Acceptance Criteria</label>
                                    <input className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                                        value={acceptanceCriteria} onChange={e => setAcceptanceCriteria(e.target.value)} />
                                </div>
                            </div>

                            {/* Support & Warranty */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Support & Warranty</label>
                                <textarea className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium min-h-[100px]"
                                    value={supportTerms} onChange={e => setSupportTerms(e.target.value)} placeholder="Terms of support..." />
                            </div>

                            <div className="flex gap-4">
                                <button type="submit" disabled={loading} className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <span>{loading ? 'Processing...' : 'Preview SOW PDF'}</span>
                                    </span>
                                </button>

                                <button type="button" onClick={handleSendEmail} disabled={loading} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? 'Sending...' : 'Send to Client'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <style jsx global>{`
        @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
                </div>
            </div>
        </div>
    );
}
