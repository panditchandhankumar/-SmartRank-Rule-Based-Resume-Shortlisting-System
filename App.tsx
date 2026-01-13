import React, { useState, useRef, useEffect } from 'react';
import { 
  JobDescription, 
  CandidateData, 
  RankedCandidate, 
  EDUCATION_WEIGHTS 
} from './types';
import { extractCandidateData } from './services/geminiService';
import { rankCandidates } from './utils/scoringLogic';
import { extractTextFromPdf } from './utils/pdfUtils';

const App: React.FC = () => {
 
  const [jobDescription, setJobDescription] = useState<JobDescription>({
    title: "Senior Frontend Engineer",
    minExperience: 5,
    educationLevel: "Bachelor",
    mandatorySkills: ["React", "TypeScript", "Tailwind"],
    optionalSkills: ["GraphQL", "Next.js"],
    certifications: ["AWS Certified Developer"]
  });

  const [candidates, setCandidates] = useState<CandidateData[]>([
    { 
      id: '1', 
      name: 'Example: Alice Smith', 
      rawText: 'Alice Smith. 6 years experience in React and TypeScript. Bachelor of Science in CS. Skills: React, TypeScript, Tailwind, GraphQL. Cert: AWS Certified Developer.',
      fileName: 'alice_resume.pdf'
    }
  ]);

  const [rankedResults, setRankedResults] = useState<RankedCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogicInfo, setShowLogicInfo] = useState(false);
  const [usedFallbackWarning, setUsedFallbackWarning] = useState(false);
  
  const bulkInputRef = useRef<HTMLInputElement>(null);

 
  const handleAddCandidate = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setCandidates([...candidates, { id, name: '', rawText: '' }]);
  };

  const updateCandidate = (id: string, updates: Partial<CandidateData>) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const handlePdfUpload = async (id: string, file: File) => {
    updateCandidate(id, { isParsing: true, fileName: file.name, name: file.name.replace(/\.[^/.]+$/, "") });
    try {
      const text = await extractTextFromPdf(file);
      updateCandidate(id, { rawText: text, isParsing: false });
    } catch (err) {
      console.error(err);
      setError(`Failed to parse ${file.name}`);
      updateCandidate(id, { isParsing: false });
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newCandidates: CandidateData[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = Math.random().toString(36).substr(2, 9);
      newCandidates.push({
        id,
        name: file.name.replace(/\.[^/.]+$/, ""),
        fileName: file.name,
        rawText: '',
        isParsing: true
      });
    }

    setCandidates(prev => [...prev, ...newCandidates]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const matchingId = newCandidates[i].id;
      try {
        const text = await extractTextFromPdf(file);
        setCandidates(prev => prev.map(c => c.id === matchingId ? { ...c, rawText: text, isParsing: false } : c));
      } catch (err) {
        setCandidates(prev => prev.map(c => c.id === matchingId ? { ...c, isParsing: false } : c));
        setError(`Failed to extract text from one or more files.`);
      }
    }
    if (bulkInputRef.current) bulkInputRef.current.value = '';
  };

  const handleProcess = async () => {
    const validCandidates = candidates.filter(c => c.rawText.trim() !== '');
    if (validCandidates.length === 0) {
      setError("Please add at least one candidate with resume text or upload a PDF.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setRankedResults([]);
    try {
      const extracted = await Promise.all(
        validCandidates.map(c => extractCandidateData(c.rawText, c.id))
      );
      const results = rankCandidates(extracted, jobDescription);
      const fallbackUsed = results.some(r => (r as any).usedFallback === true);
      setUsedFallbackWarning(fallbackUsed);
      setTimeout(() => setRankedResults(results), 100);
    } catch (err: any) {
      console.error(err);
      setError("Error processing resumes. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };



  const updateJDArray = (field: 'mandatorySkills' | 'optionalSkills' | 'certifications', value: string) => {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean);
    setJobDescription(prev => ({ ...prev, [field]: arr }));
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      {/* Dynamic Header */}
      <header className="mb-16 flex flex-col md:flex-row justify-between items-end gap-6 bg-white/40 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/60 shadow-2xl shadow-indigo-500/5">
        <div className="relative">
          <div className="absolute -top-4 -left-4 w-12 h-12 bg-indigo-500/10 blur-2xl rounded-full"></div>
          <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tight flex items-center gap-4">
            <span className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <i className="fa-solid fa-bolt-lightning text-2xl"></i>
            </span>
            Smart<span className="text-indigo-600">Rank</span>
          </h1>
          <p className="text-slate-500 font-semibold text-lg ml-20">Advanced Talent Intelligence Engine</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowLogicInfo(!showLogicInfo)}
            className="group px-6 py-3 bg-white text-slate-700 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all font-bold text-sm flex items-center gap-3 border border-slate-200 shadow-sm"
          >
            <i className="fa-solid fa-brain group-hover:rotate-12 transition-transform"></i> Rule Engine Logic
          </button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/25"
          >
            <i className="fa-solid fa-shield-halved"></i> Cloud Billing
          </a>
        </div>
      </header>

      {/* Logic Explained Panel */}
      {showLogicInfo && (
        <div className="mb-12 p-10 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-top-10 duration-500 border border-slate-800">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-black mb-2">Deterministic Scoring Logic</h2>
              <p className="text-slate-400 font-medium">How the SmartRank engine evaluates every profile</p>
            </div>
            <button onClick={() => setShowLogicInfo(false)} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-full transition-colors">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center mb-4">
                <i className="fa-solid fa-list-check"></i>
              </div>
              <h3 className="text-lg font-bold mb-3">Skill Matching</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">Mandatory skills are strict binary gates. Missing one results in disqualification regardless of other metrics.</p>
              <div className="text-xs font-black text-indigo-400 uppercase">+20/Mandatory • +10/Optional</div>
            </div>
            <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mb-4">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <h3 className="text-lg font-bold mb-3">Academic Tiering</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">Weights education based on hierarchy. Exceeding the target degree level yields maximum tier points.</p>
              <div className="text-xs font-black text-emerald-400 uppercase">Target: 20 pts • Below: 5 pts</div>
            </div>
            <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center mb-4">
                <i className="fa-solid fa-chart-line"></i>
              </div>
              <h3 className="text-lg font-bold mb-3">Experience Scaling</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">Linear point scaling based on years of relevant industry experience, capped at 10 years.</p>
              <div className="text-xs font-black text-amber-400 uppercase">+5 pts/Year • 50 pt max</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Requirement Sidebar */}
        <div className="lg:col-span-4">
          <aside className="glass-panel p-8 rounded-[2rem] shadow-xl sticky top-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Requirement Profile</h2>
            </div>
            
            <div className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em] mb-2">Job Designation</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-700"
                  value={jobDescription.title}
                  onChange={e => setJobDescription({...jobDescription, title: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-2">Target Exp</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full pl-5 pr-12 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold"
                      value={jobDescription.minExperience}
                      onChange={e => setJobDescription({...jobDescription, minExperience: parseInt(e.target.value) || 0})}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">YRS</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-2">Min. Degree</label>
                  <select 
                    className="w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold appearance-none cursor-pointer"
                    value={jobDescription.educationLevel}
                    onChange={e => setJobDescription({...jobDescription, educationLevel: e.target.value})}
                  >
                    {Object.keys(EDUCATION_WEIGHTS).map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-rose-500 tracking-[0.1em] mb-2">Mandatory Stack (CSV)</label>
                <textarea 
                  className="w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5 outline-none h-32 text-sm font-medium transition resize-none leading-relaxed"
                  placeholder="Essential technologies..."
                  value={jobDescription.mandatorySkills.join(', ')}
                  onChange={e => updateJDArray('mandatorySkills', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-emerald-500 tracking-[0.1em] mb-2">Bonus Skills (CSV)</label>
                <textarea 
                  className="w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none h-32 text-sm font-medium transition resize-none leading-relaxed"
                  placeholder="Nice to have..."
                  value={jobDescription.optionalSkills.join(', ')}
                  onChange={e => updateJDArray('optionalSkills', e.target.value)}
                />
              </div>
            </div>
          </aside>
        </div>

        {/* Main Workspace */}
        <div className="lg:col-span-8 space-y-12">
          {usedFallbackWarning && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 font-bold">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i>
              Notice: The app used a local fallback parser because no valid API key was available — results may be less accurate. Set `VITE_API_KEY` to enable the Gemini extractor.
            </div>
          )}
          
          {/* Candidate Pipeline */}
          <section className="glass-panel p-10 rounded-[2.5rem] shadow-xl border border-white/60">
            <div className="flex flex-wrap justify-between items-center gap-6 mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Talent Pipeline</h2>
                <p className="text-slate-400 font-medium">Add manual entries or upload bulk PDFs</p>
              </div>
              <div className="flex gap-3">
                <input 
                  type="file" 
                  multiple 
                  accept="application/pdf" 
                  className="hidden" 
                  ref={bulkInputRef}
                  onChange={handleBulkUpload}
                />
                <button 
                  onClick={() => bulkInputRef.current?.click()}
                  className="px-6 py-4 bg-indigo-50 text-indigo-700 rounded-2xl hover:bg-indigo-100 transition-all font-bold text-sm flex items-center gap-3 border border-indigo-100"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-lg"></i> Bulk Upload
                </button>
                <button 
                  onClick={handleAddCandidate}
                  className="px-6 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all font-bold text-sm flex items-center gap-3 shadow-lg shadow-slate-900/20"
                >
                  <i className="fa-solid fa-plus text-lg"></i> Manual Add
                </button>
              </div>
            </div>

          

            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="group relative p-8 border border-slate-200 rounded-3xl bg-white/40 hover:bg-white/80 hover:border-indigo-300 transition-all duration-300 shadow-sm hover:shadow-md">
                  <button 
                    onClick={() => removeCandidate(candidate.id)}
                    className="absolute top-6 right-6 text-slate-300 hover:text-rose-500 transition-colors p-2"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                  
                  <div className="grid md:grid-cols-12 gap-8 items-start">
                    <div className="md:col-span-4 space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Identity</label>
                        <input 
                          type="text" 
                          placeholder="Candidate Name"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-400 outline-none bg-white text-sm font-bold shadow-sm"
                          value={candidate.name}
                          onChange={e => updateCandidate(candidate.id, { name: e.target.value })}
                        />
                      </div>
                      
                      <div className="relative group/upload h-24">
                        <input 
                          type="file" 
                          accept="application/pdf"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => { if (e.target.files?.[0]) handlePdfUpload(candidate.id, e.target.files[0]); }}
                        />
                        <div className={`h-full border-2 border-dashed rounded-2xl flex items-center justify-center transition-all ${candidate.fileName ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white group-hover/upload:border-indigo-300'}`}>
                          {candidate.isParsing ? (
                            <div className="flex items-center gap-3">
                              <i className="fa-solid fa-circle-notch animate-spin text-indigo-500 text-xl"></i>
                              <span className="text-[10px] font-black text-indigo-500 uppercase">Parsing PDF...</span>
                            </div>
                          ) : candidate.fileName ? (
                            <div className="text-center px-4 truncate">
                              <i className="fa-solid fa-file-pdf text-emerald-500 text-xl mb-1 block"></i>
                              <span className="text-[10px] font-black text-emerald-600 uppercase truncate block">{candidate.fileName}</span>
                            </div>
                          ) : (
                            <div className="text-center">
                              <i className="fa-solid fa-file-circle-plus text-slate-300 text-xl mb-1 block"></i>
                              <span className="text-[10px] font-black text-slate-400 uppercase block">Drop Resume</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-8">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Extracted / Raw Data</label>
                      <textarea 
                        placeholder="Resume text contents will populate here..."
                        className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:border-indigo-400 outline-none h-44 bg-white text-xs leading-relaxed font-medium transition resize-none custom-scrollbar"
                        value={candidate.rawText}
                        onChange={e => updateCandidate(candidate.id, { rawText: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {candidates.length === 0 && (
                <div className="text-center py-24 bg-white/20 border-2 border-dashed border-slate-200 rounded-[2rem]">
                  <i className="fa-solid fa-users-slash text-6xl text-slate-200 mb-6 block"></i>
                  <h3 className="text-2xl font-black text-slate-300">Queue is empty</h3>
                  <p className="text-slate-400 font-medium">Initiate the pipeline by adding candidates</p>
                </div>
              )}
            </div>

            <div className="mt-12">
              <button 
                onClick={handleProcess}
                disabled={isLoading || candidates.filter(c => c.rawText.trim()).length === 0}
                className="group relative w-full py-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-3xl font-black text-2xl transition-all shadow-2xl shadow-indigo-600/30 flex justify-center items-center gap-4 overflow-hidden"
              >
                {isLoading && <div className="absolute inset-0 shimmer"></div>}
                <span className="relative z-10 flex items-center gap-4">
                  {isLoading ? (
                    <><i className="fa-solid fa-microchip animate-pulse"></i> Extracting Intelligence...</>
                  ) : (
                    <><i className="fa-solid fa-play group-hover:translate-x-1 transition-transform"></i> Rank Candidate Pool</>
                  )}
                </span>
              </button>
              {error && (
                <div className="mt-6 p-5 bg-rose-50 text-rose-600 text-sm font-bold rounded-2xl flex items-center gap-3 border border-rose-100 animate-bounce">
                  <i className="fa-solid fa-circle-exclamation text-lg"></i> {error}
                </div>
              )}
            </div>
          </section>

          {/* Intelligent Ranking Output */}
          {rankedResults.length > 0 && (
            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <div className="flex justify-between items-center px-4">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-4">
                  <i className="fa-solid fa-ranking-star text-indigo-500"></i>
                  Final Shortlist
                </h2>
                <span className="bg-indigo-600/10 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-100">
                  Top Talent Identified
                </span>
              </div>

              <div className="grid gap-6">
                {rankedResults.map((result, idx) => (
                  <div 
                    key={result.id} 
                    className="card-enter glass-panel p-2 rounded-[2.5rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300"
                    style={{ animationDelay: `${idx * 150}ms` }}
                  >
                    <div className="bg-white/90 rounded-[2.2rem] p-8 shadow-sm group-hover:shadow-xl transition-all">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        
                        <div className="flex items-center gap-8 w-full">
                          {/* Score Orbit */}
                          <div className="relative shrink-0">
                            <svg className="w-24 h-24 transform -rotate-90">
                              <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                              <circle 
                                cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * result.score.totalScore) / 250}
                                className={`${result.score.isQualified ? 'text-indigo-600' : 'text-slate-300'} transition-all duration-1000 ease-out`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={`text-2xl font-black tabular-nums ${result.score.isQualified ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {result.score.totalScore}
                              </span>
                              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Score</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{result.name}</h3>
                              {result.score.isQualified ? (
                                <span className="px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                  Qualified
                                </span>
                              ) : (
                                <span className="px-4 py-1.5 bg-slate-200 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest">
                                  Disqualified
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs font-bold">
                              <span className="text-slate-500 flex items-center gap-1.5">
                                <i className="fa-solid fa-business-time text-indigo-400"></i> {result.experienceYears} Years Experience
                              </span>
                              <span className="text-slate-500 flex items-center gap-1.5">
                                <i className="fa-solid fa-graduation-cap text-indigo-400"></i> {result.education}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-center md:text-right">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Rank Match</div>
                          <div className={`text-5xl font-black italic tracking-tighter ${idx === 0 ? 'text-indigo-600' : 'text-slate-200'}`}>
                            #{idx + 1}
                          </div>
                        </div>
                      </div>

                      {/* Detail Breakdown */}
                      <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4 pt-8 border-t border-slate-100">
                        <div className="bg-slate-50/50 p-4 rounded-2xl text-center hover:bg-white transition-colors border border-transparent hover:border-slate-100">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Mandatory</div>
                          <div className="text-lg font-black text-slate-800">+{result.score.mandatorySkillsScore}</div>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-2xl text-center hover:bg-white transition-colors border border-transparent hover:border-slate-100">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Optional</div>
                          <div className="text-lg font-black text-slate-800">+{result.score.optionalSkillsScore}</div>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-2xl text-center hover:bg-white transition-colors border border-transparent hover:border-slate-100">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Exp Rank</div>
                          <div className="text-lg font-black text-slate-800">+{result.score.experienceScore}</div>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-2xl text-center hover:bg-white transition-colors border border-transparent hover:border-slate-100">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Academic</div>
                          <div className="text-lg font-black text-slate-800">+{result.score.educationScore}</div>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-2xl text-center hover:bg-white transition-colors border border-transparent hover:border-slate-100">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Certs</div>
                          <div className="text-lg font-black text-slate-800">+{result.score.certificationScore}</div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2">
                        {result.skillsFound.map((skill, i) => (
                          <span key={i} className="px-3 py-1.5 bg-indigo-50/50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-tight border border-indigo-100/50">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
      
      <footer className="mt-32 text-center pb-20 opacity-50">
        <p className="font-black text-[10px] uppercase tracking-[0.4em] text-slate-400">SmartRank Intelligence System &bull; Enterprise Edition v2.1</p>
      </footer>
    </div>
  );
};

export default App;