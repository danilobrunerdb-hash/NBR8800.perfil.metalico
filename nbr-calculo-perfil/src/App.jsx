import React, { useState, useEffect } from 'react';
import { processFtoolImage } from './lib/ocr';
import IBeamSVG from './components/IBeamSVG';
import html2pdf from 'html2pdf.js';
import { calculateProfile } from './lib/calculator';
import profilesData from './data/profiles.json';

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileName, setSelectedProfileName] = useState('');
  const [loads, setLoads] = useState({ Mxsd: 35, Mysd: 0, Vxsd: 0, Vysd: 48, Nt_sd: 0, Nc_sd: 0, Lb: 160, Lx: 160, Ly: 160 });
  const [material, setMaterial] = useState({ fy: 345, E: 200000, Kv: 5.34, gamma_a1: 1.10 });
  const [results, setResults] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [ocrProgress, setOcrProgress] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Aba ativa: 'verificador' ou 'memorial'
  const [activeTab, setActiveTab] = useState('verificador');

  useEffect(() => {
    if (isDarkMode) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    setProfiles(profilesData);
    if (profilesData.length > 0) setSelectedProfileName(profilesData[0].nome);
  }, []);

  useEffect(() => {
    if (!selectedProfileName || profiles.length === 0) return;
    const profile = profiles.find(p => p.nome === selectedProfileName);
    if (profile) {
      // Ajuste automático do Nsd com base nas entradas de Tração e Compressão
      const nt = parseFloat(loads.Nt_sd) || 0;
      const nc = parseFloat(loads.Nc_sd) || 0;
      const computedNsd = nt > 0 ? nt : -nc;

      const finalLoads = { ...loads, Nsd: computedNsd };

      const resultsData = calculateProfile(profile, finalLoads, material);
      setProfileData(profile);
      setResults(resultsData);
    }
  }, [selectedProfileName, loads, material, profiles]);

  const handleLoadChange = (e) => {
    const { name, value } = e.target;
    setLoads(prev => ({ ...prev, [name]: value }));
  };

  const handleMaterialChange = (e) => {
    const { name, value } = e.target;
    setMaterial(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrProgress('Processando...');
    const text = await processFtoolImage(file, (msg) => {
      if (msg.status === 'recognizing text') setOcrProgress(`Lendo... ${Math.round(msg.progress * 100)}%`);
    });
    const mMatch = text.match(/M(?:ax|sd)?.*?([\d.,]+)/i);
    const vMatch = text.match(/V(?:ax|sd)?.*?([\d.,]+)/i);
    if (mMatch) setLoads(prev => ({ ...prev, Mxsd: parseFloat(mMatch[1].replace(',', '.')) }));
    if (vMatch) setLoads(prev => ({ ...prev, Vysd: parseFloat(vMatch[1].replace(',', '.')) }));
    setOcrProgress('Processado!');
    setTimeout(() => setOcrProgress(''), 3000);
  };

  const findLightestProfile = async () => {
    let lightest = null;
    let minArea = Infinity;
    for (const p of profiles) {
      try {
        const res = await fetch('http://localhost:3001/api/calcular', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileName: p.nome, loads, material })
        });
        const data = await res.json();
        if (data.results && data.results.overallPass) {
          if (data.profile.Area < minArea) {
            minArea = data.profile.Area;
            lightest = p;
          }
        }
      } catch (err) { }
    }
    if (lightest) setSelectedProfileName(lightest.nome);
    else alert("Nenhum perfil atende aos esforços solicitados!");
  };

  const downloadPDF = () => {
    // A melhor forma de gerar um PDF de alta qualidade (vetorizado, texto selecionável)
    // é usando a impressão nativa do navegador (Salvar como PDF), com CSS @media print.
    if (activeTab !== 'memorial') {
      setActiveTab('memorial');
      setTimeout(() => {
        window.print();
      }, 500);
    } else {
      window.print();
    }
  };

  const RenderCriteriaCard = ({ title, sd, rd, lambda, lambda_p, formula, unit }) => {
    if (!rd) return null;
    const isPass = rd >= sd;
    const ratio = (sd / rd) * 100;
    const percentText = ratio.toFixed(1) + '%';
    const widthPercent = Math.min(ratio, 100);

    return (
      <div className={`p-2 rounded-xl border transition-colors flex flex-col gap-1.5 ${isPass ? 'bg-surface-container-low border-outline-variant/30' : 'bg-error/5 border-error/20'}`}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold text-on-surface leading-tight break-words pr-2">{title}</span>
          {isPass ? (
            <span className="text-[9px] text-success font-bold flex items-center gap-0.5 shrink-0"><span className="material-symbols-outlined text-[12px]">check</span> OK</span>
          ) : (
            <span className="text-[9px] text-error font-bold flex items-center gap-0.5 shrink-0"><span className="material-symbols-outlined text-[12px]">close</span> FALHA</span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-grow bg-surface-container-high rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${isPass ? 'bg-primary' : 'bg-error'}`} style={{ width: `${widthPercent}%` }}></div>
          </div>
          <span className={`text-[9px] font-black ${isPass ? 'text-primary' : 'text-error'}`}>{percentText}</span>
        </div>

        {/* Details */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mt-1 gap-1">
          <div className="text-[8px] font-data-mono text-on-surface-variant leading-tight">
            {(lambda !== undefined && lambda_p !== undefined) && (
              <p>λ={lambda.toFixed(1)} <span className="opacity-50">|</span> λp={lambda_p.toFixed(1)}</p>
            )}
            <p className="font-bold opacity-80 mt-0.5">{formula}</p>
          </div>
          <div className="text-left xl:text-right mt-1 xl:mt-0">
            <span className="text-[7px] text-on-surface-variant uppercase tracking-wider block mb-0.5">Resistência</span>
            <p className="text-[11px] font-black text-on-surface leading-none">{rd.toFixed(2)} <span className="text-[8px] font-normal text-on-surface-variant">{unit}</span></p>
          </div>
        </div>
      </div>
    );
  };

  if (!results || !profileData) return <div className="p-8 text-center font-bold text-primary">Iniciando sistema... Verifique se o backend está rodando em localhost:3001!</div>;

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col">

      {/* TopAppBar com as Abas Integradas */}
      <header className="bg-gradient-to-r from-primary to-primary-container dark:bg-none dark:bg-[#003874] text-white sticky top-0 z-50 shadow-lg shadow-primary/20 dark:shadow-none dark:border-b dark:border-white/10">
        <div className="flex justify-between items-center px-margin-desktop h-12 w-full max-w-[1440px] mx-auto">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-white text-[28px]" data-icon="grid_view">grid_view</span>
            <span className="text-headline-md font-black tracking-tight text-white">VERIFICAÇÃO PERFIL I E W <span className="font-light opacity-80">NBR 8800</span></span>
          </div>

          {/* Main Navigation Tabs */}
          <nav className="hidden md:flex gap-lg items-center h-full">
            <button
              onClick={() => setActiveTab('verificador')}
              className={`h-full flex items-center px-sm transition-all text-label-caps border-b-2 ${activeTab === 'verificador' ? 'text-white border-white font-bold' : 'text-white/60 border-transparent hover:text-white/90'}`}
            >
              VERIFICADOR
            </button>
            <button
              onClick={() => setActiveTab('memorial')}
              className={`h-full flex items-center px-sm transition-all text-label-caps border-b-2 ${activeTab === 'memorial' ? 'text-white border-white font-bold' : 'text-white/60 border-transparent hover:text-white/90'}`}
            >
              MEMORIAL DE CÁLCULO
            </button>
            <button
              onClick={() => setActiveTab('tabela')}
              className={`h-full flex items-center px-sm transition-all text-label-caps border-b-2 ${activeTab === 'tabela' ? 'text-white border-white font-bold' : 'text-white/60 border-transparent hover:text-white/90'}`}
            >
              TABELA DE PERFIS
            </button>
            <button
              onClick={downloadPDF}
              className="h-full flex items-center gap-xs px-sm transition-all text-label-caps border-b-2 border-transparent text-white/60 hover:text-white/90"
            >
              <span className="material-symbols-outlined text-[16px]" data-icon="download">download</span>
              BAIXAR PDF
            </button>
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors" onClick={() => setIsDarkMode(!isDarkMode)}>
              <span className="material-symbols-outlined text-white/80" data-icon="dark_mode">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-white/80" data-icon="help">help</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-margin-desktop space-y-4 max-w-[1440px] mx-auto w-full">

        {/* VIEW: VERIFICADOR */}
        {activeTab === 'verificador' && (
          <div className="grid grid-cols-12 gap-4">

            {/* Left Column: Inputs */}
            <section className="col-span-12 lg:col-span-3 space-y-3">
              <div className="bg-surface-container-lowest rounded-xl p-1 px-2 pt-4 shadow-2xl shadow-primary/20 border-2 border-primary/40 relative overflow-hidden ring-4 ring-primary/5">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-primary-container"></div>
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-xs" data-icon="layers">layers</span>
                    <span className="text-label-caps uppercase tracking-widest text-[10px]">1. Escolha o Perfil</span>
                  </div>
                  <select value={selectedProfileName} onChange={e => setSelectedProfileName(e.target.value)} className="w-full bg-primary/10 border-2 border-primary rounded-xl py-1 px-2 text-lg sm:text-lg font-black text-primary text-center cursor-pointer shadow-sm hover:bg-primary/20 focus:ring-4 focus:ring-primary/30 transition-all">
                    {profiles.map(p => <option key={p.nome} value={p.nome} className="text-sm text-left font-bold">{p.nome}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-xs" data-icon="hardware">hardware</span>
                    <span className="text-label-caps uppercase tracking-widest text-[10px]">2. Propriedades do Aço</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">TENSÃO (fy)</label>
                      <div className="relative mt-auto">
                        <input name="fy" type="number" value={material.fy} onChange={handleMaterialChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary pr-8" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">MPa</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">MÓDULO (E)</label>
                      <div className="relative mt-auto">
                        <input name="E" type="number" value={material.E} onChange={handleMaterialChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary pr-8" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">MPa</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">CISALH. (kv)</label>
                      <input name="Kv" type="number" step="0.01" value={material.Kv} onChange={handleMaterialChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary mt-auto" />
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">SEGURANÇA (γa1)</label>
                      <input name="gamma_a1" type="number" step="0.05" value={material.gamma_a1} onChange={handleMaterialChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary mt-auto" />
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-xs" data-icon="monitoring">monitoring</span>
                    <span className="text-label-caps uppercase tracking-widest text-[10px]">3. Esforços Solicitantes</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">MOMENTO X (Mx,sd)</label>
                      <div className="relative mt-auto">
                        <input name="Mxsd" type="number" value={loads.Mxsd} onChange={handleLoadChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary pr-8" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">kN.m</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">MOMENTO Y (My,sd)</label>
                      <div className="relative mt-auto">
                        <input name="Mysd" type="number" value={loads.Mysd} onChange={handleLoadChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary pr-8" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">kN.m</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">CORTANTE X (Vx,sd)</label>
                      <div className="relative mt-auto">
                        <input name="Vxsd" type="number" value={loads.Vxsd} onChange={handleLoadChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary pr-8" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">kN</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">CORTANTE Y (Vy,sd)</label>
                      <div className="relative mt-auto">
                        <input name="Vysd" type="number" value={loads.Vysd} onChange={handleLoadChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary pr-8" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">kN</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">TRAÇÃO (Nt,sd)</label>
                      <div className="relative mt-auto">
                        <input name="Nt_sd" type="number" value={loads.Nt_sd} onChange={handleLoadChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary pr-8" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">kN</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">COMPRESSÃO (Nc,sd)</label>
                      <div className="relative mt-auto">
                        <input name="Nc_sd" type="number" value={loads.Nc_sd} onChange={handleLoadChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary pr-8" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">kN</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-xs" data-icon="straighten">straighten</span>
                    <span className="text-label-caps uppercase tracking-widest text-[10px]">4. Comprimentos</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">FLAMB. TORÇÃO (Lb)</label>
                      <div className="relative mt-auto">
                        <input name="Lb" type="number" value={loads.Lb} onChange={handleLoadChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary pr-8" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">cm</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">FLAMB. EIXO X (Lx)</label>
                      <div className="relative mt-auto">
                        <input name="Lx" type="number" value={loads.Lx} onChange={handleLoadChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary pr-8" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">cm</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">FLAMB. EIXO Y (Ly)</label>
                      <div className="relative mt-auto">
                        <input name="Ly" type="number" value={loads.Ly} onChange={handleLoadChange} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary pr-8" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-outline">cm</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="text-label-caps text-[10px] text-on-surface-variant mb-1">FATOR (Cb)</label>
                      <input type="number" value="1" readOnly className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-1 px-2 text-xs font-bold text-primary opacity-50 mt-auto" />
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="p-1 px-2 bg-primary-fixed/10 rounded-xl border border-primary/30 flex flex-col justify-center items-center text-center w-full">
                    <span className="text-[10px] text-primary font-bold">Zx MÍN. REQ.</span>
                    <span className="text-[9px] text-on-surface-variant font-medium">(Mxsd * γa1) / fy</span>
                    <span className="text-lg font-black text-primary mt-1">{results.Zx_min.toFixed(2)} <span className="text-[10px] font-normal">cm³</span></span>
                  </div>
                </div>
                <div className="space-y-1">
                  <button onClick={findLightestProfile} className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold flex items-center justify-center gap-1 hover:opacity-90 transition-all text-label-caps shadow-lg active:scale-95">
                    <span className="material-symbols-outlined" data-icon="search_insights">search_insights</span> OTIMIZAR PARA MAIS LEVE
                  </button>
                </div>
              </div>
            </section>

            {/* Center Column: Geometry */}
            <section className="col-span-12 lg:col-span-5 flex flex-col gap-2">
              <div className="bg-surface-container-lowest rounded-xl p-1 px-2 custom-shadow border border-outline-variant/30 flex-grow">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-label-caps font-bold text-on-surface">GEOMETRIA DO PERFIL</h2>
                  <span className="material-symbols-outlined text-outline cursor-help" data-icon="info">info</span>
                </div>
                <div className="aspect-square w-full max-w-[400px] mx-auto bg-surface-container-low rounded-xl relative flex items-center justify-center border border-outline-variant/50 p-1 px-2">
                  <IBeamSVG profile={profileData} />
                </div>
                <div className="mt-2">
                  <div className="grid grid-cols-6 gap-1">
                    {[
                      { key: 'Massa', label: 'MASSA (kg/m)', val: selectedProfileName ? selectedProfileName.split('x')[1]?.trim() : '-' },
                      { key: 'Area', label: 'ÁREA (cm²)', val: profileData.Area },
                      { key: 'd', label: 'd (mm)', val: (profileData.d * 10).toFixed(0) },
                      { key: 'bf', label: 'bf (mm)', val: (profileData.bf * 10).toFixed(0) },
                      { key: 'tw', label: 'tw (mm)', val: (profileData.tw * 10).toFixed(1) },
                      { key: 'tf', label: 'tf (mm)', val: (profileData.tf * 10).toFixed(1) },
                      { key: 'h', label: 'h (mm)', val: (profileData.h * 10).toFixed(0) },
                      { key: 'd_linha', label: "d' (mm)", val: (profileData.d_linha * 10).toFixed(0) },
                      { key: 'Ix', label: 'Ix (cm⁴)', val: profileData.Ix },
                      { key: 'Wx', label: 'Wx (cm³)', val: profileData.Wx },
                      { key: 'rx', label: 'rx (cm)', val: profileData.rx },
                      { key: 'Zx', label: 'Zx (cm³)', val: profileData.Zx },
                      { key: 'Iy', label: 'Iy (cm⁴)', val: profileData.Iy },
                      { key: 'Wy', label: 'Wy (cm³)', val: profileData.Wy },
                      { key: 'ry', label: 'ry (cm)', val: profileData.ry },
                      { key: 'Zy', label: 'Zy (cm³)', val: profileData.Zy },
                      { key: 'rt', label: 'rt (cm)', val: profileData.rt },
                      { key: 'It', label: 'It (cm⁴)', val: profileData.It },
                      { key: 'MESA', label: 'MESA (λf)', val: (profileData.bf / (2 * profileData.tf)).toFixed(2) },
                      { key: 'ALMA', label: 'ALMA (λw)', val: (profileData.d_linha / profileData.tw).toFixed(2) },
                      { key: 'Cw', label: 'Cw (cm⁶)', val: profileData.Cw },
                    ].map((prop, idx) => (
                      <div key={idx} className={`bg-surface-container-low p-1 rounded-md border text-center hover:bg-surface-container-high transition-colors ${prop.key === 'Zx' ? 'border-blue-500 border-2 shadow-md bg-blue-50/50 dark:bg-blue-900/20' : 'border-outline-variant'}`}>
                        <p className="text-[9px] text-on-surface-variant font-bold mb-1">{prop.label}</p>
                        <p className="text-sm font-black text-on-surface">{prop.val || '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Right Column: Resumo dos Resultados */}
            <section className="col-span-12 lg:col-span-4 flex flex-col h-full max-h-full bg-surface-container-lowest rounded-xl shadow-2xl shadow-primary/20 border-2 border-primary/40 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-primary-container"></div>

              <div className="p-3 flex flex-col h-full overflow-hidden">
                <h2 className="text-sm font-black text-primary tracking-tight mb-2 uppercase">Resumo dos Resultados</h2>

                <div className="flex justify-between items-end mb-1">
                  <span className="text-label-caps text-[10px] text-on-surface-variant">Taxa de Esforços Combinados</span>
                  <span className="text-label-caps font-bold text-primary">{results.Combined.ratio.toFixed(2)}</span>
                </div>

                <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${results.overallPass ? 'bg-green-500' : 'bg-error'}`}
                    style={{ width: `${Math.min(results.Combined.ratio * 100, 100)}%` }}
                  ></div>
                </div>

                <hr className="border-outline-variant/30 mb-2" />

                {/* Cards Combinados (Progresso + Fórmula) ocupando todo o espaço */}
                <div className="flex-grow grid grid-cols-2 2xl:grid-cols-3 gap-2 overflow-y-auto pr-1 scrollbar-hide pb-4">
                  <RenderCriteriaCard
                    title="FLT (Momento X)"
                    sd={loads.Mxsd}
                    rd={results.FLT.Mrd}
                    lambda={results.FLT.lambda}
                    lambda_p={results.FLT.lambda_p}
                    unit="kN.m"
                    formula={results.FLT.lambda <= results.FLT.lambda_p ? 'Mpl / γa1 (Plástico)' : results.FLT.lambda <= results.FLT.lambda_r ? 'Inelástico / γa1' : 'Mcr / γa1 (Elástico)'}
                  />
                  <RenderCriteriaCard
                    title="FLM (Momento X)"
                    sd={loads.Mxsd}
                    rd={results.FLM.Mrd}
                    lambda={results.FLM.lambda}
                    lambda_p={results.FLM.lambda_p}
                    unit="kN.m"
                    formula={results.FLM.lambda <= results.FLM.lambda_p ? 'Mpl / γa1 (Compacta)' : results.FLM.lambda <= results.FLM.lambda_r ? 'Inelástica / γa1' : 'Mcr / γa1 (Esbelta)'}
                  />
                  <RenderCriteriaCard
                    title="FLA (Momento X)"
                    sd={loads.Mxsd}
                    rd={results.FLA.Mrd}
                    lambda={results.FLA.lambda}
                    lambda_p={results.FLA.lambda_p}
                    unit="kN.m"
                    formula={results.FLA.lambda <= results.FLA.lambda_p ? 'Mpl / γa1 (Compacta)' : results.FLA.lambda <= results.FLA.lambda_r ? 'Inelástica / γa1' : 'Seção Esbelta'}
                  />
                  <RenderCriteriaCard
                    title="Flexão Eixo Y (FLMy)"
                    sd={loads.Mysd}
                    rd={results.BendingY?.Mrd}
                    unit="kN.m"
                    formula={'Mpl_y / γa1'}
                  />
                  <RenderCriteriaCard
                    title="Cisalhamento (Vy)"
                    sd={loads.Vysd}
                    rd={results.Shear.Vrd}
                    lambda={results.Shear.lambda}
                    lambda_p={results.Shear.lambda_p}
                    unit="kN"
                    formula={results.Shear.lambda <= results.Shear.lambda_p ? 'Vpl / γa1 (Escoamento)' : 'Flamb. Cisalhamento'}
                  />
                  <RenderCriteriaCard
                    title="Cisalhamento (Vx)"
                    sd={loads.Vxsd}
                    rd={results.ShearX?.Vrd}
                    unit="kN"
                    formula={'Vpl_x / γa1'}
                  />
                  <RenderCriteriaCard
                    title="Tração (NtRd)"
                    sd={loads.Nt_sd}
                    rd={results.Tension?.NtRd}
                    unit="kN"
                    formula={'Ag * fy / γa1'}
                  />
                  <RenderCriteriaCard
                    title="Compressão (NcRd)"
                    sd={loads.Nc_sd}
                    rd={results.Compression?.NcRd}
                    unit="kN"
                    formula={'χ * Aef * fy / γa1'}
                  />
                  <RenderCriteriaCard
                    title="Esforços Combinados"
                    sd={results.Combined?.ratio}
                    rd={1.0}
                    unit="Ratio"
                    formula={(parseFloat(loads.Nt_sd) > 0 || parseFloat(loads.Nc_sd) > 0) ? 'N/NtRd + Mx/Mrdx + My/Mrdy <= 1' : 'Ver NBR 8800 (Item 5.5)'}
                  />
                </div>

                {results.overallPass ? (
                  <div className="mt-lg bg-[#22c55e]/5 border border-[#22c55e]/20 p-3 rounded-xl text-center shadow-sm transition-all hover:bg-[#22c55e]/10">
                    <span className="text-headline-sm font-black text-[#15803d] uppercase tracking-widest flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[24px]">verified</span>
                      PERFIL APROVADO
                    </span>
                  </div>
                ) : (
                  <div className="mt-lg bg-error/5 border border-error/20 p-3 rounded-xl text-center shadow-sm transition-all hover:bg-error/10">
                    <span className="text-headline-sm font-black text-error uppercase tracking-widest flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[24px]">dangerous</span>
                      PERFIL REPROVADO
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
        {/* VIEW: MEMORIAL DE CÁLCULO (Agora Completo) */}
        {activeTab === 'memorial' && (
          <section id="memorial-container" className="bg-white text-black p-8 md:p-12 print:p-0 mx-auto w-full max-w-[900px] border border-outline-variant/30 print:border-none shadow-lg print:shadow-none">
            {/* Header */}
            <div className="border-b-4 border-primary pb-6 mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black text-primary tracking-tight">MEMORIAL DE CÁLCULO</h1>
                <h2 className="text-xl font-bold text-[#4b5563] mt-1">Verificação de Perfil Metálico - NBR 8800</h2>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#9ca3af]">DATA: {new Date().toLocaleDateString('pt-BR')}</p>
                <div className="mt-2 bg-primary text-white py-1 px-4 rounded-md inline-block">
                  <p className="font-black text-lg">{profileData.nome}</p>
                </div>
              </div>
            </div>

            {/* 1. DADOS DE ENTRADA */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-primary border-b-2 border-primary/20 pb-2 mb-4">1. DADOS DE ENTRADA</h3>
              <div className="grid grid-cols-2 gap-6">
                {/* Geometria */}
                <div className="bg-[#f3f4f6] p-4 rounded-lg border border-[#e5e7eb]">
                  <h4 className="text-xs font-bold text-[#4b5563] mb-2">PROPRIEDADES DO PERFIL</h4>
                  <ul className="text-sm space-y-1 font-mono">
                    <li><strong>Massa:</strong> {selectedProfileName.split('x')[1]?.trim()} kg/m</li>
                    <li><strong>Área (Ag):</strong> {profileData.Area} cm²</li>
                    <li><strong>Ix:</strong> {profileData.Ix} cm⁴ | <strong>Wx:</strong> {profileData.Wx} cm³</li>
                    <li><strong>Iy:</strong> {profileData.Iy} cm⁴ | <strong>Wy:</strong> {profileData.Wy} cm³</li>
                    <li><strong>d:</strong> {(profileData.d * 10).toFixed(0)} mm | <strong>bf:</strong> {(profileData.bf * 10).toFixed(0)} mm</li>
                  </ul>
                </div>
                {/* Esforços e Aço */}
                <div className="bg-[#f3f4f6] p-4 rounded-lg border border-[#e5e7eb]">
                  <h4 className="text-xs font-bold text-[#4b5563] mb-2">ESFORÇOS E MATERIAIS</h4>
                  <ul className="text-sm space-y-1 font-mono">
                    <li><strong>Aço:</strong> fy = {material.fy} MPa | E = {material.E} MPa</li>
                    <li><strong>Gama (γa1):</strong> {material.gamma_a1}</li>
                    <li><strong>Momento X (Mxsd):</strong> {loads.Mxsd} kN.m | <strong>Momento Y (Mysd):</strong> {loads.Mysd} kN.m</li>
                    <li><strong>Cortante X (Vxsd):</strong> {loads.Vxsd} kN | <strong>Cortante Y (Vysd):</strong> {loads.Vysd} kN</li>
                    <li><strong>Normal (Nsd):</strong> {loads.Nsd} kN</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. RESISTÊNCIA À TRAÇÃO */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-primary border-b-2 border-primary/20 pb-2 mb-4">2. VERIFICAÇÃO À TRAÇÃO (ITEM 5.2.2)</h3>
              <div className="border border-[#e5e7eb] rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div>
                    <p><strong>Cálculo do Esforço Resistente (NtRd):</strong></p>
                    <p className="mt-1 text-[#6b7280]">NtRd = (Ag * Fy) / γa1</p>
                    <p>NtRd = ({profileData.Area} * {(material.fy/10).toFixed(1)}) / {material.gamma_a1}</p>
                    <p className="mt-1 text-primary">NtRd = <strong>{results.Tension.NtRd.toFixed(2)}</strong> kN</p>
                  </div>
                  <div>
                    <p><strong>Esforço Solicitante:</strong></p>
                    <p>NtSd = <strong>{Math.max(loads.Nsd, 0).toFixed(2)}</strong> kN</p>
                    <p className="mt-2 text-[#6b7280]">Índice de Solicitação (Sd/Rd):</p>
                    <p>Razão = <strong>{results.Tension.NtRd > 0 ? ((Math.max(loads.Nsd, 0)/results.Tension.NtRd)*100).toFixed(2) : '0.00'}%</strong></p>
                  </div>
                </div>
                <div className={`mt-4 p-3 rounded text-sm border ${results.Tension.pass ? 'bg-[#eff6ff] border-[#bfdbfe]' : 'bg-[#fef2f2] border-[#fecaca]'}`}>
                  <p><strong>Conclusão:</strong> <span className="font-bold">{results.Tension.pass ? 'APROVADO' : 'REPROVADO'}</span> à Tração</p>
                </div>
              </div>
            </div>

            {/* 3. RESISTÊNCIA À COMPRESSÃO */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-primary border-b-2 border-primary/20 pb-2 mb-4">3. VERIFICAÇÃO À COMPRESSÃO (ITEM 5.3)</h3>
              <div className="space-y-4">
                <div className="border border-[#e5e7eb] rounded-lg p-4">
                  <h4 className="font-bold text-primary mb-2">3.1. Flambagem Global (Carga Crítica Ne)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div>
                      <p className="text-[#6b7280] mb-1">Cargas Críticas Elásticas (Nex, Ney, Nez):</p>
                      <p>Nex = (π²*E*Ix)/Lx² = <strong>{results.Compression.Nex.toFixed(2)}</strong> kN</p>
                      <p>Ney = (π²*E*Iy)/Ly² = <strong>{results.Compression.Ney.toFixed(2)}</strong> kN</p>
                      <p>Nez = (π²*E*Cw/Lz² + G*It) / r₀² = <strong>{results.Compression.Nez.toFixed(2)}</strong> kN</p>
                      <p className="mt-2 p-1 bg-gray-50 border border-gray-200">Ne = min(Nex, Ney, Nez) = <strong>{results.Compression.Ne.toFixed(2)}</strong> kN</p>
                    </div>
                    <div>
                      <p className="text-[#6b7280] mb-1">Fator de Redução (χ):</p>
                      <p>λ₀ = √(Ag*Fy / Ne)</p>
                      <p>λ₀ = √({profileData.Area}*{(material.fy/10).toFixed(1)} / {results.Compression.Ne.toFixed(2)}) = <strong>{results.Compression.lambda0.toFixed(2)}</strong></p>
                      <p className="mt-2 text-[#6b7280]">
                        {results.Compression.lambda0 <= 1.5 ? 'Como λ₀ ≤ 1.5: χ = 0.658^(λ₀²)' : 'Como λ₀ > 1.5: χ = 0.877 / λ₀²'}
                      </p>
                      <p>χ = <strong>{results.Compression.chi.toFixed(3)}</strong></p>
                    </div>
                  </div>
                </div>
                
                <div className="border border-[#e5e7eb] rounded-lg p-4">
                  <h4 className="font-bold text-primary mb-2">3.2. Flambagem Local (Item 5.3.4.2)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono mb-4">
                    <div className="p-2 border border-gray-100 bg-gray-50 rounded">
                      <p className="underline mb-2 font-bold text-primary">Grupo AL (Mesas):</p>
                      <p>Largura/Espessura (b/t) = bf / (2*tf) = <strong>{results.Compression.AL.bt.toFixed(2)}</strong></p>
                      <p>Limite Elástico (b/t_lim) = 0.56*√(E/Fy) = <strong>{results.Compression.AL.bt_lim.toFixed(2)}</strong></p>
                      <p>Tensão (σ_el) = (b/t_lim / b/t)² * Fy = <strong>{(results.Compression.AL.sigma_el/10).toFixed(2)}</strong> kN/cm²</p>
                      <p className="mt-1">λ_AL = <strong>{results.Compression.AL.lambda_lim.toFixed(2)}</strong></p>
                      <p className="mt-2 border-t pt-1">Largura Efetiva (bef) = <strong>{(results.Compression.AL.bef*10).toFixed(1)}</strong> mm</p>
                    </div>
                    <div className="p-2 border border-gray-100 bg-gray-50 rounded">
                      <p className="underline mb-2 font-bold text-primary">Grupo AA (Alma):</p>
                      <p>Largura/Espessura (b/t) = d' / tw = <strong>{results.Compression.AA.bt.toFixed(2)}</strong></p>
                      <p>Limite Elástico (b/t_lim) = 1.49*√(E/Fy) = <strong>{results.Compression.AA.bt_lim.toFixed(2)}</strong></p>
                      <p>Tensão (σ_el) = (b/t_lim / b/t)² * Fy = <strong>{(results.Compression.AA.sigma_el/10).toFixed(2)}</strong> kN/cm²</p>
                      <p className="mt-1">λ_AA = <strong>{results.Compression.AA.lambda_lim.toFixed(2)}</strong></p>
                      <p className="mt-2 border-t pt-1">Largura Efetiva (bef) = <strong>{(results.Compression.AA.bef*10).toFixed(1)}</strong> mm</p>
                    </div>
                  </div>
                  <div className="bg-[#f8fafc] p-3 rounded border border-[#cbd5e1] text-sm font-mono flex justify-between items-center">
                    <div>
                      <p className="text-[#6b7280]">Aef = Ag - ∑ (b - bef)*t</p>
                      <span>Área Bruta (Ag) = {profileData.Area} cm²</span>
                    </div>
                    <span className="font-bold text-primary text-base">Aef = {results.Compression.Aef.toFixed(2)} cm²</span>
                  </div>
                </div>

                <div className="border border-[#e5e7eb] rounded-lg p-4">
                  <h4 className="font-bold text-primary mb-2">3.3. Resistência de Cálculo (NcRd)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div>
                      <p className="mt-1 text-[#6b7280]">NcRd = (χ * Aef * Fy) / γa1</p>
                      <p>NcRd = ({results.Compression.chi.toFixed(3)} * {results.Compression.Aef.toFixed(2)} * {(material.fy/10).toFixed(1)}) / {material.gamma_a1}</p>
                      <p className="mt-1 text-primary">NcRd = <strong>{results.Compression.NcRd.toFixed(2)}</strong> kN</p>
                    </div>
                    <div>
                      <p>Esforço Solicitante Normal (NcSd): <strong>{Math.abs(Math.min(loads.Nsd, 0)).toFixed(2)}</strong> kN</p>
                      <p className="mt-2 text-[#6b7280]">Índice de Solicitação (Sd/Rd):</p>
                      <p>Razão = <strong>{results.Compression.NcRd > 0 ? ((Math.abs(Math.min(loads.Nsd, 0))/results.Compression.NcRd)*100).toFixed(2) : '0.00'}%</strong></p>
                    </div>
                  </div>
                  <div className={`mt-4 p-3 rounded text-sm border ${results.Compression.pass ? 'bg-[#eff6ff] border-[#bfdbfe]' : 'bg-[#fef2f2] border-[#fecaca]'}`}>
                    <p><strong>Conclusão:</strong> <span className="font-bold">{results.Compression.pass ? 'APROVADO' : 'REPROVADO'}</span> à Compressão</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. VERIFICAÇÃO À FLEXÃO X */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-primary border-b-2 border-primary/20 pb-2 mb-4">4. VERIFICAÇÃO À FLEXÃO X-X (ITEM 5.4.2)</h3>
              <p className="text-sm mb-4 text-[#4b5563]">MrdX = min(Mrd,FLT ; Mrd,FLM ; Mrd,FLA).</p>

              <div className="space-y-4">
                {/* FLT */}
                <div className="border border-[#e5e7eb] rounded-lg p-4">
                  <h4 className="font-bold text-primary mb-2">4.1. Flambagem Lateral com Torção (FLT)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div>
                      <p className="text-[#6b7280]">Parâmetro de Esbeltez:</p>
                      <p>λ = Lb / ry = {loads.Lb} / {profileData.ry} = <strong>{results.FLT.lambda.toFixed(2)}</strong></p>
                      <p className="text-[#6b7280] mt-2">Limites Normativos:</p>
                      <p>λp = 1.76 * √(E/Fy) = <strong>{results.FLT.lambda_p.toFixed(2)}</strong></p>
                      <p>λr = (Cálculo via Anexo G NBR8800) = <strong>{results.FLT.lambda_r ? results.FLT.lambda_r.toFixed(2) : '-'}</strong></p>
                    </div>
                    <div>
                      <p className="text-[#6b7280]">Momentos de Referência:</p>
                      <p>Mpl = Zx * Fy = <strong>{results.FLT.Mpl.toFixed(2)}</strong> kN.cm</p>
                      <p>Mr = Wx * (Fy - σr) = <strong>{results.FLT.Mr.toFixed(2)}</strong> kN.cm</p>
                      <p>Mcr = (Equação Anexo G) = <strong>{results.FLT.Mrc ? results.FLT.Mrc.toFixed(2) : '-'}</strong> kN.cm</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-[#eff6ff] p-3 rounded text-sm border border-[#bfdbfe]">
                    <p><strong>Regime:</strong> {results.FLT.lambda <= results.FLT.lambda_p ? 'Plástico (λ ≤ λp)' : results.FLT.lambda <= results.FLT.lambda_r ? 'Inelástico (λp < λ ≤ λr)' : 'Elástico (λ > λr)'}</p>
                    <p className="mt-1 text-base font-bold text-[#1e3a8a]">Mrd,FLT = {results.FLT.Mrd.toFixed(2)} kN.m</p>
                  </div>
                </div>

                {/* FLM */}
                <div className="border border-[#e5e7eb] rounded-lg p-4">
                  <h4 className="font-bold text-primary mb-2">4.2. Flambagem Local da Mesa (FLM)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div>
                      <p className="text-[#6b7280]">Parâmetro de Esbeltez:</p>
                      <p>λ = bf / (2*tf) = {profileData.bf} / (2*{profileData.tf}) = <strong>{results.FLM.lambda.toFixed(2)}</strong></p>
                      <p className="text-[#6b7280] mt-2">Limites Normativos:</p>
                      <p>λp = 0.38 * √(E/Fy) = <strong>{results.FLM.lambda_p.toFixed(2)}</strong></p>
                      <p>λr = 0.83 * √(E/(Fy-σr)) = <strong>{results.FLM.lambda_r.toFixed(2)}</strong></p>
                    </div>
                    <div>
                      <p className="text-[#6b7280]">Momentos de Referência:</p>
                      <p>Mpl = Zx * Fy = <strong>{results.FLM.Mpl.toFixed(2)}</strong> kN.cm</p>
                      <p>Mr = Wx * (Fy - σr) = <strong>{results.FLM.Mr.toFixed(2)}</strong> kN.cm</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-[#eff6ff] p-3 rounded text-sm border border-[#bfdbfe]">
                    <p><strong>Regime:</strong> Classe {results.FLM.lambda <= results.FLM.lambda_p ? 'Compacta (Mrd = Mpl/γa1)' : results.FLM.lambda <= results.FLM.lambda_r ? 'Semicompacta (Interpolação)' : 'Esbelta'}</p>
                    <p className="mt-1 text-base font-bold text-[#1e3a8a]">Mrd,FLM = {results.FLM.Mrd.toFixed(2)} kN.m</p>
                  </div>
                </div>

                {/* FLA */}
                <div className="border border-[#e5e7eb] rounded-lg p-4">
                  <h4 className="font-bold text-primary mb-2">4.3. Flambagem Local da Alma (FLA)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div>
                      <p className="text-[#6b7280]">Parâmetro de Esbeltez:</p>
                      <p>λ = d' / tw = {profileData.d_linha} / {profileData.tw} = <strong>{results.FLA.lambda.toFixed(2)}</strong></p>
                      <p className="text-[#6b7280] mt-2">Limites Normativos:</p>
                      <p>λp = 3.76 * √(E/Fy) = <strong>{results.FLA.lambda_p.toFixed(2)}</strong></p>
                      <p>λr = 5.70 * √(E/Fy) = <strong>{results.FLA.lambda_r.toFixed(2)}</strong></p>
                    </div>
                    <div>
                      <p className="text-[#6b7280]">Momentos de Referência:</p>
                      <p>Mpl = Zx * Fy = <strong>{results.FLA.Mpl.toFixed(2)}</strong> kN.cm</p>
                      <p>Mr = Wx * Fy = <strong>{results.FLA.Mr.toFixed(2)}</strong> kN.cm</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-[#eff6ff] p-3 rounded text-sm border border-[#bfdbfe]">
                    <p><strong>Regime:</strong> Classe {results.FLA.lambda <= results.FLA.lambda_p ? 'Compacta (Mrd = Mpl/γa1)' : results.FLA.lambda <= results.FLA.lambda_r ? 'Semicompacta (Interpolação)' : 'Esbelta'}</p>
                    <p className="mt-1 text-base font-bold text-[#1e3a8a]">Mrd,FLA = {results.FLA.Mrd.toFixed(2)} kN.m</p>
                  </div>
                </div>

                <div className="bg-[#f8fafc] p-4 rounded-lg flex justify-between items-center border border-primary/30 shadow-sm mt-6">
                  <div>
                    <h4 className="font-black text-[#4b5563] text-lg">Mrd,x FINAL</h4>
                    <p className="text-sm mt-1 text-[#6b7280]">min(FLT: {results.FLT.Mrd.toFixed(2)} ; FLM: {results.FLM.Mrd.toFixed(2)} ; FLA: {results.FLA.Mrd.toFixed(2)})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-primary">{results.min_Mrd.toFixed(2)} <span className="text-sm font-normal text-[#6b7280]">kN.m</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. VERIFICAÇÃO À FLEXÃO Y E CISALHAMENTO */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-primary border-b-2 border-primary/20 pb-2 mb-4">5. FLEXÃO EIXO Y E CISALHAMENTO</h3>
              <div className="space-y-4">
                
                {/* Flexão Y */}
                <div className="border border-[#e5e7eb] rounded-lg p-4">
                  <h4 className="font-bold text-primary mb-2">5.1. Resistência à Flexão Y-Y (FLM)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div>
                      <p className="text-[#6b7280]">Cálculo da Esbeltez:</p>
                      <p>λ = bf / (2*tf) = <strong>{results.BendingY?.lambda?.toFixed(2) || '-'}</strong></p>
                      <p>λp = 0.38 * √(E/Fy) = <strong>{results.BendingY?.lambda_p?.toFixed(2) || '-'}</strong></p>
                      <p>λr = 0.83 * √(E/Fy) = <strong>{results.BendingY?.lambda_r?.toFixed(2) || '-'}</strong></p>
                    </div>
                    <div>
                      <p className="text-[#6b7280]">Resistência:</p>
                      <p>Mpl_y = Zy * Fy = <strong>{results.BendingY?.Mpl?.toFixed(2) || '-'}</strong> kN.cm</p>
                      <p>Mr_y = Wy * Fy = <strong>{results.BendingY?.Mr?.toFixed(2) || '-'}</strong> kN.cm</p>
                      <p className="mt-2 text-primary font-bold">Mrd,y = {results.BendingY?.Mrd.toFixed(2)} kN.m</p>
                      <p>My,Sd = {loads.Mysd} kN.m</p>
                    </div>
                  </div>
                </div>

                {/* Cisalhamento */}
                <div className="border border-[#e5e7eb] rounded-lg p-4">
                  <h4 className="font-bold text-primary mb-2">5.2. Resistência ao Cisalhamento (ITEM 5.4.3)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div>
                      <p className="underline mb-2 font-bold text-primary">Cisalhamento Y (Alma):</p>
                      <p>Área Efetiva (Aw) = d * tw = <strong>{results.Shear?.Aw?.toFixed(2)}</strong> cm²</p>
                      <p>Vpl = 0.6 * Aw * Fy = <strong>{results.Shear?.Vpl?.toFixed(2)}</strong> kN</p>
                      <p>λ_v = d' / tw = <strong>{results.Shear?.lambda?.toFixed(2)}</strong></p>
                      <p>λ_p = 1.08 * √(Kv*E/Fy) = <strong>{results.Shear?.lambda_p?.toFixed(2)}</strong></p>
                      <p className="mt-2 text-primary font-bold">Vrd,y = {results.Shear.Vrd.toFixed(2)} kN</p>
                      <p>Vy,Sd = {loads.Vysd} kN</p>
                    </div>
                    <div>
                      <p className="underline mb-2 font-bold text-primary">Cisalhamento X (Mesas):</p>
                      <p>Área Efetiva (Aw_x) = 2 * bf * tf = <strong>{results.ShearX?.Aw?.toFixed(2) || '-'}</strong> cm²</p>
                      <p>Vpl_x = 0.6 * Aw_x * Fy = <strong>{results.ShearX?.Vpl?.toFixed(2) || '-'}</strong> kN</p>
                      <p className="mt-2 text-primary font-bold">Vrd,x = {results.ShearX?.Vrd.toFixed(2) || '-'} kN</p>
                      <p>Vx,Sd = {loads.Vxsd} kN</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. ESFORÇOS COMBINADOS */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-primary border-b-2 border-primary/20 pb-2 mb-4">6. ESFORÇOS COMBINADOS (ITEM 5.5)</h3>
              <div className="border border-[#e5e7eb] rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div>
                    <p className="font-bold">Fórmula de Interação NBR 8800:</p>
                    <p className="mt-2 text-[#6b7280]">Valores Solicitantes / Resistentes:</p>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>N: {Math.max(loads.Nsd, Math.abs(Math.min(loads.Nsd, 0))).toFixed(2)} / {(loads.Nsd > 0 ? results.Tension.NtRd : results.Compression.NcRd).toFixed(2)}</li>
                      <li>Mx: {loads.Mxsd} / {results.min_Mrd.toFixed(2)}</li>
                      <li>My: {loads.Mysd} / {results.BendingY?.Mrd.toFixed(2)}</li>
                    </ul>
                    <p className="mt-3 bg-gray-100 p-2 rounded inline-block text-[#4b5563]">Equação Utilizada: {results.Combined.ratio > 0 && Math.abs(loads.Nsd)/(loads.Nsd > 0 ? results.Tension.NtRd : results.Compression.NcRd) >= 0.2 ? 'N/NRd + (8/9)*(Mx/MxRd + My/MyRd) ≤ 1.0' : 'N/2NRd + (Mx/MxRd + My/MyRd) ≤ 1.0'}</p>
                  </div>
                  <div className="text-right flex flex-col justify-center">
                    <p className="text-[12px] uppercase text-[#6b7280] font-bold">ÍNDICE DE USO (RATIO)</p>
                    <p className="text-5xl font-black text-primary">{results.Combined.ratio.toFixed(3)}</p>
                    <p className="text-xs text-gray-500 mt-1">(Deve ser menor ou igual a 1.0)</p>
                  </div>
                </div>
                <div className={`mt-6 p-4 rounded text-base border-2 flex items-center gap-3 ${results.Combined.pass ? 'bg-[#f0fdf4] border-[#86efac] text-[#166534]' : 'bg-[#fef2f2] border-[#fca5a5] text-[#991b1b]'}`}>
                  <span className="material-symbols-outlined">{results.Combined.pass ? 'check_circle' : 'cancel'}</span>
                  <p><strong>Conclusão da Interação:</strong> O perfil está <span className="font-black">{results.Combined.pass ? 'APROVADO' : 'REPROVADO'}</span> para o combo de esforços solicitantes.</p>
                </div>
              </div>
            </div>

            {/* 7. CONCLUSÃO */}
            <div className="mt-8 pt-8 border-t-2 border-primary/20">
              {results.overallPass ? (
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-6 rounded-xl flex items-center gap-6 shadow-sm">
                  <div className="bg-[#22c55e] text-white p-3 rounded-full shadow">
                    <span className="material-symbols-outlined text-4xl" data-icon="check_circle">check_circle</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#166534] uppercase tracking-tight">PERFIL APROVADO GERAL</h3>
                    <p className="text-[#15803d] mt-1">O perfil atende a todos os rigorosos critérios da NBR 8800 para as solicitações informadas.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#fef2f2] border border-[#fecaca] p-6 rounded-xl flex items-center gap-6 shadow-sm">
                  <div className="bg-error text-white p-3 rounded-full shadow">
                    <span className="material-symbols-outlined text-4xl" data-icon="cancel">cancel</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#991b1b] uppercase tracking-tight">PERFIL REPROVADO</h3>
                    <p className="text-[#b91c1c] mt-1">O perfil falhou em um ou mais critérios da NBR 8800. Revise o índice de uso (Ratio) ou escolha um perfil mais robusto.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* VIEW: TABELA DE PERFIS */}
        {activeTab === 'tabela' && (
          <section className="bg-surface-container-lowest rounded-xl overflow-hidden custom-shadow border border-outline-variant/30 flex flex-col h-[calc(100vh-160px)]">
            <div className="p-xl border-b border-outline-variant/50">
              <h1 className="text-headline-md font-black text-primary tracking-tight">TABELA GERAL DE PERFIS</h1>
              <p className="text-label-caps text-on-surface-variant font-medium">CATÁLOGO DE PROPRIEDADES GEOMÉTRICAS</p>
            </div>

            <div className="overflow-auto flex-grow relative">
              <table className="w-full text-center border-collapse whitespace-nowrap">
                <thead className="sticky top-0 bg-primary dark:bg-[#003874] z-10 shadow-lg shadow-primary/20 text-[10px] font-bold text-white uppercase">
                  <tr className="border-y border-white/20">
                    <th rowSpan={2} className="py-sm px-md border-r border-white/20">BITOLA<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">mm x kg/m</span></th>
                    <th rowSpan={2} className="py-sm px-sm border-r border-white/20">Massa<br />Linear<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">kg/m</span></th>
                    <th rowSpan={2} className="py-sm px-sm border-r border-white/20">d<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">mm</span></th>
                    <th rowSpan={2} className="py-sm px-sm border-r border-white/20">bf<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">mm</span></th>
                    <th colSpan={2} className="py-sm px-sm border-r border-white/20 border-b border-white/20">ESPESSURA</th>
                    <th rowSpan={2} className="py-sm px-sm border-r border-white/20">h<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">mm</span></th>
                    <th rowSpan={2} className="py-sm px-sm border-r border-white/20">d'<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">mm</span></th>
                    <th rowSpan={2} className="py-sm px-sm border-r border-white/20">Área<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm²</span></th>
                    <th colSpan={4} className="py-sm px-sm border-r border-white/20 border-b border-white/20">EIXO X-X</th>
                    <th colSpan={6} className="py-sm px-sm border-r border-white/20 border-b border-white/20">EIXO Y-Y</th>
                    <th colSpan={2} className="py-sm px-sm border-r border-white/20 border-b border-white/20">ESBELTEZ</th>
                    <th rowSpan={2} className="py-sm px-sm">Cw<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm⁶</span></th>
                  </tr>
                  <tr className="border-b border-white/20">
                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">tw<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">mm</span></th>
                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">tf<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">mm</span></th>

                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">Ix<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm⁴</span></th>
                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">Wx<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm³</span></th>
                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">rx<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm</span></th>
                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">Zx<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm³</span></th>

                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">Iy<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm⁴</span></th>
                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">Wy<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm³</span></th>
                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">ry<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm</span></th>
                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">Zy<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm³</span></th>
                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">rt<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm</span></th>
                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">It<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">cm⁴</span></th>

                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">MESA - λf<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">bf/2tf</span></th>
                    <th className="py-xs px-sm border-r border-white/20 bg-white/5">ALMA - λw<br /><span className="lowercase text-[8px] font-normal text-on-primary/80">d'/tw</span></th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-medium text-on-surface">
                  {profiles.map((p, idx) => {
                    const massa = p.nome.split('x')[1]?.trim() || "-";
                    const d_mm = (p.d * 10).toFixed(0);
                    const bf_mm = (p.bf * 10).toFixed(0);
                    const tw_mm = (p.tw * 10).toFixed(1);
                    const tf_mm = (p.tf * 10).toFixed(1);
                    const h_mm = (p.h * 10).toFixed(0);
                    const d_linha_mm = (p.d_linha * 10).toFixed(0);
                    const bf_2tf = (p.bf / (2 * p.tf)).toFixed(2);
                    const d_tw = (p.d_linha / p.tw).toFixed(2);

                    return (
                      <tr key={idx} className="border-b border-outline-variant/30 hover:bg-primary-fixed/20 transition-colors">
                        <td className="py-sm px-md font-bold text-primary text-left border-r border-outline-variant/30 bg-primary-fixed/10">{p.nome}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30 font-bold bg-surface-container-lowest">{massa}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{d_mm}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{bf_mm}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{tw_mm}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{tf_mm}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{h_mm}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{d_linha_mm}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30 bg-surface-container-lowest font-bold">{p.Area}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{p.Ix}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{p.Wx}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{p.rx}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{p.Zx}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{p.Iy}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{p.Wy}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{p.ry}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{p.Zy}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{p.rt}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{p.It}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{bf_2tf}</td>
                        <td className="py-sm px-sm border-r border-outline-variant/30">{d_tw}</td>
                        <td className="py-sm px-sm">{p.Cw}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-3 px-margin-desktop flex justify-between items-center bg-surface-container-lowest border-t border-outline-variant mt-auto">
        <span className="text-label-caps text-on-surface-variant">© 2026 Structural Precision Engineering. Todos os direitos reservados.</span>
      </footer>
    </div>
  );
}
