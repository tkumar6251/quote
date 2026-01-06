"use client";
import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';


// Provider Info
const PROVIDER = {
  name: "KSP Kraftwagen (OPC) PVT. LTD.",
  email: "info@kraftwagenksp.com",
  phone: "8005006933"
};

export default function Home() {
  // --- State ---
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [scope, setScope] = useState('');

  const [modules, setModules] = useState([]);

  const [techStack, setTechStack] = useState({
    frontend: '',
    backend: '',
    database: '',
    mobile: '',
    hosting: ''
  });

  const [costItem, setCostItem] = useState({ name: '', price: 0 });

  // Payment Terms
  const [terms, setTerms] = useState({ advance: 40, completion: 40, delivery: 20 });
  const percentages = Array.from({ length: 21 }, (_, i) => i * 5);

  // --- Handlers ---
  const addModule = () => setModules([...modules, { title: '', details: '' }]);
  const removeModule = (index) => setModules(modules.filter((_, i) => i !== index));
  const updateModule = (index, field, val) => {
    const newModules = [...modules];
    newModules[index][field] = val;
    setModules(newModules);
  };

  const calculateGST = () => (costItem.price * 0.18).toFixed(2);
  const calculateTotal = () => (Number(costItem.price) + Number(costItem.price * 0.18)).toFixed(2);

  // --- AI Handlers ---
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch('/api/analyze-prd', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();

      if (res.ok && json.data) {
        setProjectTitle(json.data.projectTitle || '');
        setScope(json.data.scope || '');
        if (Array.isArray(json.data.modules)) setModules(json.data.modules);
        if (json.data.techStack) setTechStack({ ...techStack, ...json.data.techStack });
        alert("✅ Form populated from PRD!");
      } else {
        alert(`Failed to analyze PRD: ${json.details || json.error}`);
      }
    } catch (error) {
      console.error(error);
      alert(`Error uploading file: ${error.message}`);
    }
    setLoading(false);
    e.target.value = null; // Reset input
  };

  const generateScope = async () => {
    if (!projectTitle) return alert("Please enter a Project Title first.");
    setLoading(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        body: JSON.stringify({ projectTitle, type: 'scope' })
      });
      const data = await res.json();
      if (data.output) setScope(data.output);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const generateModules = async () => {
    if (!projectTitle) return alert("Please enter a Project Title first.");
    setLoading(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        body: JSON.stringify({ projectTitle, type: 'modules' })
      });
      const data = await res.json();
      if (data.output) {
        const parsed = JSON.parse(data.output);
        if (Array.isArray(parsed)) setModules(parsed);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // --- PDF Generation ---
  // Helper to load image
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

    // --- Custom Token Logic ---
    // Format: DD + ClientInit + ProjectInit + MM + K + YY + ModuleCount
    const date = new Date();
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    const cInit = clientName ? clientName.trim()[0].toUpperCase() : 'X';
    const pInit = projectTitle ? projectTitle.trim()[0].toUpperCase() : 'X';
    const modCount = modules.length;
    const token = `${dd}${cInit}${pInit}${mm}K${yy}${modCount}`;



    // --- Apple Theme Styles ---
    const primaryColor = [30, 30, 30]; // Nearly black
    const secondaryColor = [100, 100, 100]; // Dark Gray
    const accentColor = [0, 122, 255]; // Apple Blue
    const lineColor = [220, 220, 220]; // Light Gray

    doc.setFont("helvetica", "bold");

    // Header
    doc.setFontSize(22);
    doc.setTextColor(...primaryColor);
    doc.text(`Quotation`, 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.setFont("helvetica", "normal");


    // Provider Info (Right Aligned or minimal)
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text(PROVIDER.name, 190, 25, { align: "right" });
    doc.setTextColor(...secondaryColor);
    doc.text(PROVIDER.email, 190, 30, { align: "right" });
    doc.text(PROVIDER.phone, 190, 35, { align: "right" });
    doc.text(`Date: ${date.toLocaleDateString('en-GB')}`, 190, 45, { align: "right" });

    // Title
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(projectTitle.toUpperCase(), 20, 55);

    if (clientName) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...secondaryColor);
      doc.text(`Prepared for ${clientName}`, 20, 60);
    }

    // Line Separator
    doc.setDrawColor(...lineColor);
    doc.line(20, 65, 190, 65);

    // Scope
    let y = 75;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Project Scope", 20, y);

    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.setFont("helvetica", "normal");
    const splitScope = doc.splitTextToSize(scope, 170);
    doc.text(splitScope, 20, y);
    y += (splitScope.length * 5) + 10;

    // Modules
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Modules", 20, y);
    y += 8;

    // Minimal Table Header
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.line(20, y - 5, 190, y - 5);
    doc.text("MODULE", 20, y);
    doc.text("DETAILS", 80, y);
    doc.line(20, y + 2, 190, y + 2);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...primaryColor);

    modules.forEach(m => {
      doc.text(m.title, 20, y);
      const detailsLines = doc.splitTextToSize(m.details, 110);
      doc.text(detailsLines, 80, y);
      y += (detailsLines.length * 5) + 5;
    });
    y += 5;

    // Tech Stack
    if (y > 230) { doc.addPage(); y = 20; } // Basic pagination check

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Technology Stack", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const stackItems = [
      `Frontend: ${techStack.frontend}`,
      `Backend: ${techStack.backend}`,
      `Database: ${techStack.database}`,
      `Mobile: ${techStack.mobile}`,
      `Hosting: ${techStack.hosting}`
    ];
    doc.text(stackItems.join("  •  "), 20, y);
    y += 15;

    // Commercials
    doc.setDrawColor(...lineColor);
    doc.setFillColor(248, 248, 250); // Very light gray bg
    doc.rect(20, y, 170, 35, 'F');

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Commercials", 25, y + 8);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(costItem.name, 25, y + 18);
    doc.text(`INR ${Number(costItem.price).toLocaleString('en-IN')}`, 160, y + 18, { align: "right" });

    doc.text(`GST (18%)`, 25, y + 25);
    doc.text(`INR ${Number(calculateGST()).toLocaleString('en-IN')}`, 160, y + 25, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(`Total`, 25, y + 32);
    doc.text(`INR ${Number(calculateTotal()).toLocaleString('en-IN')}`, 160, y + 32, { align: "right" });
    y += 45;

    // Payment Terms
    doc.setFontSize(11);
    doc.text("Payment Schedule", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const termsArr = [
      `${terms.advance}% Advance`,
      `${terms.completion}% Core Completion`,
      `${terms.delivery}% Pre-Delivery`
    ];
    doc.text(termsArr.join("   /   "), 20, y);

    // Bottom Right Token (No label)
    const pageHeightActual = doc.internal.pageSize.getHeight();
    const pageWidthActual = doc.internal.pageSize.getWidth();
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(token, pageWidthActual - 20, pageHeightActual - 15, { align: "right" });

    return doc.output('datauristring');
  };

  const handleGenerate = async (e) => {
    e.preventDefault();

    const totalPercent = Number(terms.advance) + Number(terms.completion) + Number(terms.delivery);
    if (totalPercent !== 100) {
      alert(`Payment terms must total 100%. Current total: ${totalPercent}%`);
      return;
    }

    const pdf = await generatePDF();
    const w = window.open("");
    w.document.write(`<iframe width='100%' height='100%' src='${pdf}'></iframe>`);
  };

  const handleSendEmail = async () => {
    if (!clientEmail) return alert("Please enter a Client Email address.");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) return alert("Please enter a valid email address.");

    const totalPercent = Number(terms.advance) + Number(terms.completion) + Number(terms.delivery);
    if (totalPercent !== 100) return alert(`Payment terms must total 100%. Current total: ${totalPercent}%`);

    setLoading(true);
    try {
      const pdfDataUri = await generatePDF();

      const res = await fetch('/api/send-quote', {
        method: 'POST',
        body: JSON.stringify({
          email: clientEmail,
          pdfBase64: pdfDataUri
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ Quotation sent successfully locally! (Note: In production this requires SMTP config)");
      } else {
        alert(`Error: ${data.error || 'Failed to send email'}`);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to send email. Check console for details.");
    }
    setLoading(false);
  };

  /* 
     Apple Infinity Palette:
     BG: Aurora Gradient (Animated)
     Glass: bg-white/70 backdrop-blur-2xl border-white/40
     Text: Slate-800
     Buttons: IOS Blue Gradient
     Inputs: Minimal
  */

  return (
    <div className="min-h-screen relative font-sans text-slate-800 overflow-hidden">

      {/* Aurora Background */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-pulse"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 blur-[120px] rounded-full animate-blob"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-200/40 blur-[120px] rounded-full animate-blob animation-delay-2000"></div>

      <div className="w-full px-6 py-12 flex flex-col items-center">
        {/* Navigation */}
        <div className="mb-8 flex gap-4">
          <button className="px-6 py-2 rounded-full bg-slate-900 text-white text-sm font-bold shadow-lg">Quotation</button>
          <a href="/sow" className="px-6 py-2 rounded-full bg-white/40 backdrop-blur-md border border-white/60 text-sm font-bold hover:bg-white/60 transition-all">SOW Generator</a>
          <a href="/msa" className="px-6 py-2 rounded-full bg-white/40 backdrop-blur-md border border-white/60 text-sm font-bold hover:bg-white/60 transition-all">MSA Generator</a>
        </div>

        <div className="w-full flex flex-col md:flex-row gap-10 items-start">


          {/* Glassmorphism Form Card */}
          <div className="flex-1 bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-xl p-8 md:p-10 animate-fade-in">

            <div className="mb-8 border-b border-gray-200/50 pb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-800">Quotation</h1>
                <p className="text-slate-500 mt-1">Generate a contract-ready document in seconds.</p>
              </div>
              {/* Provider Badge & Upload */}
              <div className="hidden md:flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Provider</div>
                  <div className="font-bold text-slate-700">{PROVIDER.name}</div>
                </div>

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
                  Upload PRD (PDF/DOCX)
                </button>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-8">

              {/* Client & Project */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Client Name</label>
                  <input
                    className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium placeholder-slate-400"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Client Company Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Client Email</label>
                  <input
                    className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium placeholder-slate-400"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="client@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Project Title</label>
                  <input
                    className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium placeholder-slate-400"
                    value={projectTitle}
                    onChange={e => setProjectTitle(e.target.value)}
                    placeholder="e.g. Mobile App MVP"
                  />
                </div>
              </div>

              {/* Scope */}
              <div>
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Scope</label>
                  <button
                    type="button"
                    onClick={generateScope}
                    className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span>✨ AI Generate</span>
                  </button>
                </div>
                <textarea
                  className="w-full bg-white/50 border border-transparent focus:border-blue-400/50 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium placeholder-slate-400 min-h-[100px]"
                  value={scope}
                  onChange={e => setScope(e.target.value)}
                />
              </div>

              {/* Modules */}
              <div className="bg-slate-50/50 rounded-2xl p-6 border border-white/60">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modules</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={generateModules}
                      className="flex items-center gap-1 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <span>✨ AI Suggest</span>
                    </button>
                    <button type="button" onClick={addModule} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                      + Add Module
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {modules.map((m, i) => (
                    <div key={i} className="flex gap-3">
                      <input
                        className="flex-1 bg-white border-none rounded-xl px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
                        value={m.title} onChange={e => updateModule(i, 'title', e.target.value)} placeholder="Module"
                      />
                      <input
                        className="flex-[2] bg-white border-none rounded-xl px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
                        value={m.details} onChange={e => updateModule(i, 'details', e.target.value)} placeholder="Details"
                      />
                      <button type="button" onClick={() => removeModule(i)} className="text-slate-400 hover:text-red-500 px-1 transition text-lg">&times;</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 ml-1">Tech Stack</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {Object.keys(techStack).map((key) => (
                    <input
                      key={key}
                      className="w-full bg-white/50 border border-transparent focus:border-purple-400/50 rounded-xl px-3 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-purple-100 transition-all font-medium placeholder-slate-400 shadow-sm"
                      value={techStack[key]}
                      onChange={e => setTechStack({ ...techStack, [key]: e.target.value })}
                    />
                  ))}
                </div>
              </div>

              {/* Commercials + Payment Terms */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-gradient-to-br from-white to-blue-50/50 p-6 rounded-2xl border border-white shadow-inner">

                {/* Left: Cost */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Investment</label>
                  <input
                    className="w-full bg-white border-none rounded-xl px-4 py-3 mb-3 shadow-sm outline-none font-medium"
                    value={costItem.name} onChange={e => setCostItem({ ...costItem, name: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">₹</span>
                    <input
                      className="w-full bg-white border-none rounded-xl px-4 py-3 shadow-sm outline-none font-mono font-bold text-lg"
                      type="number"
                      value={costItem.price} onChange={e => setCostItem({ ...costItem, price: e.target.value })}
                    />
                  </div>
                  <div className="mt-3 text-right">
                    <div className="text-xs text-slate-500 font-medium">GST (18%): ₹{Number(calculateGST()).toLocaleString('en-IN')}</div>
                    <div className="text-xl font-bold text-slate-800 mt-1">Total: ₹{Number(calculateTotal()).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Right: Terms */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Milestones</label>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white/60 px-3 py-2 rounded-lg">
                      <span className="text-xs font-bold text-blue-600">Advance</span>
                      <select className="bg-transparent font-bold outline-none text-right cursor-pointer" value={terms.advance} onChange={e => setTerms({ ...terms, advance: Number(e.target.value) })}>
                        {percentages.map(p => {
                          const wouldExceed = (p + Number(terms.completion) + Number(terms.delivery)) > 100;
                          return <option key={p} value={p} disabled={wouldExceed && p !== Number(terms.advance)}>{p}%</option>
                        })}
                      </select>
                    </div>
                    <div className="flex justify-between items-center bg-white/60 px-3 py-2 rounded-lg">
                      <span className="text-xs font-bold text-purple-600">Completion</span>
                      <select className="bg-transparent font-bold outline-none text-right cursor-pointer" value={terms.completion} onChange={e => setTerms({ ...terms, completion: Number(e.target.value) })}>
                        {percentages.map(p => {
                          const wouldExceed = (p + Number(terms.advance) + Number(terms.delivery)) > 100;
                          return <option key={p} value={p} disabled={wouldExceed && p !== Number(terms.completion)}>{p}%</option>
                        })}
                      </select>
                    </div>
                    <div className="flex justify-between items-center bg-white/60 px-3 py-2 rounded-lg">
                      <span className="text-xs font-bold text-teal-600">Delivery</span>
                      <select className="bg-transparent font-bold outline-none text-right cursor-pointer" value={terms.delivery} onChange={e => setTerms({ ...terms, delivery: Number(e.target.value) })}>
                        {percentages.map(p => {
                          const wouldExceed = (p + Number(terms.advance) + Number(terms.completion)) > 100;
                          return <option key={p} value={p} disabled={wouldExceed && p !== Number(terms.delivery)}>{p}%</option>
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <span>Previews PDF</span>
                    <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={loading}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? 'Sending...' : 'Send to Client'}
                    <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </span>
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* CSS Animations (Inline for simplicity) */}
        <style jsx global>{`
        @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
            animation: blob 7s infinite;
        }
        .animation-delay-2000 {
            animation-delay: 2s;
        }
        .floating-animation {
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
            100% { transform: translateY(0px); }
        }
      `}</style>
      </div>
    </div>
  );
}
